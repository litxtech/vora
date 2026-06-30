import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { regionNameById } from '@/constants/regions';
import { ROLE_LABELS } from '@/constants/roles';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import {
  LIFECYCLE_REQUEST_STATUS_LABELS,
  LIFECYCLE_REQUEST_TYPE_LABELS,
} from '@/features/account-lifecycle/constants';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { ACCOUNT_STATUS_LABELS } from '@/features/moderation/constants';
import {
  formatSupportTicketCategory,
  SUPPORT_TICKET_STATUS_LABELS,
} from '@/features/support/constants';
import {
  adminUpdateSupportTicket,
  fetchAdminSupportTicketDetail,
} from '@/features/support/services/adminSupport';
import type { AdminSupportTicketDetail, SupportTicketStatus } from '@/features/support/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

export function AdminSupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const [ticket, setTicket] = useState<AdminSupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!id || guard.status !== 'allowed') return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await fetchAdminSupportTicketDetail(id);
      if (result.error) Alert.alert('Hata', result.error);
      setTicket(result.data);
      setAdminNote(result.data?.admin_note ?? '');
      setLoading(false);
      setRefreshing(false);
    },
    [guard.status, id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = (status: SupportTicketStatus) => {
    if (!ticket) return;
    Alert.alert('Durumu güncelle', SUPPORT_TICKET_STATUS_LABELS[status], [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          setSaving(true);
          const { error } = await adminUpdateSupportTicket(ticket.id, status, adminNote);
          setSaving(false);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  if (guard.status === 'denied') return null;

  if (loading) {
    return (
      <AdminShell title="Destek Detayı" requireAdmin>
        <AdminEmptyState loading />
      </AdminShell>
    );
  }

  if (!ticket) {
    return (
      <AdminShell title="Destek Detayı" requireAdmin>
        <AdminEmptyState title="Talep bulunamadı" message="Kayıt silinmiş veya erişiminiz yok." icon="alert-circle-outline" />
      </AdminShell>
    );
  }

  const accent = statusColor(ticket.status, colors);
  const user = ticket.user;
  const accountStatusLabel = ACCOUNT_STATUS_LABELS[user.account_status] ?? user.account_status;

  return (
    <AdminShell
      title="Destek Detayı"
      subtitle={ticket.subject}
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.card}>
        <View style={[styles.statusBanner, { backgroundColor: `${accent}14`, borderColor: `${accent}44` }]}>
          <Ionicons name="ticket-outline" size={18} color={accent} />
          <Text variant="label" style={{ color: accent, flex: 1 }}>
            {SUPPORT_TICKET_STATUS_LABELS[ticket.status]}
          </Text>
          <Text variant="caption" muted>
            {formatSupportTicketCategory(ticket.category)}
          </Text>
        </View>
        <MetaRow label="Oluşturulma" value={formatDateTime(ticket.created_at)} />
        <MetaRow label="Güncelleme" value={formatDateTime(ticket.updated_at)} />
        {ticket.resolved_at ? <MetaRow label="Sonuç" value={formatDateTime(ticket.resolved_at)} /> : null}
      </GlassCard>

      <AdminSectionHeader title="Kullanıcı" hint="Şikayeti değerlendirmek için profil özeti" />

      <GlassCard style={styles.card}>
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
          <View style={styles.userCopy}>
            <Text variant="label">@{user.username}</Text>
            <Text variant="caption" secondary>
              {user.full_name ?? '—'}
            </Text>
          </View>
          <Pressable
            style={[styles.profileBtn, { borderColor: colors.primary }]}
            onPress={() => router.push(`/admin/users/${user.id}` as never)}
          >
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              Tam profil
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.infoGrid}>
          <InfoChip label="Hesap durumu" value={accountStatusLabel} accent={colors.warning} />
          <InfoChip label="Rol" value={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role} />
          <InfoChip label="Güven puanı" value={`${user.trust_score ?? 0}/100`} />
          <InfoChip label="Premium" value={user.is_premium ? 'Evet' : 'Hayır'} />
          <InfoChip label="Misafir" value={user.is_guest ? 'Evet' : 'Hayır'} />
          <InfoChip label="Bölge" value={regionNameById(user.region_id) ?? '—'} />
          <InfoChip label="Şikayet sayısı" value={String(user.report_count ?? 0)} accent={colors.danger} />
        </View>

        <MetaRow label="E-posta" value={user.email ?? '—'} />
        <MetaRow label="Platforma kayıt" value={formatDateTime(user.created_at)} />
        <MetaRow label="Son görülme" value={formatDateTime(user.last_seen_at)} />
        {user.deletion_requested_at ? (
          <MetaRow label="Silme talebi" value={formatDateTime(user.deletion_requested_at)} />
        ) : null}
        {user.deleted_at ? <MetaRow label="Silinme" value={formatDateTime(user.deleted_at)} /> : null}

        <View style={styles.quickLinks}>
          <AdminActionChip
            compact
            label="Kullanıcı yönetimi"
            icon="person-outline"
            tone="primary"
            onPress={() => router.push(`/admin/users/${user.id}` as never)}
          />
          <AdminActionChip
            compact
            label="Yaşam döngüsü"
            icon="sync-outline"
            tone="warning"
            onPress={() => router.push('/admin/account-lifecycle' as never)}
          />
        </View>
      </GlassCard>

      <AdminSectionHeader title="Talep mesajı" hint="Kullanıcının yazdığı tam metin" />

      <GlassCard style={styles.card}>
        <Text variant="label">{ticket.subject}</Text>
        <View style={[styles.messageBox, { backgroundColor: `${colors.primary}08`, borderColor: colors.border }]}>
          <Text variant="body">{ticket.message}</Text>
        </View>
      </GlassCard>

      {ticket.lifecycle_request ? (
        <>
          <AdminSectionHeader title="Bağlı hesap talebi" hint="Yaşam döngüsü kaydı" />
          <GlassCard style={styles.card}>
            <Text variant="label">
              {LIFECYCLE_REQUEST_TYPE_LABELS[
                ticket.lifecycle_request.request_type as keyof typeof LIFECYCLE_REQUEST_TYPE_LABELS
              ] ?? ticket.lifecycle_request.request_type}
            </Text>
            <Text variant="caption" secondary>
              {LIFECYCLE_REQUEST_STATUS_LABELS[ticket.lifecycle_request.status] ?? ticket.lifecycle_request.status} ·{' '}
              Anlık durum: {ACCOUNT_STATUS_LABELS[ticket.lifecycle_request.account_status_snapshot] ??
                ticket.lifecycle_request.account_status_snapshot}
            </Text>
            <View style={[styles.messageBox, { backgroundColor: `${colors.warning}08`, borderColor: colors.border }]}>
              <Text variant="body">{ticket.lifecycle_request.message}</Text>
            </View>
            <AdminActionChip
              compact
              label="Yaşam döngüsüne git"
              icon="open-outline"
              tone="primary"
              onPress={() => router.push('/admin/account-lifecycle' as never)}
            />
          </GlassCard>
        </>
      ) : null}

      <AdminSectionHeader title="Admin yanıtı" hint="Kullanıcıya bildirimle gider" />

      <GlassCard style={styles.card}>
        <AdminFormField
          label="Admin notu / yanıt"
          placeholder="Kullanıcıya iletilecek açıklama…"
          value={adminNote}
          onChangeText={setAdminNote}
          multiline
        />
        {ticket.admin_note && ticket.admin_note !== adminNote ? (
          <Text variant="caption" muted>
            Kayıtlı not: {ticket.admin_note}
          </Text>
        ) : null}
      </GlassCard>

      {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
        <View style={styles.actions}>
          {ticket.status === 'open' ? (
            <AdminActionChip
              compact
              label="İşleme al"
              icon="hourglass-outline"
              tone="warning"
              style={styles.actionBtn}
              onPress={() => handleStatus('in_progress')}
            />
          ) : null}
          <AdminActionChip
            compact
            label="Yanıt bekle"
            icon="chatbubble-outline"
            tone="primary"
            style={styles.actionBtn}
            onPress={() => handleStatus('waiting_user')}
          />
          <AdminActionChip
            compact
            label="Çözüldü"
            icon="checkmark-outline"
            tone="success"
            style={styles.actionBtn}
            onPress={() => handleStatus('resolved')}
          />
          <AdminActionChip
            compact
            label="Kapat"
            icon="close-outline"
            tone="danger"
            style={styles.actionBtn}
            onPress={() => handleStatus('closed')}
          />
        </View>
      ) : null}

      {saving ? <Text variant="caption" muted style={{ textAlign: 'center' }}>Kaydediliyor…</Text> : null}
    </AdminShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

function InfoChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { colors } = useTheme();
  const color = accent ?? colors.text;

  return (
    <View style={[styles.infoChip, { borderColor: colors.border, backgroundColor: `${colors.surface}88` }]}>
      <Text variant="caption" muted style={{ fontSize: 11 }}>
        {label}
      </Text>
      <Text variant="caption" style={{ color, fontWeight: '700' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoChip: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: '45%',
  },
  metaRow: {
    gap: 2,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: '47%',
  },
});
