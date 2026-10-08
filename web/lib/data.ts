import { createAnonClient } from '@/lib/supabase';
import { postIndexable, profileIndexable } from '@/lib/seo/eligibility';

export type PublicPost = {
  id: string;
  title: string | null;
  content: string;
  media_urls: string[];
  region_id: string;
  category: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_username: string;
  author_name: string | null;
  author_avatar: string | null;
  author_search_visible: boolean;
};

export type PublicProfile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  region_id: string | null;
  interests: string[];
  is_verified: boolean;
  created_at: string;
  web_search_visible: boolean;
};

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  region_id: string;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  category: string;
  created_at: string;
  updated_at: string;
  organizer_id: string;
  organizer_username: string | null;
  organizer_name: string | null;
};

export type BlogPost = {
  id: string;
  slug: string;
  language: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  gallery: { url: string; alt?: string; caption?: string }[];
  video_url: string | null;
  author_name: string;
  category_id: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  city_slug: string | null;
  tags: string[];
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  faqs: { question: string; answer: string }[];
  internal_links: { href: string; label: string }[];
  published_at: string | null;
  updated_at: string;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapPost(row: Record<string, unknown>): PublicPost {
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : null,
    content: String(row.content ?? ''),
    media_urls: asStringArray(row.media_urls),
    region_id: String(row.region_id ?? ''),
    category: String(row.category ?? 'general'),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    author_id: String(row.author_id),
    author_username: String(row.author_username ?? ''),
    author_name: typeof row.author_name === 'string' ? row.author_name : null,
    author_avatar: typeof row.author_avatar === 'string' ? row.author_avatar : null,
    author_search_visible: Boolean(row.author_search_visible),
  };
}

export function postSeo(post: PublicPost) {
  return postIndexable({
    content: post.content,
    title: post.title,
    mediaCount: post.media_urls.length,
    regionId: post.region_id,
    category: post.category,
    authorSearchVisible: post.author_search_visible,
  });
}

export async function listPosts(options?: { regionId?: string; limit?: number }): Promise<PublicPost[]> {
  const client = createAnonClient();
  if (!client) return [];
  let query = client.from('web_indexable_posts').select('*').order('created_at', { ascending: false }).limit(options?.limit ?? 12);
  if (options?.regionId) query = query.eq('region_id', options.regionId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => mapPost(row as Record<string, unknown>));
}

export async function getPost(id: string): Promise<PublicPost | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const client = createAnonClient();
  if (!client) return null;
  const { data, error } = await client.from('web_indexable_posts').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapPost(data as Record<string, unknown>);
}

export async function listProfiles(limit = 12): Promise<PublicProfile[]> {
  const client = createAnonClient();
  if (!client) return [];
  const { data, error } = await client
    .from('web_public_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => mapProfile(row as Record<string, unknown>));
}

export async function getProfile(username: string): Promise<PublicProfile | null> {
  const clean = username.replace(/^@/, '').trim().toLowerCase();
  if (!/^[a-z0-9._]{2,32}$/.test(clean)) return null;
  const client = createAnonClient();
  if (!client) return null;
  const { data, error } = await client.from('web_public_profiles').select('*').eq('username', clean).maybeSingle();
  if (error || !data) return null;
  return mapProfile(data as Record<string, unknown>);
}

function mapProfile(row: Record<string, unknown>): PublicProfile {
  return {
    id: String(row.id),
    username: String(row.username),
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    bio: typeof row.bio === 'string' ? row.bio : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    cover_url: typeof row.cover_url === 'string' ? row.cover_url : null,
    region_id: typeof row.region_id === 'string' ? row.region_id : null,
    interests: asStringArray(row.interests),
    is_verified: Boolean(row.is_verified),
    created_at: String(row.created_at),
    web_search_visible: Boolean(row.web_search_visible),
  };
}

export function profileSeo(profile: PublicProfile, postCount: number) {
  return profileIndexable({
    bio: profile.bio,
    searchVisible: profile.web_search_visible,
    postCount,
  });
}

export async function listEvents(options?: { regionId?: string; limit?: number }): Promise<PublicEvent[]> {
  const client = createAnonClient();
  if (!client) return [];
  let query = client.from('web_public_events').select('*').order('starts_at', { ascending: false }).limit(options?.limit ?? 12);
  if (options?.regionId) query = query.eq('region_id', options.regionId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => mapEvent(row as Record<string, unknown>));
}

export async function getEvent(id: string): Promise<PublicEvent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const client = createAnonClient();
  if (!client) return null;
  const { data, error } = await client.from('web_public_events').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapEvent(data as Record<string, unknown>);
}

function mapEvent(row: Record<string, unknown>): PublicEvent {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    cover_url: typeof row.cover_url === 'string' ? row.cover_url : null,
    region_id: String(row.region_id ?? ''),
    starts_at: String(row.starts_at),
    ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
    location_name: typeof row.location_name === 'string' ? row.location_name : null,
    category: String(row.category ?? ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    organizer_id: String(row.organizer_id),
    organizer_username: typeof row.organizer_username === 'string' ? row.organizer_username : null,
    organizer_name: typeof row.organizer_name === 'string' ? row.organizer_name : null,
  };
}

export async function listHashtags(limit = 24): Promise<{ tag: string; indexable_count: number }[]> {
  const client = createAnonClient();
  if (!client) return [];
  const { data, error } = await client
    .from('web_public_hashtags')
    .select('tag, indexable_count')
    .order('indexable_count', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    tag: String((row as { tag: string }).tag),
    indexable_count: Number((row as { indexable_count: number }).indexable_count),
  }));
}

export async function listPostIdsByHashtag(tag: string): Promise<string[]> {
  const client = createAnonClient();
  if (!client) return [];
  const { data, error } = await client.from('web_hashtag_posts').select('post_id').eq('tag', tag).limit(24);
  if (error || !data) return [];
  return data.map((row) => String((row as { post_id: string }).post_id));
}

export async function getHashtag(tag: string): Promise<{ tag: string; indexable_count: number } | null> {
  const clean = tag.replace(/^#/, '').trim().toLowerCase();
  if (!/^[a-z0-9ğüşöçıİĞÜŞÖÇ_]{2,40}$/i.test(clean)) return null;
  const client = createAnonClient();
  if (!client) return null;
  const { data, error } = await client.from('web_public_hashtags').select('tag, indexable_count').eq('tag', clean).maybeSingle();
  if (error || !data) return null;
  return { tag: String(data.tag), indexable_count: Number(data.indexable_count) };
}

function mapBlog(row: Record<string, unknown>): BlogPost {
  const category = row.web_blog_categories as { name?: string; slug?: string } | null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    language: String(row.language ?? 'tr'),
    title: String(row.title ?? ''),
    excerpt: String(row.excerpt ?? ''),
    content: String(row.content ?? ''),
    cover_image_url: typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
    cover_image_alt: typeof row.cover_image_alt === 'string' ? row.cover_image_alt : null,
    gallery: Array.isArray(row.gallery) ? (row.gallery as BlogPost['gallery']) : [],
    video_url: typeof row.video_url === 'string' ? row.video_url : null,
    author_name: String(row.author_name ?? 'Vora'),
    category_id: typeof row.category_id === 'string' ? row.category_id : null,
    category_name: category?.name ?? null,
    category_slug: category?.slug ?? null,
    city_slug: typeof row.city_slug === 'string' ? row.city_slug : null,
    tags: asStringArray(row.tags),
    status: String(row.status ?? 'draft'),
    seo_title: typeof row.seo_title === 'string' ? row.seo_title : null,
    seo_description: typeof row.seo_description === 'string' ? row.seo_description : null,
    og_title: typeof row.og_title === 'string' ? row.og_title : null,
    og_description: typeof row.og_description === 'string' ? row.og_description : null,
    og_image_url: typeof row.og_image_url === 'string' ? row.og_image_url : null,
    faqs: Array.isArray(row.faqs) ? (row.faqs as BlogPost['faqs']) : [],
    internal_links: Array.isArray(row.internal_links) ? (row.internal_links as BlogPost['internal_links']) : [],
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
    updated_at: String(row.updated_at),
  };
}

export async function listBlogPosts(language = 'tr', limit = 12): Promise<BlogPost[]> {
  const client = createAnonClient();
  if (!client) return [];
  const { data, error } = await client
    .from('web_blog_posts')
    .select('*, web_blog_categories(name, slug)')
    .eq('status', 'published')
    .eq('language', language)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => mapBlog(row as Record<string, unknown>));
}

export async function getBlogPost(slug: string, language = 'tr'): Promise<BlogPost | null> {
  const client = createAnonClient();
  if (!client) return null;
  const { data, error } = await client
    .from('web_blog_posts')
    .select('*, web_blog_categories(name, slug)')
    .eq('status', 'published')
    .eq('language', language)
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return mapBlog(data as Record<string, unknown>);
}

export async function listBlogByCity(citySlug: string): Promise<BlogPost[]> {
  const posts = await listBlogPosts('tr', 20);
  return posts.filter((post) => post.city_slug === citySlug);
}

export async function getPageOverride(slug: string): Promise<string | null> {
  const client = createAnonClient();
  if (!client) return null;
  const { data, error } = await client
    .from('web_pages')
    .select('content_md, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data) return null;
  const content = String((data as { content_md?: string }).content_md ?? '').trim();
  return content || null;
}

export async function findRedirect(path: string): Promise<{ to_path: string; status_code: number } | null> {
  const client = createAnonClient();
  if (!client) return null;
  const { data, error } = await client
    .from('web_redirects')
    .select('to_path, status_code')
    .eq('from_path', path)
    .maybeSingle();
  if (error || !data) return null;
  return { to_path: String(data.to_path), status_code: Number(data.status_code) || 301 };
}

export function displayName(name: string | null, username: string): string {
  const clean = name?.trim();
  return clean || username;
}

export function postHeadline(post: PublicPost): string {
  const title = post.title?.trim();
  if (title) return title;
  const line = post.content.trim().split('\n')[0] ?? '';
  return line.length > 90 ? `${line.slice(0, 89).trimEnd()}…` : line;
}
