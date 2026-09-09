import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  adminModerateFeedContent,
  fetchRemovedContent,
  REMOVED_CONTENT_TYPE_LABELS,
  type AdminFeedContentTargetType,
  type RemovedContentRow,
} from '@/features/admin/services/removedContentManagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

export function AdminRemovedContentScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<RemovedContentRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data, error: fetchError } = await fetchRemovedContent(80);
    setItems(data);
    setError(fetchError);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.owner_username ?? '').toLowerCase().includes(q) ||
      REMOVED_CONTENT_TYPE_LABELS[item.target_type].toLowerCase().includes(q)
    );
  });

  const runAction = (
    item: RemovedContentRow,
    action: 'restore' | 'delete_permanent',
    label: string,
  ) => {
    Alert.alert(label, `"${item.title}" için devam edilsin mi? Sahibe bildirim gönderilir.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: label,
        style: action === 'delete_permanent' ? 'destructive' : 'default',
        onPress: async () => {
          setBusyId(item.target_id);
          const { error: modError } = await adminModerateFeedContent(
            item.target_type as AdminFeedContentTargetType,
            item.target_id,
            action,
            `Kaldırılanlar: ${label}`,
          );
          setBusyId(null);
          if (modError) Alert.alert('Hata', modError);
          else {
            Alert.alert('Tamam', action === 'restore' ? 'İçerik yeniden yayında.' : 'İçerik kalıcı silindi.');
            void load(true);
          }
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Kaldırılanlar"
      subtitle="Gizlenen ve kaldırılan içerikler — geri yükle veya kalıcı sil"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={[styles.info, { borderColor: `${colors.warning}44` }]}>
        <Text variant="caption" secondary>
          Gönderi, reel, reklam, pazar ilanı ve mağaza gibi içerikler burada listelenir. Kaldırma ve geri
          yükleme işlemlerinde içerik sahibine bildirim gider.
        </Text>
      </GlassCard>

      <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Başlık, kullanıcı veya tür ara..." />

      {loading ? (
        <AdminEmptyState loading />
      ) : error ? (
        <AdminEmptyState title="Yüklenemedi" message={error} icon="alert-circle-outline" />
      ) : filtered.length === 0 ? (
        <AdminEmptyState title="Kayıt yok" message="Kaldırılmış içerik bulunamadı." icon="archive-outline" />
      ) : (
        <>
          <AdminSectionHeader title="Kaldırılan içerikler" hint={`${filtered.length} kayıt`} />
          {filtered.map((item) => {
            const busy = busyId === item.target_id;
            const canDelete = item.target_type !== 'business_shop';
            return (
              <GlassCard key={`${item.target_type}-${item.target_id}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typePill, { backgroundColor: `${colors.danger}22` }]}>
                    <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                      {REMOVED_CONTENT_TYPE_LABELS[item.target_type]}
                    </Text>
                  </View>
                  <Text secondary variant="caption">
                    {formatDate(item.removed_at)}
                  </Text>
                </View>
                <Text variant="label" numberOfLines={2}>
                  {item.title || '—'}
                </Text>
                <Text secondary variant="caption">
                  @{item.owner_username ?? 'bilinmiyor'}
                  {item.owner_full_name ? ` · ${item.owner_full_name}` : ''} · {item.status}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.btn, { borderColor: colors.success }]}
                    disabled={busy}
                    onPress={() => runAction(item, 'restore', 'Geri yükle')}
                  >
                    <Ionicons name="refresh-outline" size={16} color={colors.success} />
                    <Text variant="caption" style={{ color: colors.success }}>
                      Geri yükle
                    </Text>
                  </Pressable>
                  {canDelete ? (
                    <Pressable
                      style={[styles.btn, { borderColor: colors.danger }]}
                      disabled={busy}
                      onPress={() => runAction(item, 'delete_permanent', 'Kalıcı sil')}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text variant="caption" style={{ color: colors.danger }}>
                        Kalıcı sil
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </GlassCard>
            );
          })}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  info: { padding: spacing.md, marginBottom: spacing.sm },
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
});
