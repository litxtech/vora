import { useEffect, useState } from 'react';
import { LOBBY_STATS_FALLBACK } from '@/constants/auth';
import { supabase } from '@/lib/supabase/client';

type LobbyStats = {
  activeUsers: number;
  livePosts: number;
  jobListings: number;
  events: number;
};

function formatCount(value: number): string {
  return value.toLocaleString('tr-TR');
}

export function useLobbyStats() {
  const [stats, setStats] = useState<LobbyStats>(LOBBY_STATS_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profiles, posts, jobs, events] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('job_listings').select('id', { count: 'exact', head: true }),
          supabase.from('events').select('id', { count: 'exact', head: true }),
        ]);

        if (cancelled) return;

        setStats({
          activeUsers: profiles.count && profiles.count > 0 ? profiles.count : LOBBY_STATS_FALLBACK.activeUsers,
          livePosts: posts.count && posts.count > 0 ? posts.count : LOBBY_STATS_FALLBACK.livePosts,
          jobListings: jobs.count && jobs.count > 0 ? jobs.count : LOBBY_STATS_FALLBACK.jobListings,
          events: events.count && events.count > 0 ? events.count : LOBBY_STATS_FALLBACK.events,
        });
      } catch {
        if (!cancelled) setStats(LOBBY_STATS_FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    stats,
    formatted: {
      activeUsers: formatCount(stats.activeUsers),
      livePosts: formatCount(stats.livePosts),
      jobListings: formatCount(stats.jobListings),
      events: formatCount(stats.events),
    },
  };
}
