import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { regionNameById } from '@/constants/regions';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { BroadcastAudienceFields } from '@/features/admin/components/shared/BroadcastAudienceFields';
import { IstanbulDateTimePicker } from '@/features/admin/components/shared/IstanbulDateTimePicker';
import {
  defaultIstanbulSchedule,
  formatIstanbulSchedule,
  isoToIstanbulParts,
  istanbulPartsToIso,
  isFutureIstanbulSchedule,
  type IstanbulScheduleParts,
} from '@/features/admin/utils/istanbulSchedule';
import { BROADCAST_TYPE_LABELS } from '@/features/admin/constants';
import {
  audienceSegmentLabel,
  type BroadcastAudienceFilter,
} from '@/features/admin/constants/broadcastAudience';
import {
  cancelScheduledBroadcast,
  createScheduledBroadcast,
  deleteScheduledBroadcast,
  fetchRecentBroadcasts,
  fetchScheduledBroadcasts,
  previewBroadcastRecipients,
  sendBroadcast,
  updateScheduledBroadcast,
  type ScheduledBroadcastRow,
} from '@/features/admin/services/broadcasts';
import type { BroadcastType } from '@/features/admin/types';
import { spacing } from '@/constants/theme';
import { PushPhonePreview } from '@/features/push-automation/components/PushPhonePreview';

const TYPE_OPTIONS = (Object.keys(BROADCAST_TYPE_LABELS) as BroadcastType[]).map((t) => ({
  id: t,
  label: BROADCAST_TYPE_LABELS[t],
}));

const SEND_MODE_OPTIONS = [
  { id: 'now' as const, label: 'Hemen gönder' },
  { id: 'schedule' as const, label: 'Zamanla' },
];

const DEFAULT_AUDIENCE: BroadcastAudienceFilter = { segment: 'all' };

function scheduledStatusLabel(row: ScheduledBroadcastRow): string {
  if (row.is_sent) return 'Gönderildi';
  if (row.is_cancelled) return 'İptal';
  return 'Bekliyor';
}

function parseAudienceFilter(raw: Record<string, unknown> | null): BroadcastAudienceFilter {
  if (!raw) return DEFAULT_AUDIENCE;
  return {
    segment: (raw.segment as BroadcastAudienceFilter['segment']) ?? 'all',
    regionId: (raw.region_id as string | null) ?? null,
    role: (raw.role as BroadcastAudienceFilter['role']) ?? null,
    requirePushToken: raw.require_push_token === true,
  };
}

export function AdminBroadcastsScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<BroadcastType>('system');
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduleParts, setScheduleParts] = useState<IstanbulScheduleParts>(defaultIstanbulSchedule);
  const [audience, setAudience] = useState<BroadcastAudienceFilter>(DEFAULT_AUDIENCE);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledBroadcastRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scheduleLabel = useMemo(() => formatIstanbulSchedule(scheduleParts), [scheduleParts]);
  const scheduledAtIso = useMemo(() => istanbulPartsToIso(scheduleParts), [scheduleParts]);

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [{ data }, scheduledRows] = await Promise.all([
      fetchRecentBroadcasts(),
      fetchScheduledBroadcasts(),
    ]);
    setHistory(data);
    setScheduled(scheduledRows);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    void previewBroadcastRecipients(audience).then((res) => setPreviewCount(res.count));
  }, [audience]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setType('system');
    setSendMode('now');
    setScheduleParts(defaultIstanbulSchedule());
    setAudience(DEFAULT_AUDIENCE);
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve mesaj yazmalısınız.');
      return;
    }

    if ((sendMode === 'schedule' || editingId) && !isFutureIstanbulSchedule(scheduleParts)) {
      Alert.alert('Geçersiz zaman', 'Planlanan gönderim Türkiye saatine göre gelecekte olmalıdır.');
      return;
    }

    const confirmTitle = editingId
      ? 'Planı güncelle'
      : sendMode === 'schedule'
        ? 'Duyuruyu zamanla'
        : 'Duyuruyu gönder';
    const confirmBody =
      sendMode === 'schedule'
        ? `${scheduleLabel} tarihinde ${previewCount?.toLocaleString('tr-TR') ?? '—'} kişiye gönderilecek.`
        : `${previewCount?.toLocaleString('tr-TR') ?? '—'} kişiye hemen gönderilecek.`;

    Alert.alert(confirmTitle, confirmBody, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: editingId ? 'Kaydet' : sendMode === 'schedule' ? 'Planla' : 'Gönder',
        onPress: async () => {
          setSubmitting(true);
          let error: string | null = null;

          if (editingId) {
            ({ error } = await updateScheduledBroadcast(
              editingId,
              title.trim(),
              body.trim(),
              type,
              scheduledAtIso,
              audience,
            ));
          } else if (sendMode === 'schedule') {
            ({ error } = await createScheduledBroadcast(
              title.trim(),
              body.trim(),
              type,
              scheduledAtIso,
              audience,
            ));
          } else {
            const result = await sendBroadcast(type, title.trim(), body.trim(), audience);
            error = result.error;
            if (!error) {
              Alert.alert(
                'Gönderildi',
                `${result.recipientCount ?? 0} kişiye bildirim iletildi${result.pushProcessed ? ` · ${result.pushProcessed} push gönderildi` : ''}.`,
              );
            }
          }

          setSubmitting(false);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }

          if (editingId || sendMode === 'schedule') {
            Alert.alert('Kaydedildi', editingId ? 'Plan güncellendi.' : 'Duyuru zamanlandı.');
          }

          resetForm();
          void loadAll(true);
        },
      },
    ]);
  };

  const handleEditScheduled = (row: ScheduledBroadcastRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setBody(row.body);
    setType(row.broadcast_type as BroadcastType);
    setSendMode('schedule');
    setScheduleParts(isoToIstanbulParts(row.scheduled_at));
    setAudience(parseAudienceFilter(row.audience_filter));
  };

  const handleCancelScheduled = (row: ScheduledBroadcastRow) => {
    Alert.alert('İptal et', `"${row.title}" planı iptal edilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          const { error } = await cancelScheduledBroadcast(row.id);
          if (error) Alert.alert('Hata', error);
          else {
            if (editingId === row.id) resetForm();
            void loadAll(true);
          }
        },
      },
    ]);
  };

  const handleDeleteScheduled = (row: ScheduledBroadcastRow) => {
    Alert.alert('Kaldır', `"${row.title}" listeden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteScheduledBroadcast(row.id);
          if (error) Alert.alert('Hata', error);
          else {
            if (editingId === row.id) resetForm();
            void loadAll(true);
          }
        },
      },
    ]);
  };

  const pendingScheduled = scheduled.filter((row) => !row.is_sent && !row.is_cancelled);

  return (
    <AdminShell
      title="Bildirim Merkezi"
      subtitle="Seçili hedef kitleye toplu duyuru ve planlı push gönderin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => loadAll(true)}
    >
      <GlassCard style={styles.form}>
        <AdminSectionHeader
          title={editingId ? 'Planı düzenle' : 'Yeni duyuru'}
          hint={editingId ? 'Zamanlanmış gönderim' : undefined}
        />
        <Text secondary variant="caption">
          Duyuru türü
        </Text>
        <AdminFilterChip options={TYPE_OPTIONS} value={type} onChange={setType} />
        {!editingId ? (
          <AdminFilterChip options={SEND_MODE_OPTIONS} value={sendMode} onChange={setSendMode} />
        ) : null}
        <BroadcastAudienceFields audience={audience} onChange={setAudience} />
        {previewCount != null ? (
          <Text secondary variant="caption">
            Tahmini alıcı: {previewCount.toLocaleString('tr-TR')}
          </Text>
        ) : null}
        {sendMode === 'schedule' || editingId ? (
          <IstanbulDateTimePicker value={scheduleParts} onChange={setScheduleParts} />
        ) : null}
        <AdminFormField placeholder="Duyuru başlığı" value={title} onChangeText={setTitle} />
        <AdminFormField placeholder="Duyuru metni" value={body} onChangeText={setBody} multiline />
        <PushPhonePreview title={title} body={body} />
        <View style={styles.formActions}>
          {editingId ? (
            <AdminActionChip label="Vazgeç" icon="close-outline" onPress={resetForm} compact />
          ) : null}
          <Button
            title={
              submitting
                ? 'Kaydediliyor...'
                : editingId
                  ? 'Planı güncelle'
                  : sendMode === 'schedule'
                    ? 'Zamanla'
                    : 'Hemen gönder'
            }
            onPress={handleSubmit}
            disabled={submitting}
          />
        </View>
      </GlassCard>

      <AdminSectionHeader title="Zamanlanmış duyurular" hint={`${pendingScheduled.length} bekleyen`} />
      {loading ? (
        <AdminEmptyState loading />
      ) : scheduled.length === 0 ? (
        <AdminEmptyState title="Plan yok" message="Henüz zamanlanmış duyuru yok." icon="time-outline" />
      ) : (
        scheduled.map((row) => (
          <GlassCard key={row.id} style={styles.row}>
            <Text variant="label">{row.title}</Text>
            <Text secondary numberOfLines={2}>
              {row.body}
            </Text>
            <Text secondary variant="caption">
              {new Date(row.scheduled_at).toLocaleString('tr-TR')} ·{' '}
              {BROADCAST_TYPE_LABELS[row.broadcast_type as BroadcastType]} · {scheduledStatusLabel(row)}
            </Text>
            <Text secondary variant="caption">
              {audienceSegmentLabel(row.audience_filter?.segment as string | undefined)}
              {row.recipient_count != null && row.is_sent
                ? ` · ${row.recipient_count.toLocaleString('tr-TR')} kişi`
                : ''}
            </Text>
            {!row.is_sent && !row.is_cancelled ? (
              <View style={styles.actionRow}>
                <AdminActionChip label="Düzenle" icon="create-outline" onPress={() => handleEditScheduled(row)} compact />
                <AdminActionChip
                  label="İptal"
                  icon="pause-circle-outline"
                  tone="warning"
                  onPress={() => handleCancelScheduled(row)}
                  compact
                />
                <AdminActionChip
                  label="Sil"
                  icon="trash-outline"
                  tone="danger"
                  onPress={() => handleDeleteScheduled(row)}
                  compact
                />
              </View>
            ) : null}
          </GlassCard>
        ))
      )}

      <AdminSectionHeader title="Geçmiş duyurular" />
      {loading ? null : history.length === 0 ? (
        <AdminEmptyState title="Geçmiş yok" message="Henüz toplu duyuru gönderilmemiş." icon="notifications-outline" />
      ) : (
        history.map((item) => {
          const audienceFilter = item.audience_filter as Record<string, unknown> | null;
          return (
            <GlassCard key={item.id as string}>
              <Text variant="label">{item.title as string}</Text>
              <Text secondary variant="caption">
                {BROADCAST_TYPE_LABELS[item.broadcast_type as BroadcastType]} ·{' '}
                {item.recipient_count as number} kişi
                {item.region_id
                  ? ` · ${regionNameById(item.region_id as string) ?? item.region_id}`
                  : ''}
                {audienceFilter?.segment
                  ? ` · ${audienceSegmentLabel(audienceFilter.segment as string)}`
                  : ''}
              </Text>
            </GlassCard>
          );
        })
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  row: { gap: spacing.xs },
  scheduleBlock: { gap: spacing.xs },
  scheduleActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
