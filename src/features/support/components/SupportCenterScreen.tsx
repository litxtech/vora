import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { LiveSupportChatPanel } from '@/features/live-support/components/LiveSupportChatPanel';
import { LIVE_SUPPORT_ACCENT, LIVE_SUPPORT_ENTRY_SUBTITLE } from '@/features/live-support/constants';
import {
  formatSupportTicketCategory,
  SUPPORT_TICKET_SHORTCUTS,
  SUPPORT_TICKET_STATUS_LABELS,
} from '@/features/support/constants';
import { fetchMySupportTickets } from '@/features/support/services/supportTickets';
import type { SupportTicketRow } from '@/features/support/types';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { SUPPORT_CENTER_TABS, SUPPORT_FEATURE } from '@/features/live-support/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SupportTab = 'live' | 'tickets';

function statusColor(status: SupportTicketRow['status'], colors: ReturnType<typeof useTheme>['colors']) {
  switch (status) {
    case 'open':
      return colors.warning;
    case 'in_progress':
      return colors.primary;
    case 'waiting_user':
      return colors.accent;
    case 'resolved':
      return colors.success;
    default:
      return colors.textMuted;
  }
}

function SupportTabBar({
  active,
  onChange,
  tabs,
}: {
  active: SupportTab;
  onChange: (tab: SupportTab) => void;
  tabs: ReadonlyArray<{ id: SupportTab; label: string }>;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              isActive && { backgroundColor: `${LIVE_SUPPORT_ACCENT}18`, borderColor: `${LIVE_SUPPORT_ACCENT}44` },
            ]}
          >
            <Ionicons
              name={tab.id === 'live' ? 'headset-outline' : 'ticket-outline'}
              size={14}
              color={isActive ? LIVE_SUPPORT_ACCENT : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: isActive ? LIVE_SUPPORT_ACCENT : colors.textMuted,
                fontWeight: isActive ? '700' : '500',
                fontSize: 12,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SupportCenterScreen({ initialTab = 'live' }: { initialTab?: SupportTab }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const visibleTabs = useFeatureTabFilter('support-center', [...SUPPORT_CENTER_TABS]);
  const showTicketsCreate = useFeatureVisible(SUPPORT_FEATURE.ticketsCreate);
  const showTicketsShortcuts = useFeatureVisible(SUPPORT_FEATURE.ticketsShortcuts);
  const showTicketsOpen = useFeatureVisible(SUPPORT_FEATURE.ticketsOpen);
  const [tab, setTab] = useState<SupportTab>(initialTab);
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visibleTabs.some((item) => item.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'live');
    }
  }, [visibleTabs, tab]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setTickets(await fetchMySupportTickets());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'tickets') {
      void loadTickets();
    }
  }, [loadTickets, tab]);

  if (tab === 'live') {
    return (
      <View style={[styles.livePage, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.liveHeader, { borderBottomColor: colors.border }]}>
          <ScreenBackButton />
          <Text variant="label" style={styles.liveTitle}>
            Canlı Destek
          </Text>
          <View style={styles.liveHeaderSpacer} />
        </View>

        <View style={styles.liveTabsWrap}>
          <SupportTabBar active={tab} onChange={setTab} tabs={visibleTabs} />
        </View>

        <LiveSupportChatPanel embedded />
      </View>
    );
  }

  return (
    <GradientBackground>
      <View
        style={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom },
        ]}
      >
        <AuthHeader
          title="Destek Merkezi"
          subtitle={LIVE_SUPPORT_ENTRY_SUBTITLE}
          showBack
        />

        <SupportTabBar active={tab} onChange={setTab} tabs={visibleTabs} />

        <FlatList
          data={tickets}
          keyExtractor={(ticket) => ticket.id}
          contentContainerStyle={styles.ticketsPage}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          windowSize={9}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={styles.ticketsHeader}>
              {showTicketsCreate ? (
              <Button title="Yeni Destek Talebi" onPress={() => router.push('/support/create' as never)} />
              ) : null}

              {showTicketsShortcuts
                ? SUPPORT_TICKET_SHORTCUTS.map((shortcut) => (
                <Pressable
                  key={shortcut.id}
                  onPress={() => router.push(shortcut.href as never)}
                  style={[styles.shortcutCard, { borderColor: colors.border, backgroundColor: `${LIVE_SUPPORT_ACCENT}08` }]}
                >
                  <View style={[styles.shortcutIcon, { backgroundColor: `${LIVE_SUPPORT_ACCENT}16` }]}>
                    <Ionicons name={shortcut.icon} size={18} color={LIVE_SUPPORT_ACCENT} />
                  </View>
                  <View style={styles.shortcutCopy}>
                    <Text variant="label">{shortcut.label}</Text>
                    <Text variant="caption" secondary>
                      {shortcut.hint}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))
                : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <GlassCard>
                <Text secondary>Yükleniyor…</Text>
              </GlassCard>
            ) : (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="ticket-outline" size={36} color={colors.textMuted} />
                <Text variant="label">Henüz destek talebiniz yok</Text>
                <Text secondary variant="caption" style={styles.emptyText}>
                  Canlı destek sekmesinden anında yazabilir veya detaylı bir destek talebi oluşturabilirsiniz.
                </Text>
              </GlassCard>
            )
          }
          renderItem={({ item: ticket }) => {
            if (!showTicketsOpen) return null;
            const accent = statusColor(ticket.status, colors);
            return (
              <Pressable onPress={() => router.push(`/support/${ticket.id}` as never)}>
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
                      <Ionicons name="ticket-outline" size={18} color={accent} />
                    </View>
                    <View style={styles.copy}>
                      <Text variant="label" numberOfLines={1}>
                        {ticket.subject}
                      </Text>
                      <Text variant="caption" secondary>
                        {formatSupportTicketCategory(ticket.category)} ·{' '}
                        {formatDeletedAccountDate(ticket.created_at)}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
                      <Text variant="caption" style={{ color: accent, fontWeight: '700', fontSize: 11 }}>
                        {SUPPORT_TICKET_STATUS_LABELS[ticket.status]}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            );
          }}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  livePage: {
    flex: 1,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  liveTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  liveHeaderSpacer: {
    width: 40,
  },
  liveTabsWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ticketsPage: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  ticketsHeader: {
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: { textAlign: 'center', lineHeight: 18 },
  card: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
