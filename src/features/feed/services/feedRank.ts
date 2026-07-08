import type { FeedCategory, FeedItem } from '@/features/feed/types';

export const FEED_RANK_PERIOD_HOURS = 48;
export const FEED_RANK_POOL_MULTIPLIER = 3;

const RANK_CURSOR_PREFIX = 'rank:';
const CHRONO_CURSOR_PREFIX = 'chrono:';

type RankableItem = Pick<
  FeedItem,
  | 'likeCount'
  | 'commentCount'
  | 'quoteCount'
  | 'saveCount'
  | 'viewCount'
  | 'createdAt'
  | 'isFollowing'
  | 'author'
  | 'isPinned'
  | 'pinPriority'
  | 'pinnedAt'
>;

/** Takip / reels / acil sekmeleri kronolojik kalır; diğerleri "For You" tarzı sıralanır. */
export function shouldRankFeedCategory(category: FeedCategory): boolean {
  return category !== 'following' && category !== 'reels' && category !== 'emergency';
}

export function feedRankWindowStart(): string {
  return new Date(Date.now() - FEED_RANK_PERIOD_HOURS * 3_600_000).toISOString();
}

export function isRankCursor(cursor: string | null): boolean {
  return !!cursor?.startsWith(RANK_CURSOR_PREFIX);
}

export function isChronoFeedCursor(cursor: string | null): boolean {
  return !!cursor?.startsWith(CHRONO_CURSOR_PREFIX);
}

export function parseRankOffset(cursor: string | null): number {
  if (!isRankCursor(cursor)) return 0;
  const n = Number(cursor!.slice(RANK_CURSOR_PREFIX.length));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function buildRankCursor(offset: number): string {
  return `${RANK_CURSOR_PREFIX}${offset}`;
}

export function buildChronoCursor(createdAt: string): string {
  return `${CHRONO_CURSOR_PREFIX}${createdAt}`;
}

export function parseChronoCursor(cursor: string): string {
  return cursor.slice(CHRONO_CURSOR_PREFIX.length);
}

/** X benzeri: etkileşim + tazelik + takip ağı önceliği — sunucu yükü yok, mevcut sayaçlarla. */
export function computeFeedScore(item: RankableItem, boostedAuthors: Set<string>): number {
  const engagement =
    item.likeCount * 3 +
    item.commentCount * 6 +
    item.quoteCount * 5 +
    item.saveCount * 4 +
    Math.min(item.viewCount * 0.05, 30);

  const ageHours = (Date.now() - new Date(item.createdAt).getTime()) / 3_600_000;
  const recency = Math.max(0, 1 - ageHours / FEED_RANK_PERIOD_HOURS) * 60;

  const followingBoost = item.isFollowing ? 35 : 0;
  const verifiedBoost = item.author.isVerified ? 12 : 0;
  const boostedBoost = boostedAuthors.has(item.author.id) ? 20 : 0;

  return engagement + recency + followingBoost + verifiedBoost + boostedBoost;
}

export function sortFeedRanked<T extends RankableItem>(items: T[], boostedAuthors: Set<string>): T[] {
  return [...items].sort((a, b) => {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    if (aPin && bPin) {
      const priorityDiff = (b.pinPriority ?? 0) - (a.pinPriority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      const pinnedDiff =
        new Date(b.pinnedAt ?? 0).getTime() - new Date(a.pinnedAt ?? 0).getTime();
      if (pinnedDiff !== 0) return pinnedDiff;
    }

    const scoreDiff = computeFeedScore(b, boostedAuthors) - computeFeedScore(a, boostedAuthors);
    if (scoreDiff !== 0) return scoreDiff;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function paginateRankedFeed<T extends { createdAt: string }>(
  sorted: T[],
  offset: number,
  pageSize: number,
  poolFull: boolean,
  windowStart: string,
): { page: T[]; nextCursor: string | null } {
  const page = sorted.slice(offset, offset + pageSize);

  if (offset + pageSize < sorted.length) {
    return { page, nextCursor: buildRankCursor(offset + pageSize) };
  }

  if (poolFull) {
    return { page, nextCursor: buildChronoCursor(windowStart) };
  }

  const last = page[page.length - 1];
  return {
    page,
    nextCursor: page.length === pageSize && last ? last.createdAt : null,
  };
}
