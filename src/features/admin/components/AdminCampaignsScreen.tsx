import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchBusinessCampaigns,
  moderateBusinessCampaign,
  type BusinessCampaignRow,
} from '@/features/admin/services/phase3Management';
import { spacing } from '@/constants/theme';

export function AdminCampaignsScreen() {
  const [items, setItems] = useState<BusinessCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchBusinessCampaigns());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (id: string, action: () => Promise<{ error: string | null }>) => {
    setActionId(id);
    const { error } = await action();
    setActionId(null);
    if (error) Alert.alert('İşlem başarısız', error);
    else await load(true);
  };

  return (
    <AdminShell
      title="Kurumsal Kampanyalar"
      subtitle="İşletme kampanya moderasyonu"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Kampanya yok" message="Yönetilecek kampanya bulunamadı." icon="megaphone-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.title}</Text>
            <Text secondary variant="caption" numberOfLines={2}>
              {item.description}
            </Text>
            <Text secondary variant="caption">
              {item.business_name} · @{item.owner_username} · {item.status}
            </Text>
            {item.status === 'published' ? (
              <View style={styles.actions}>
                <AdminActionChip
                  label="Gizle"
                  icon="eye-off-outline"
                  tone="warning"
                  loading={actionId === `${item.id}-hide`}
                  disabled={Boolean(actionId)}
                  onPress={() =>
                    void runAction(`${item.id}-hide`, () => moderateBusinessCampaign(item.id, 'hidden'))
                  }
                />
                <AdminActionChip
                  label="Kaldır"
                  icon="trash-outline"
                  tone="danger"
                  loading={actionId === `${item.id}-remove`}
                  disabled={Boolean(actionId)}
                  onPress={() =>
                    Alert.alert('Kaldır', 'Kampanya kaldırılsın mı?', [
                      { text: 'Vazgeç', style: 'cancel' },
                      {
                        text: 'Kaldır',
                        style: 'destructive',
                        onPress: () =>
                          void runAction(`${item.id}-remove`, () =>
                            moderateBusinessCampaign(item.id, 'removed'),
                          ),
                      },
                    ])
                  }
                />
              </View>
            ) : item.status === 'hidden' ? (
              <AdminActionChip
                label="Yayınla"
                icon="checkmark-outline"
                tone="success"
                loading={actionId === `${item.id}-publish`}
                disabled={Boolean(actionId)}
                onPress={() =>
                  void runAction(`${item.id}-publish`, () => moderateBusinessCampaign(item.id, 'published'))
                }
              />
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
