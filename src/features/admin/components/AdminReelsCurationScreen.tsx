import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  adminPinReel,
  adminUnpinReel,
  adminUpdateReelPin,
  fetchPinnedReelsAdmin,
  type PinnedReelRow,
} from '@/features/admin/services/reelCurationManagement';
import {
  formatReelPinExpiry,
  REEL_PIN_DURATION_OPTIONS,
  type PinDurationOption,
} from '@/features/reels/services/reelPinning';
import { spacing } from '@/constants/theme';

export function AdminReelsCurationScreen() {
  const [items, setItems] = useState<PinnedReelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [reelIdInput, setReelIdInput] = useState('');
  const [priorityInput, setPriorityInput] = useState('0');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchPinnedReelsAdmin());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handlePin = (days: number | null) => {
    const reelId = reelIdInput.trim();
    if (!reelId) {
      Alert.alert('Reel ID', 'Sabitlemek için reel ID girin.');
      return;
    }
    const priority = Math.max(0, parseInt(priorityInput, 10) || 0);
    Alert.alert(
      'Reels Sabitle',
      days ? `${days} gün boyunca üstte gösterilsin mi?` : 'Süresiz olarak üstte gösterilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sabitle',
          onPress: async () => {
            setActionId(reelId);
            const { error } = await adminPinReel(reelId, days, priority);
            setActionId(null);
            if (error) Alert.alert('Hata', error);
            else {
              setReelIdInput('');
              await load(true);
            }
          },
        },
      ],
    );
  };

  const handleUnpin = (item: PinnedReelRow) => {
    Alert.alert('Sabitlemeyi Kaldır', 'Bu reel üst sıradan kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.reel_id);
          const { error } = await adminUnpinReel(item.reel_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  const handleExtend = (item: PinnedReelRow, option: PinDurationOption) => {
    Alert.alert('Süreyi Güncelle', `${option.label} olarak güncellensin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Güncelle',
        onPress: async () => {
          setActionId(item.reel_id);
          const { error } = await adminUpdateReelPin(item.reel_id, option.days);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Reels Sabitleme"
      subtitle="Reels akışında öne çıkarılan videolar"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.grantCard}>
        <Text variant="label">Yeni sabitleme</Text>
        <AdminFormField label="Reel ID" value={reelIdInput} onChangeText={setReelIdInput} placeholder="UUID" />
        <AdminFormField
          label="Öncelik (yüksek = üstte)"
          value={priorityInput}
          onChangeText={setPriorityInput}
          placeholder="0"
        />
        <View style={styles.chipRow}>
          {REEL_PIN_DURATION_OPTIONS.map((option) => (
            <AdminActionChip
              key={option.id}
              label={option.label}
              icon="pin-outline"
              tone="primary"
              loading={actionId === reelIdInput.trim()}
              disabled={Boolean(actionId)}
              onPress={() => handlePin(option.days)}
            />
          ))}
        </View>
      </GlassCard>

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Sabitleme yok" message="Henüz sabitlenmiş reel bulunmuyor." icon="film-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.reel_id} style={styles.row}>
            <Text variant="label" numberOfLines={2}>
              {item.caption?.trim() || '—'}
            </Text>
            <Text secondary variant="caption">
              @{item.author_username} · {item.view_count.toLocaleString('tr-TR')} görüntülenme · Öncelik{' '}
              {item.pin_priority}
            </Text>
            <Text secondary variant="caption">
              Sabitleyen: @{item.pinned_by_username ?? '—'} · Bitiş: {formatReelPinExpiry(item.pinned_until)}
            </Text>
            <View style={styles.chipRow}>
              {REEL_PIN_DURATION_OPTIONS.map((option) => (
                <AdminActionChip
                  key={`${item.reel_id}-${option.id}`}
                  label={option.label}
                  icon="time-outline"
                  tone="primary"
                  loading={actionId === item.reel_id}
                  disabled={Boolean(actionId)}
                  onPress={() => handleExtend(item, option)}
                />
              ))}
              <AdminActionChip
                label="Kaldır"
                icon="close-circle-outline"
                tone="danger"
                loading={actionId === item.reel_id}
                disabled={Boolean(actionId)}
                onPress={() => handleUnpin(item)}
              />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  grantCard: { gap: spacing.sm, marginBottom: spacing.md },
  row: { gap: spacing.sm, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
