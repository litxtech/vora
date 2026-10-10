import {
  CANLAR_EMPTY_FEED,
  loadCanlarHome,
  type CanlarCaseCard,
  type CanlarHomeFeed,
  type CanlarPostCard,
} from '@/features/vora-canlar/services/api';

let home: CanlarHomeFeed | null = null;
let homeFlight: Promise<{ feed: CanlarHomeFeed; error: string | null }> | null = null;
const cases = new Map<string, Record<string, unknown>>();
const posts = new Map<string, Record<string, unknown>>();
const searches = new Map<string, CanlarCaseCard[]>();

export function peekCanlarHome() {
  return home;
}

export function refreshCanlarHome() {
  if (homeFlight) return homeFlight;
  homeFlight = loadCanlarHome()
    .then((result) => {
      if (!result.error && result.data) {
        home = { ...CANLAR_EMPTY_FEED, ...result.data };
      }
      return { feed: home ?? { ...CANLAR_EMPTY_FEED, ...(result.data ?? {}) }, error: result.error };
    })
    .finally(() => {
      homeFlight = null;
    });
  return homeFlight;
}

export function seedCanlarCase(row: CanlarCaseCard) {
  if (!row.id || cases.has(row.id)) return;
  cases.set(row.id, { case: row, events: [], can_withdraw: false });
}

export function readCanlarCase(id: string) {
  return cases.get(id) ?? null;
}

export function writeCanlarCase(id: string, detail: Record<string, unknown>) {
  cases.set(id, detail);
}

export function dropCanlarCase(id: string) {
  cases.delete(id);
  if (!home) return;
  const drop = (rows: CanlarCaseCard[]) => rows.filter((row) => row.id !== id);
  home = {
    ...home,
    featured: drop(home.featured),
    urgent: drop(home.urgent),
    new_reports: drop(home.new_reports),
    in_treatment: drop(home.in_treatment),
    resolved: drop(home.resolved),
  };
}

export function seedCanlarPost(post: CanlarPostCard) {
  if (!post.id || posts.has(post.id)) return;
  posts.set(post.id, {
    post: {
      ...post,
      media: post.media ?? [],
      like_count: post.like_count ?? 0,
      comment_count: post.comment_count ?? 0,
    },
    liked: false,
    comments: [],
    can_delete: false,
  });
}

export function readCanlarPost(id: string) {
  return posts.get(id) ?? null;
}

export function writeCanlarPost(id: string, detail: Record<string, unknown>) {
  posts.set(id, detail);
}

export function dropCanlarPost(id: string) {
  posts.delete(id);
  if (!home) return;
  home = { ...home, posts: home.posts.filter((post) => post.id !== id) };
}

export function readCanlarSearch(key: string) {
  return searches.get(key) ?? null;
}

export function writeCanlarSearch(key: string, rows: CanlarCaseCard[]) {
  searches.set(key, rows);
}
