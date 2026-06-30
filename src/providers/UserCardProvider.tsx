import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { UserCard, type UserCardStats } from '@/features/profile/components/UserCard';
import type { FeedAuthor } from '@/features/feed/types';
import type { BadgeType } from '@/features/profile/types';
import { supabase } from '@/lib/supabase/client';
import { isFollowingBusiness } from '@/features/profile/services/businessFollow';
import { useAuth } from '@/providers/AuthProvider';

const DEFAULT_STATS: UserCardStats = {
  trustScore: 100,
  reporterLevel: 1,
  verifiedContentCount: 0,
  eventsAttended: 0,
  badges: [],
};

type UserCardContextValue = {
  openUserCard: (author: FeedAuthor, isFollowing?: boolean) => void;
};

const UserCardContext = createContext<UserCardContextValue | null>(null);

export function UserCardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [author, setAuthor] = useState<FeedAuthor | null>(null);
  const [stats, setStats] = useState<UserCardStats>(DEFAULT_STATS);
  const [isFollowing, setIsFollowing] = useState(false);
  const [visible, setVisible] = useState(false);

  const openUserCard = useCallback(
    async (nextAuthor: FeedAuthor, following = false) => {
      if (nextAuthor.id.startsWith('demo-')) return;

      setAuthor(nextAuthor);
      setIsFollowing(following);
      setStats(DEFAULT_STATS);
      setVisible(true);

      const [profileRes, followRes, badgesRes, eventsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('trust_score, reporter_level, verified_content_count')
          .eq('id', nextAuthor.id)
          .maybeSingle(),
        user
          ? supabase
              .from('follows')
              .select('follower_id')
              .eq('follower_id', user.id)
              .eq('following_id', nextAuthor.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('user_badges').select('badge_type').eq('user_id', nextAuthor.id).limit(5),
        supabase
          .from('event_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', nextAuthor.id)
          .eq('status', 'going'),
      ]);

      const profile = profileRes.data as {
        trust_score?: number;
        reporter_level?: number;
        verified_content_count?: number;
      } | null;

      setStats({
        trustScore: profile?.trust_score ?? 100,
        reporterLevel: profile?.reporter_level ?? 1,
        verifiedContentCount: profile?.verified_content_count ?? 0,
        eventsAttended: eventsRes.count ?? 0,
        badges: ((badgesRes.data ?? []) as { badge_type: BadgeType }[]).map((b) => b.badge_type),
      });

      if (followRes.data) {
        setIsFollowing(true);
      } else if (user && nextAuthor.businessId) {
        const followingBusiness = await isFollowingBusiness(user.id, nextAuthor.businessId);
        if (followingBusiness) setIsFollowing(true);
      }
    },
    [user?.id],
  );

  const close = () => {
    setVisible(false);
    setAuthor(null);
  };

  const value = useMemo<UserCardContextValue>(() => ({ openUserCard }), [openUserCard]);

  return (
    <UserCardContext.Provider value={value}>
      {children}
      {author ? (
        <UserCard
          author={author}
          stats={stats}
          isFollowing={isFollowing}
          visible={visible}
          onClose={close}
          onFollowToggle={setIsFollowing}
        />
      ) : null}
    </UserCardContext.Provider>
  );
}

export function useUserCard() {
  const ctx = useContext(UserCardContext);
  if (!ctx) throw new Error('useUserCard UserCardProvider içinde kullanılmalı.');
  return ctx;
}

export function useUserCardOptional() {
  return useContext(UserCardContext);
}
