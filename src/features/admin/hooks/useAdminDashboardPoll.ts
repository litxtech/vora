import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchDashboardStats } from '@/features/admin/services/dashboard';
import type { AdminDashboardStats } from '@/features/admin/types';
import { TIP_LINE_ENABLED } from '@/features/tip-line/constants';

export type AdminNewDataAlertItem = {
  id: keyof AdminDashboardStats;
  message: string;
  tone: 'warning' | 'danger' | 'primary';
  href?: string;
};

const POLL_INTERVAL_MS = 30_000;

const WATCHED_METRICS: {
  key: keyof AdminDashboardStats;
  label: string;
  tone: AdminNewDataAlertItem['tone'];
  href?: string;
}[] = [
  { key: 'pending_reports', label: 'bekleyen şikayet', tone: 'warning', href: '/admin/reports' },
  { key: 'pending_verifications', label: 'bekleyen kurumsal doğrulama', tone: 'danger', href: '/admin/businesses' },
  { key: 'pending_identity_verifications', label: 'bekleyen kimlik doğrulama', tone: 'danger', href: '/admin/identity-verification' },
  { key: 'pending_reporter_apps', label: 'muhabir başvurusu', tone: 'primary', href: '/admin/reporter' },
  { key: 'pending_ads', label: 'bekleyen reklam', tone: 'warning', href: '/admin/ads' },
  { key: 'pending_appeals', label: 'itiraz', tone: 'danger', href: '/admin/appeals' },
  ...(TIP_LINE_ENABLED
    ? [{ key: 'pending_tips' as const, label: 'bekleyen ihbar', tone: 'warning' as const, href: '/admin/centers' }]
    : []),
  { key: 'disputed_vcts', label: 'VCTS itirazı', tone: 'danger', href: '/admin/vcts' },
  { key: 'pending_post_verifications', label: 'haber doğrulama', tone: 'primary', href: '/admin/news-verification' },
  { key: 'ai_review_queue', label: 'AI inceleme', tone: 'warning', href: '/admin/ai-moderation' },
  { key: 'pending_support_tickets', label: 'destek talebi', tone: 'primary', href: '/admin/support' },
  { key: 'daily_registrations', label: 'kayıt', tone: 'primary' },
  { key: 'daily_posts', label: 'paylaşım', tone: 'primary' },
  { key: 'daily_comments', label: 'yorum', tone: 'primary' },
  { key: 'daily_messages', label: 'mesaj', tone: 'primary' },
];

function detectNewAlerts(prev: AdminDashboardStats, next: AdminDashboardStats): AdminNewDataAlertItem[] {
  return WATCHED_METRICS.flatMap(({ key, label, tone, href }) => {
    const delta = next[key] - prev[key];
    if (delta <= 0) return [];

    return [
      {
        id: key,
        message: `${delta} yeni ${label} · toplam ${next[key].toLocaleString('tr-TR')}`,
        tone,
        href,
      },
    ];
  });
}

export function useAdminDashboardPoll(enabled: boolean) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAlerts, setNewAlerts] = useState<AdminNewDataAlertItem[]>([]);

  const prevStatsRef = useRef<AdminDashboardStats | null>(null);
  const initializedRef = useRef(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!enabled) return;
      if (isRefresh) setRefreshing(true);
      else if (!initializedRef.current) setLoading(true);

      const result = await fetchDashboardStats();

      if (result.data) {
        if (initializedRef.current && prevStatsRef.current) {
          const incoming = detectNewAlerts(prevStatsRef.current, result.data);
          if (incoming.length > 0) {
            setNewAlerts((current) => {
              const next = [...current];
              for (const item of incoming) {
                const index = next.findIndex((alert) => alert.id === item.id);
                if (index >= 0) next[index] = item;
                else next.push(item);
              }
              return next;
            });
          }
        }

        prevStatsRef.current = result.data;
        initializedRef.current = true;
        setStats(result.data);
      }

      setError(result.error);
      setLoading(false);
      setRefreshing(false);
    },
    [enabled],
  );

  const dismissAlert = useCallback(
    (id: keyof AdminDashboardStats) => {
      setNewAlerts((current) => current.filter((alert) => alert.id !== id));

      if (stats && prevStatsRef.current) {
        prevStatsRef.current = { ...prevStatsRef.current, [id]: stats[id] };
      }
    },
    [stats],
  );

  useEffect(() => {
    if (!enabled) return;

    load();

    const interval = setInterval(() => {
      void load(true);
    }, POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load(true);
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [enabled, load]);

  return {
    stats,
    loading,
    refreshing,
    error,
    newAlerts,
    dismissAlert,
    refresh: () => load(true),
  };
}
