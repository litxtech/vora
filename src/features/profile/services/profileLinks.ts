import {
  MAX_PROFILE_SOCIAL_LINKS,
  MAX_PROFILE_WEBSITE_LINKS,
  SOCIAL_PLATFORM_MAP,
  type ProfileLinkDraft,
} from '@/features/profile/constants/profileLinks';
import {
  buildSocialWebUrl,
  isLikelyCustomSocialUrl,
  normalizeSocialUsername,
  parseUsernameFromStoredUrl,
} from '@/features/profile/services/socialProfileUrls';
import type { ProfileLink, ProfileLinkKind, ProfileSocialPlatform } from '@/features/profile/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type ProfileLinkRow = {
  id: string;
  user_id: string;
  kind: ProfileLinkKind;
  platform: ProfileSocialPlatform | null;
  username: string | null;
  use_custom_url: boolean;
  url: string;
  title: string | null;
  sort_order: number;
};

function mapProfileLink(row: ProfileLinkRow): ProfileLink {
  return {
    id: row.id,
    kind: row.kind,
    platform: row.platform,
    username: row.username,
    useCustomUrl: row.use_custom_url ?? false,
    url: row.url,
    title: row.title,
    sortOrder: row.sort_order,
  };
}

export function normalizeProfileLinkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidProfileLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeProfileLinkUrl(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatProfileLinkDisplay(url: string): string {
  return normalizeProfileLinkUrl(url)
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

export function getProfileLinkLabel(link: ProfileLink): string {
  if (link.kind === 'website') {
    const title = link.title?.trim();
    if (title) return title;
    return formatProfileLinkDisplay(link.url);
  }

  if (link.platform) {
    const username = link.username?.trim();
    if (username && !link.useCustomUrl) {
      const handle = username.startsWith('@') ? username : `@${username}`;
      return `${SOCIAL_PLATFORM_MAP[link.platform].label} · ${handle}`;
    }
    return SOCIAL_PLATFORM_MAP[link.platform]?.label ?? link.platform;
  }

  return formatProfileLinkDisplay(link.url);
}

function draftHasContent(draft: ProfileLinkDraft): boolean {
  if (draft.kind === 'website') return draft.url.trim().length > 0;
  if (draft.useCustomUrl) return draft.url.trim().length > 0;
  return draft.username.trim().length > 0;
}

function resolveSocialDraft(draft: ProfileLinkDraft): {
  username: string | null;
  url: string;
  useCustomUrl: boolean;
} {
  if (!draft.platform) {
    return { username: null, url: normalizeProfileLinkUrl(draft.url), useCustomUrl: true };
  }

  if (draft.useCustomUrl || isLikelyCustomSocialUrl(draft.username)) {
    return {
      username: null,
      url: normalizeProfileLinkUrl(draft.url || draft.username),
      useCustomUrl: true,
    };
  }

  const username = normalizeSocialUsername(draft.platform, draft.username);
  return {
    username,
    url: buildSocialWebUrl(draft.platform, username),
    useCustomUrl: false,
  };
}

export async function fetchProfileLinks(userId: string): Promise<ProfileLink[]> {
  const { data, error } = await supabase
    .from('profile_links')
    .select('id, user_id, kind, platform, username, use_custom_url, url, title, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as ProfileLinkRow[]).map(mapProfileLink);
}

export function validateProfileLinkDrafts(drafts: ProfileLinkDraft[]): string | null {
  const social = drafts.filter((d) => d.kind === 'social' && draftHasContent(d));
  const websites = drafts.filter((d) => d.kind === 'website' && draftHasContent(d));

  if (social.length > MAX_PROFILE_SOCIAL_LINKS) {
    return `En fazla ${MAX_PROFILE_SOCIAL_LINKS} sosyal medya bağlantısı ekleyebilirsiniz.`;
  }

  if (websites.length > MAX_PROFILE_WEBSITE_LINKS) {
    return `En fazla ${MAX_PROFILE_WEBSITE_LINKS} web sitesi ekleyebilirsiniz.`;
  }

  const seenPlatforms = new Set<ProfileSocialPlatform>();
  for (const draft of drafts) {
    if (!draftHasContent(draft)) continue;

    if (draft.kind === 'social') {
      if (!draft.platform) return 'Sosyal medya platformu seçin.';

      const resolved = resolveSocialDraft(draft);
      if (!isValidProfileLinkUrl(resolved.url)) {
        return `${SOCIAL_PLATFORM_MAP[draft.platform].label} için geçerli bir kullanıcı adı veya URL girin.`;
      }

      if (seenPlatforms.has(draft.platform)) {
        return `${SOCIAL_PLATFORM_MAP[draft.platform].label} için yalnızca bir bağlantı ekleyebilirsiniz.`;
      }
      seenPlatforms.add(draft.platform);
    }

    if (draft.kind === 'website') {
      if (!isValidProfileLinkUrl(draft.url)) {
        return 'Geçersiz web sitesi adresi. http veya https ile başlayan geçerli bir URL girin.';
      }
      if (draft.title.trim().length > 80) {
        return 'Web sitesi başlığı en fazla 80 karakter olabilir.';
      }
    }
  }

  return null;
}

export async function saveProfileLinks(
  userId: string,
  drafts: ProfileLinkDraft[],
): Promise<{ error: string | null }> {
  const activeDrafts = drafts.filter(draftHasContent);
  const validationError = validateProfileLinkDrafts(activeDrafts);
  if (validationError) return { error: validationError };

  const { error: deleteError } = await supabase.from('profile_links').delete().eq('user_id', userId);
  if (deleteError) return { error: supabaseErrorMessage(deleteError) };

  if (activeDrafts.length === 0) return { error: null };

  const rows = activeDrafts.map((draft, index) => {
    if (draft.kind === 'website') {
      return {
        user_id: userId,
        kind: draft.kind,
        platform: null,
        username: null,
        use_custom_url: false,
        url: normalizeProfileLinkUrl(draft.url),
        title: draft.title.trim() || null,
        sort_order: index,
      };
    }

    const resolved = resolveSocialDraft(draft);
    return {
      user_id: userId,
      kind: 'social' as const,
      platform: draft.platform,
      username: resolved.username,
      use_custom_url: resolved.useCustomUrl,
      url: resolved.url,
      title: null,
      sort_order: index,
    };
  });

  const { error: insertError } = await supabase.from('profile_links').insert(rows);
  return { error: supabaseErrorMessage(insertError) };
}

export function profileLinksToDrafts(links: ProfileLink[]): ProfileLinkDraft[] {
  return links.map((link) => {
    if (link.kind === 'website') {
      return {
        kind: 'website',
        platform: null,
        username: '',
        useCustomUrl: false,
        url: link.url,
        title: link.title ?? '',
      };
    }

    if (link.useCustomUrl) {
      return {
        kind: 'social',
        platform: link.platform,
        username: '',
        useCustomUrl: true,
        url: link.url,
        title: '',
      };
    }

    const username =
      link.username?.trim() ||
      (link.platform ? parseUsernameFromStoredUrl(link.platform, link.url) : '');

    return {
      kind: 'social',
      platform: link.platform,
      username,
      useCustomUrl: false,
      url: link.url,
      title: '',
    };
  });
}
