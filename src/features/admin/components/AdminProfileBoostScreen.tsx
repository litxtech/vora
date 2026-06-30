import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminUserSearchPicker } from '@/features/admin/components/shared/AdminUserSearchPicker';
import {
  fetchProfileBoosts,
  grantProfileBoost,
  revokeProfileBoost,
  type ProfileBoostRow,
} from '@/features/admin/services/phase3Management';
import type { AdminUserRow } from '@/features/admin/types';
import { updateFeatureVisibility } from '@/features/feature-flags/services/featureFlags';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';

export function AdminProfileBoostScreen() {
  const { user } = useAuth();
  const { isVisible, refresh: refreshFeatureFlags } = useFeatureFlags();
  const sectionVisible = isVisible('featured-profiles');
  const [items, setItems] = useState<ProfileBoostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchProfileBoosts());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRevoke = (item: ProfileBoostRow) => {
    Alert.alert('Boost iptal', `@${item.username} profil öne çıkarması iptal edilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.user_id);
          const { error } = await revokeProfileBoost(item.user_id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  const handleSectionToggle = (nextVisible: boolean) => {
    if (!user) return;

    const apply = async () => {
      setSectionSaving(true);
      const { error } = await updateFeatureVisibility('featured-profiles', nextVisible, user.id);
      setSectionSaving(false);
      if (error) {
        Alert.alert('Hata', error);
        return;
      }
      await refreshFeatureFlags();
    };

    if (!nextVisible) {
      Alert.alert(
        'Bölümü kapat',
        'Öne çıkan profiller akış, keşfet ve vitrin sayfasında gizlenecek. Devam edilsin mi?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Kapat', style: 'destructive', onPress: () => void apply() },
        ],
      );
      return;
    }

    void apply();
  };

  const handleGrant = () => {
    if (!selectedUser) {
      Alert.alert('Kullanıcı seç', 'Boost verilecek kullanıcıyı seçin.');
      return;
    }
    Alert.alert('Boost ver', '7 günlük profil öne çıkarma verilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ver',
        onPress: async () => {
          setActionId(selectedUser.id);
          const { error } = await grantProfileBoost(selectedUser.id, 7);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Profil Boost"
      subtitle="Bölümü kapatın veya tek tek boost iptal edin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionRow}>
          <View style={styles.sectionCopy}>
            <Text variant="label">Öne çıkan profiller bölümü</Text>
            <Text secondary variant="caption">
              {sectionVisible
                ? 'Akış ve keşfette görünür'
                : 'Tüm kullanıcılarda gizli'}
            </Text>
          </View>
          <Switch
            value={sectionVisible}
            disabled={sectionSaving}
            onValueChange={handleSectionToggle}
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.grantCard}>
        <Text variant="label">Boost ver</Text>
        <AdminUserSearchPicker selectedUser={selectedUser} onSelectUser={setSelectedUser} />
        <AdminActionChip label="7 gün ver" icon="rocket-outline" tone="primary" onPress={handleGrant} />
      </GlassCard>

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState title="Boost yok" message="Aktif profil boost bulunamadı." icon="rocket-outline" />
      ) : (
        items.map((item) => (
          <GlassCard key={item.user_id} style={styles.row}>
            <Text variant="label">@{item.username}</Text>
            <Text secondary variant="caption">
              {item.is_premium ? 'Premium' : 'Standart'}
              {item.profile_boosted_until
                ? ` · Boost: ${new Date(item.profile_boosted_until).toLocaleDateString('tr-TR')}`
                : ''}
            </Text>
            {item.profile_boosted_until && new Date(item.profile_boosted_until) > new Date() ? (
              <AdminActionChip
                label="Boost iptal"
                icon="close-circle-outline"
                tone="danger"
                loading={actionId === item.user_id}
                disabled={Boolean(actionId)}
                onPress={() => handleRevoke(item)}
              />
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  sectionCard: { marginBottom: spacing.md },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionCopy: { flex: 1, gap: 2 },
  grantCard: { gap: spacing.sm, marginBottom: spacing.md },
  row: { gap: spacing.sm },
});
