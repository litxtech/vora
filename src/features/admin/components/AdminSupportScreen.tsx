import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  formatSupportTicketCategory,
  SUPPORT_TICKET_STATUS_LABELS,
} from '@/features/support/constants';
import { adminUpdateSupportTicket, fetchAdminSupportTickets } from '@/features/support/services/adminSupport';
import type { SupportTicketRow, SupportTicketStatus } from '@/features/support/types';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';

const STATUS_FILTERS: { id: SupportTicketStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'open', label: 'Açık' },
  { id: 'in_progress', label: 'İşlemde' },
  { id: 'waiting_user', label: 'Yanıt bekliyor' },
  { id: 'resolved', label: 'Çözüldü' },
];

function statusColor(status: SupportTicketStatus, colors: ReturnType<typeof useTheme>['colors']) {
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

export function AdminSupportScreen() {
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (guard.status !== 'allowed') return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await fetchAdminSupportTickets(statusFilter);
      setTickets(result.data);
      setLoading(false);
      setRefreshing(false);
    },
    [guard.status, statusFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = (ticket: SupportTicketRow, status: SupportTicketStatus) => {
    Alert.alert('Durumu güncelle', SUPPORT_TICKET_STATUS_LABELS[status], [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await adminUpdateSupportTicket(ticket.id, status);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  if (guard.status === 'denied') return null;

  return (
    <AdminShell
      title="Destek Talepleri"
      subtitle="Kullanıcı destek ve hesap talepleri"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

      {loading ? (
        <AdminEmptyState loading />
      ) : tickets.length === 0 ? (
        <AdminEmptyState title="Talep yok" message="Seçili filtreye uygun destek talebi yok." icon="chatbubbles-outline" />
      ) : (
        tickets.map((ticket) => {
          const accent = statusColor(ticket.status, colors);
          return (
            <GlassCard key={ticket.id} style={styles.card}>
              <Pressable onPress={() => router.push(`/admin/support/${ticket.id}` as never)}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.copy}>
                    <Text variant="label">@{ticket.username}</Text>
                    {ticket.full_name ? (
                      <Text variant="caption" secondary numberOfLines={1}>
                        {ticket.full_name}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
                    <Text variant="caption" style={{ color: accent, fontWeight: '700', fontSize: 11 }}>
                      {SUPPORT_TICKET_STATUS_LABELS[ticket.status]}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>

                <Text variant="label" numberOfLines={1}>
                  {ticket.subject}
                </Text>
                <Text variant="caption" secondary numberOfLines={2}>
                  {ticket.message}
                </Text>
                <Text variant="caption" muted>
                  {formatSupportTicketCategory(ticket.category)} · {formatDeletedAccountDate(ticket.created_at)}
                </Text>

                {ticket.lifecycle_request_id ? (
                  <View style={[styles.linked, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}33` }]}>
                    <Ionicons name="link-outline" size={12} color={colors.warning} />
                    <Text variant="caption" style={{ color: colors.warning }}>
                      Hesap talebi bağlı
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
                <View style={styles.actions}>
                  {ticket.status === 'open' ? (
                    <AdminActionChip
                      compact
                      label="İşleme al"
                      icon="hourglass-outline"
                      tone="warning"
                      onPress={() => handleStatus(ticket, 'in_progress')}
                    />
                  ) : null}
                  <AdminActionChip
                    compact
                    label="Detay"
                    icon="open-outline"
                    tone="primary"
                    onPress={() => router.push(`/admin/support/${ticket.id}` as never)}
                  />
                </View>
              ) : null}
            </GlassCard>
          );
        })
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  linked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
