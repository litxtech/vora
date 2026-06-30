import { supabase } from '@/lib/supabase/client';

export async function fetchBoostedAuthorIds(authorIds: string[]): Promise<Set<string>> {
  if (authorIds.length === 0) return new Set();

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .in('id', authorIds)
    .gt('profile_boosted_until', new Date().toISOString());

  return new Set((data ?? []).map((p) => p.id));
}

type FeedSortItem = {
  author: { id: string };
  createdAt: string;
  isPinned?: boolean;
  pinPriority?: number;
  pinnedAt?: string | null;
};

export function sortFeedWithBoost<T extends FeedSortItem>(
  items: T[],
  boostedAuthors: Set<string>,
): T[] {
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

    const aBoost = boostedAuthors.has(a.author.id) ? 1 : 0;
    const bBoost = boostedAuthors.has(b.author.id) ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
