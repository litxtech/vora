import type {
  PublicEventSource,
  PublicGuideSource,
  PublicPostSource,
  PublicProfileSource,
  PublicRegionSource,
  PublicSeoSource,
  SeoOverride,
  SeoRedirect,
  SearchIntent,
  TombstoneSource,
} from '@/features/seo/types';
import { SEO_LIMITS } from '@/features/seo/constants';

type LoadOptions = {
  supabaseUrl: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
};

const INTENTS = new Set<SearchIntent>([
  'informational',
  'navigational',
  'commercial',
  'local',
  'community',
  'how_to',
  'guide',
  'news',
]);

async function rest(options: LoadOptions, table: string, query: string): Promise<unknown[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${options.supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${options.anonKey}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`seo_source_${table}_${response.status}`);
  }
  const body = (await response.json()) as unknown;
  return Array.isArray(body) ? body : [];
}

function row(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function bool(value: unknown): boolean {
  return value === true;
}

function authorOf(value: unknown) {
  const profile = Array.isArray(value) ? row(value[0]) : row(value);
  if (!text(profile.username)) return null;
  return {
    username: String(profile.username),
    fullName: text(profile.full_name),
    avatarUrl: text(profile.avatar_url),
    profileVisibility: text(profile.profile_visibility) ?? 'members',
    accountStatus: text(profile.account_status) ?? 'active',
    webSearchVisible: bool(profile.web_search_visible),
    isGuest: bool(profile.is_guest),
    quarantined: Boolean(profile.quarantined_at),
  };
}

/**
 * Public katalog. Yalnızca herkese açık kolonlar istenir.
 * E-posta, telefon, adres, konum ve moderasyon notu seçilmez.
 */
export async function loadPublicSeoSource(options: LoadOptions): Promise<PublicSeoSource> {
  const postQuery = [
    'select=id,title,content,media_urls,region_id,audience,status,created_at,updated_at,profiles!posts_author_id_fkey(username,full_name,avatar_url,profile_visibility,account_status,web_search_visible,is_guest,quarantined_at)',
    'audience=eq.public',
    'status=eq.published',
    'order=updated_at.desc',
    `limit=${SEO_LIMITS.catalogPosts}`,
  ].join('&');

  const postsRaw = await rest(options, 'posts', postQuery).catch(async () => {
    const fallback = await rest(
      options,
      'posts',
      `select=id,title,content,media_urls,region_id,audience,status,created_at,updated_at&audience=eq.public&status=eq.published&order=updated_at.desc&limit=${SEO_LIMITS.catalogPosts}`,
    );
    return fallback;
  });

  const posts: PublicPostSource[] = postsRaw.map((item) => {
    const data = row(item);
    return {
      id: String(data.id ?? ''),
      title: text(data.title),
      content: text(data.content) ?? '',
      mediaUrls: Array.isArray(data.media_urls) ? data.media_urls.filter((url): url is string => typeof url === 'string') : [],
      regionId: text(data.region_id),
      audience: text(data.audience) ?? 'public',
      status: text(data.status) ?? 'published',
      createdAt: text(data.created_at) ?? new Date(0).toISOString(),
      updatedAt: text(data.updated_at) ?? text(data.created_at) ?? new Date(0).toISOString(),
      author: authorOf(data.profiles),
    };
  }).filter((post) => post.id && post.audience === 'public' && post.status === 'published');

  const profilesRaw = await rest(
    options,
    'profiles',
    [
      'select=id,username,full_name,avatar_url,bio,region_id,is_verified,profile_visibility,account_status,web_search_visible,is_guest,quarantined_at,interests,updated_at',
      'profile_visibility=eq.public',
      'account_status=eq.active',
      'order=updated_at.desc',
      `limit=${SEO_LIMITS.catalogProfiles}`,
    ].join('&'),
  ).catch(() => []);

  const profiles: PublicProfileSource[] = profilesRaw.map((item) => {
    const data = row(item);
    return {
      id: String(data.id ?? ''),
      username: text(data.username) ?? '',
      fullName: text(data.full_name),
      avatarUrl: text(data.avatar_url),
      bio: text(data.bio),
      regionId: text(data.region_id),
      isVerified: bool(data.is_verified),
      profileVisibility: text(data.profile_visibility) ?? 'public',
      accountStatus: text(data.account_status) ?? 'active',
      webSearchVisible: bool(data.web_search_visible),
      isGuest: bool(data.is_guest),
      quarantined: Boolean(data.quarantined_at),
      interests: Array.isArray(data.interests) ? data.interests.filter((entry): entry is string => typeof entry === 'string') : [],
      updatedAt: text(data.updated_at) ?? new Date(0).toISOString(),
    };
  }).filter((profile) => profile.id && profile.username);

  const eventsRaw = await rest(
    options,
    'events',
    [
      'select=id,title,description,starts_at,ends_at,location_name,cover_url,status,region_id,created_at,profiles!events_organizer_id_fkey(username,full_name,profile_visibility,account_status)',
      'status=eq.published',
      'order=starts_at.desc',
      `limit=${SEO_LIMITS.catalogEvents}`,
    ].join('&'),
  ).catch(async () =>
    rest(
      options,
      'events',
      `select=id,title,description,starts_at,ends_at,location_name,cover_url,status,region_id,created_at&status=eq.published&order=starts_at.desc&limit=${SEO_LIMITS.catalogEvents}`,
    ),
  );

  const events: PublicEventSource[] = eventsRaw.map((item) => {
    const data = row(item);
    const organizer = authorOf(data.profiles);
    return {
      id: String(data.id ?? ''),
      title: text(data.title) ?? '',
      description: text(data.description) ?? '',
      startsAt: text(data.starts_at) ?? new Date(0).toISOString(),
      endsAt: text(data.ends_at),
      locationName: text(data.location_name),
      coverUrl: text(data.cover_url),
      status: text(data.status) ?? '',
      regionId: text(data.region_id),
      createdAt: text(data.created_at) ?? new Date(0).toISOString(),
      updatedAt: text(data.updated_at) ?? text(data.created_at) ?? new Date(0).toISOString(),
      organizerName: organizer ? organizer.fullName || organizer.username : null,
      organizerUsername: organizer?.username ?? null,
      organizerPublic: Boolean(organizer && organizer.profileVisibility === 'public' && organizer.accountStatus === 'active' && !organizer.isGuest && !organizer.quarantined),
    };
  }).filter((event) => event.id && event.status === 'published');

  const guidesRaw = await rest(
    options,
    'platform_guides',
    `select=id,slug,title,summary,category,sections,image_url,video_url,footer_note,published_at,updated_at&is_published=eq.true&order=updated_at.desc&limit=${SEO_LIMITS.catalogGuides}`,
  ).catch(() => []);

  const guides: PublicGuideSource[] = guidesRaw.map((item) => {
    const data = row(item);
    const sections = Array.isArray(data.sections)
      ? data.sections.map((section) => {
          const entry = row(section);
          return { heading: text(entry.heading) ?? '', body: text(entry.body) ?? '' };
        }).filter((section) => section.heading || section.body)
      : [];
    return {
      id: String(data.id ?? ''),
      slug: text(data.slug) ?? String(data.id ?? 'yazi'),
      title: text(data.title) ?? '',
      summary: text(data.summary) ?? '',
      category: text(data.category) ?? 'general',
      sections,
      imageUrl: text(data.image_url),
      videoUrl: text(data.video_url),
      footerNote: text(data.footer_note),
      publishedAt: text(data.published_at),
      updatedAt: text(data.updated_at) ?? new Date(0).toISOString(),
    };
  }).filter((guide) => guide.id && guide.title);

  const regionsRaw = await rest(options, 'regions', 'select=id,name,is_active&is_active=eq.true');
  const regions: PublicRegionSource[] = regionsRaw.map((item) => {
    const data = row(item);
    return { id: String(data.id ?? ''), name: text(data.name) ?? '', active: data.is_active !== false };
  }).filter((region) => region.id && region.name);

  const postTombs = await rest(options, 'posts', 'select=id,status,updated_at&status=in.(hidden,removed)&limit=200').catch(() => []);
  const eventTombs = await rest(options, 'events', 'select=id,status,updated_at&status=in.(hidden,removed)&limit=100').catch(() => []);
  const tombstones: TombstoneSource[] = [...postTombs, ...eventTombs].map((item, index) => {
    const data = row(item);
    const status = text(data.status) === 'removed' ? 'removed' : 'hidden';
    return {
      id: String(data.id ?? ''),
      kind: index < postTombs.length ? 'post' : 'event',
      status,
      updatedAt: text(data.updated_at) ?? new Date(0).toISOString(),
    } as TombstoneSource;
  }).filter((item) => item.id);

  const redirects = await rest(options, 'seo_slug_redirects', 'select=old_path,new_path,redirect_type&limit=500').catch(() => []);
  const overrides = await rest(
    options,
    'seo_metadata',
    'select=entity_type,entity_id,seo_title,seo_description,seo_canonical,seo_noindex,og_image_url,search_intent&limit=500',
  ).catch(() => []);

  return {
    regions,
    posts,
    profiles,
    events,
    guides,
    tombstones,
    redirects: redirects.map((item) => {
      const data = row(item);
      return {
        oldPath: text(data.old_path) ?? '',
        newPath: text(data.new_path) ?? '',
        redirectType: Number(data.redirect_type) === 302 ? 302 : 301,
      } satisfies SeoRedirect;
    }).filter((item) => item.oldPath && item.newPath),
    overrides: overrides.map((item) => {
      const data = row(item);
      const intent = text(data.search_intent);
      return {
        entityType: text(data.entity_type) ?? '',
        entityId: text(data.entity_id) ?? '',
        seoTitle: text(data.seo_title),
        seoDescription: text(data.seo_description),
        seoCanonical: text(data.seo_canonical),
        seoNoindex: data.seo_noindex === true ? true : data.seo_noindex === false ? false : null,
        ogImageUrl: text(data.og_image_url),
        searchIntent: intent && INTENTS.has(intent as SearchIntent) ? (intent as SearchIntent) : null,
      } satisfies SeoOverride;
    }).filter((item) => item.entityType && item.entityId),
  };
}
