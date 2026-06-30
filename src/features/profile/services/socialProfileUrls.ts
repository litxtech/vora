import { Linking } from 'react-native';
import { openUrl } from '@/lib/linking/openUrl';
import type { ProfileLink, ProfileSocialPlatform } from '@/features/profile/types';

type PlatformUrlBuilder = {
  normalizeUsername: (input: string) => string;
  buildWebUrl: (username: string) => string;
  buildAppUrl: (username: string) => string | null;
};

function stripAt(value: string): string {
  return value.trim().replace(/^@+/, '');
}

function extractPathSegment(input: string, pattern: RegExp): string | null {
  const match = input.match(pattern);
  return match?.[1] ? stripAt(match[1]) : null;
}

function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) || /^[\w-]+\.(com|net|me|io)\//i.test(trimmed);
}

const PLATFORM_BUILDERS: Record<ProfileSocialPlatform, PlatformUrlBuilder> = {
  instagram: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:instagram\.com\/)([A-Za-z0-9._]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://instagram.com/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => `instagram://user?username=${encodeURIComponent(u)}`,
  },
  x: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:(?:x|twitter)\.com\/)([A-Za-z0-9_]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://x.com/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => `twitter://user?screen_name=${encodeURIComponent(u)}`,
  },
  facebook: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:facebook\.com\/)([A-Za-z0-9.]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://facebook.com/${encodeURIComponent(u)}`,
    buildAppUrl: (u) =>
      `fb://facewebmodal/f?href=${encodeURIComponent(`https://facebook.com/${u}`)}`,
  },
  youtube: {
    normalizeUsername: (input) => {
      const channel = extractPathSegment(input, /(?:youtube\.com\/channel\/)([A-Za-z0-9_-]+)/i);
      if (channel) return channel;
      const handle = extractPathSegment(input, /(?:youtube\.com\/@)([A-Za-z0-9._-]+)/i);
      if (handle) return `@${handle}`;
      const raw = stripAt(input);
      return raw.startsWith('@') || raw.startsWith('UC') ? raw : `@${raw}`;
    },
    buildWebUrl: (u) =>
      u.startsWith('UC')
        ? `https://youtube.com/channel/${encodeURIComponent(u)}`
        : `https://youtube.com/${encodeURIComponent(u.startsWith('@') ? u : `@${u}`)}`,
    buildAppUrl: (u) => {
      const web = u.startsWith('UC')
        ? `https://youtube.com/channel/${u}`
        : `https://youtube.com/${u.startsWith('@') ? u : `@${u}`}`;
      return `vnd.youtube://${web.replace(/^https?:\/\//, '')}`;
    },
  },
  tiktok: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:tiktok\.com\/@)([A-Za-z0-9._]+)/i) ??
      (stripAt(input).startsWith('@') ? stripAt(input) : `@${stripAt(input)}`),
    buildWebUrl: (u) => {
      const handle = u.startsWith('@') ? u : `@${u}`;
      return `https://tiktok.com/${encodeURIComponent(handle)}`;
    },
    buildAppUrl: (u) => {
      const handle = stripAt(u);
      return `snssdk1233://user/profile/${encodeURIComponent(handle)}`;
    },
  },
  linkedin: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:linkedin\.com\/in\/)([A-Za-z0-9-_%]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://linkedin.com/in/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => `linkedin://in/${encodeURIComponent(u)}`,
  },
  github: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:github\.com\/)([A-Za-z0-9-]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://github.com/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => `github://user?username=${encodeURIComponent(u)}`,
  },
  whatsapp: {
    normalizeUsername: (input) => input.replace(/\D/g, ''),
    buildWebUrl: (u) => `https://wa.me/${u}`,
    buildAppUrl: (u) => `whatsapp://send?phone=${u}`,
  },
  telegram: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:t\.me\/)([A-Za-z0-9_]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://t.me/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => `tg://resolve?domain=${encodeURIComponent(u)}`,
  },
  snapchat: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:snapchat\.com\/add\/)([A-Za-z0-9._-]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://snapchat.com/add/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => `snapchat://add/${encodeURIComponent(u)}`,
  },
  pinterest: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:pinterest\.com\/)([A-Za-z0-9_]+)/i) ?? stripAt(input),
    buildWebUrl: (u) => `https://pinterest.com/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => `pinterest://user/${encodeURIComponent(u)}`,
  },
  spotify: {
    normalizeUsername: (input) => stripAt(input),
    buildWebUrl: (u) =>
      u.includes('spotify.com') ? (looksLikeUrl(u) ? u : `https://open.spotify.com/user/${u}`) : `https://open.spotify.com/user/${encodeURIComponent(u)}`,
    buildAppUrl: (u) => {
      const web = u.includes('spotify.com') ? u : `https://open.spotify.com/user/${u}`;
      return web.replace(/^https?:\/\//, 'spotify://');
    },
  },
  threads: {
    normalizeUsername: (input) =>
      extractPathSegment(input, /(?:threads\.net\/@)([A-Za-z0-9._]+)/i) ??
      (stripAt(input).startsWith('@') ? stripAt(input) : `@${stripAt(input)}`),
    buildWebUrl: (u) => {
      const handle = u.startsWith('@') ? u : `@${u}`;
      return `https://threads.net/${encodeURIComponent(handle)}`;
    },
    buildAppUrl: (u) => {
      const handle = stripAt(u);
      return `barcelona://user?username=${encodeURIComponent(handle)}`;
    },
  },
};

export function normalizeSocialUsername(
  platform: ProfileSocialPlatform,
  input: string,
): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return PLATFORM_BUILDERS[platform].normalizeUsername(trimmed);
}

export function buildSocialWebUrl(platform: ProfileSocialPlatform, username: string): string {
  return PLATFORM_BUILDERS[platform].buildWebUrl(normalizeSocialUsername(platform, username));
}

export function resolveSocialOpenUrls(
  platform: ProfileSocialPlatform,
  username: string,
): { appUrl: string | null; webUrl: string } {
  const normalized = normalizeSocialUsername(platform, username);
  const builder = PLATFORM_BUILDERS[platform];
  return {
    appUrl: builder.buildAppUrl(normalized),
    webUrl: builder.buildWebUrl(normalized),
  };
}

export function resolveProfileLinkOpenUrl(link: ProfileLink): string {
  if (link.kind === 'website' || link.useCustomUrl || !link.platform) {
    return link.url;
  }

  const username = link.username?.trim();
  if (!username) return link.url;

  const { appUrl, webUrl } = resolveSocialOpenUrls(link.platform, username);
  return appUrl ?? webUrl;
}

export async function openProfileLink(link: ProfileLink): Promise<void> {
  if (link.kind === 'social' && link.platform && !link.useCustomUrl && link.username?.trim()) {
    const { appUrl, webUrl } = resolveSocialOpenUrls(link.platform, link.username);
    if (appUrl) {
      try {
        const canOpen = await Linking.canOpenURL(appUrl);
        if (canOpen) {
          await Linking.openURL(appUrl);
          return;
        }
      } catch {
        // web'e düş
      }
    }
    await openUrl(webUrl);
    return;
  }

  await openUrl(link.url);
}

export function isLikelyCustomSocialUrl(input: string): boolean {
  return looksLikeUrl(input);
}

export function parseUsernameFromStoredUrl(
  platform: ProfileSocialPlatform,
  url: string,
): string {
  try {
    const normalized = url.replace(/^https?:\/\//i, '');
    return normalizeSocialUsername(platform, normalized);
  } catch {
    return '';
  }
}
