import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { FeatureRootCard } from '@/features/admin/components/FeatureRootCard';
import {
  APP_FEATURE_BY_ID,
  APP_FEATURE_REGISTRY,
  FEATURE_GROUPS,
} from '@/features/feature-flags/constants';
import { updateFeatureVisibility } from '@/features/feature-flags/services/featureFlags';
import {
  countSubFeatures,
  getChildFeatures,
  getRootFeaturesInGroup,
  isEffectivelyVisible,
} from '@/features/feature-flags/services/featureTree';
import type { FeatureGroup } from '@/features/feature-flags/types';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type StatusFilter = 'all' | 'on' | 'off';

const STATUS_FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'on', label: 'Görünür' },
  { id: 'off', label: 'Gizli' },
];

const GROUP_ICONS: Record<FeatureGroup, keyof typeof Ionicons.glyphMap> = {
  tabs: 'grid-outline',
  auth: 'log-in-outline',
  centers: 'business-outline',
  programs: 'ribbon-outline',
  social: 'people-outline',
  actions: 'flash-outline',
};

const GROUP_HINTS: Record<FeatureGroup, string> = {
  tabs: 'Alt menüdeki ana sekmeler',
  auth: 'Lobi ve giriş ekranı seçenekleri',
  centers: 'Merkez hub ve alt modüller',
  programs: 'Programlar, cüzdan ve ayarlar',
  social: 'Topluluk, kanal ve sosyal özellikler',
  actions: 'Oluşturma, arama ve bildirim aksiyonları',
};

function matchesSearch(featureId: string, query: string): boolean {
  const feature = APP_FEATURE_BY_ID[featureId];
  if (!feature) return false;
  const q = query.trim().toLocaleLowerCase('tr-TR');
  if (!q) return true;
  return (
    feature.label.toLocaleLowerCase('tr-TR').includes(q) ||
    feature.id.toLocaleLowerCase('tr-TR').includes(q) ||
    (feature.hint?.toLocaleLowerCase('tr-TR').includes(q) ?? false)
  );
}

function matchesStatus(featureId: string, filter: StatusFilter, visibility: Record<string, boolean>): boolean {
  if (filter === 'all') return true;
  const on = isEffectivelyVisible(featureId, visibility);
  return filter === 'on' ? on : !on;
}

function nodeVisibleInFilter(
  featureId: string,
  visibility: Record<string, boolean>,
  query: string,
  statusFilter: StatusFilter,
): boolean {
  const selfMatch = matchesSearch(featureId, query) && matchesStatus(featureId, statusFilter, visibility);
  const children = getChildFeatures(featureId);
  const childMatch = children.some((child) => nodeVisibleInFilter(child.id, visibility, query, statusFilter));
  return selfMatch || childMatch;
}

export function AdminFeatureFlagsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { visibility, refresh, isReady } = useFeatureFlags();
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const applyToggle = async (featureId: string, isButtonVisible: boolean) => {
    if (!user) return;
    setSavingId(featureId);
    const { error } = await updateFeatureVisibility(featureId, isButtonVisible, user.id);
    setSavingId(null);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    await refresh();
  };

  const handleToggle = (featureId: string, label: string, nextVisible: boolean) => {
    if (!user) return;

    const childCount = countSubFeatures(featureId);

    if (!nextVisible) {
      const childNote =
        childCount > 0
          ? ` Altındaki ${childCount} öğe de kullanıcıda görünmez (kendi ayarları saklanır).`
          : '';
      Alert.alert(
        'Gizle',
        `"${label}" tüm kullanıcılarda gizlenecek.${childNote} Devam edilsin mi?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Gizle',
            style: 'destructive',
            onPress: () => void applyToggle(featureId, nextVisible),
          },
        ],
      );
      return;
    }

    void applyToggle(featureId, nextVisible);
  };

  const stats = useMemo(() => {
    const total = APP_FEATURE_REGISTRY.length;
    const visible = APP_FEATURE_REGISTRY.filter((f) => isEffectivelyVisible(f.id, visibility)).length;
    return { total, visible, hidden: total - visible };
  }, [visibility]);

  const progress = stats.total > 0 ? stats.visible / stats.total : 0;
  const expandAll = search.trim().length > 0;
  const isSearching = search.trim().length > 0 || statusFilter !== 'all';

  const visibleInFilter = useCallback(
    (featureId: string) => nodeVisibleInFilter(featureId, visibility, search, statusFilter),
    [visibility, search, statusFilter],
  );

  const matchCount = useMemo(
    () =>
      APP_FEATURE_REGISTRY.filter(
        (f) => matchesSearch(f.id, search) && matchesStatus(f.id, statusFilter, visibility),
      ).length,
    [search, statusFilter, visibility],
  );

  const visibleGroups = useMemo(() => {
    return FEATURE_GROUPS.map((group) => {
      const roots = getRootFeaturesInGroup(group.id).filter((feature) => visibleInFilter(feature.id));
      const groupFeatures = APP_FEATURE_REGISTRY.filter((f) => f.group === group.id);
      const groupVisible = groupFeatures.filter((f) => isEffectivelyVisible(f.id, visibility)).length;
      return { ...group, roots, groupVisible, groupTotal: groupFeatures.length };
    }).filter((group) => group.roots.length > 0);
  }, [visibleInFilter, visibility]);

  return (
    <AdminShell
      title="Özellik Görünürlüğü"
      subtitle="Uygulamadaki sekmeleri, merkezleri ve alt özellikleri yönetin"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {!isReady ? (
        <AdminEmptyState loading />
      ) : (
        <>
          <View style={styles.searchBlock}>
            <AdminSearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Özellik / buton ara — örn. mesaj, favori, ödeme..."
            />
            <AdminFilterChip options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            {isSearching ? (
              <Text secondary variant="caption" style={styles.searchHint}>
                {matchCount} sonuç · aramayı temizlemek için kutudaki çarpıya dokunun
              </Text>
            ) : null}
          </View>

          {!isSearching ? (
            <>
              <GlassCard style={[styles.heroCard, { borderColor: `${colors.primary}44` }]}>
                <View style={styles.heroHeader}>
                  <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="eye-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.heroTexts}>
                    <Text variant="label">Genel durum</Text>
                    <Text secondary variant="caption">
                      Kapalı özellikler tüm kullanıcılarda gizlenir; üst özellik kapanınca alt öğeler de görünmez.
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBlock}>
                  <View style={styles.progressMeta}>
                    <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                      {stats.visible}/{stats.total} görünür
                    </Text>
                    <Text secondary variant="caption">
                      {stats.hidden} gizli
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: `${colors.success}18` }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.success, width: `${Math.round(progress * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              </GlassCard>

              <GlassCard style={[styles.infoCard, { borderColor: `${colors.primary}22` }]}>
                <View style={styles.infoRow}>
                  <Ionicons name="layers-outline" size={20} color={colors.primary} />
                  <View style={styles.infoTexts}>
                    <Text variant="caption" style={{ fontWeight: '600' }}>
                      Her özellik ayrı karttadır
                    </Text>
                    <Text secondary variant="caption">
                      Ana anahtar tüm özelliği kapatır. Alt ayarlar için karttaki &quot;Alt ayarları göster&quot;
                      düğmesine dokunun; sekmeler, bölümler ve alt özellikler ayrı gruplarda listelenir.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </>
          ) : null}

          {visibleGroups.length === 0 ? (
            <AdminEmptyState
              icon="search-outline"
              title="Sonuç bulunamadı"
              message="Arama veya filtreyi değiştirmeyi deneyin."
            />
          ) : (
            visibleGroups.map((group) => (
              <View key={group.id} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <AdminSectionHeader title={group.label} hint={GROUP_HINTS[group.id]} />
                  <View style={[styles.groupBadge, { backgroundColor: `${colors.primary}14` }]}>
                    <Ionicons name={GROUP_ICONS[group.id]} size={14} color={colors.primary} />
                    <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                      {group.groupVisible}/{group.groupTotal}
                    </Text>
                  </View>
                </View>

                <View style={styles.groupInner}>
                  {group.roots.map((feature) => (
                    <FeatureRootCard
                      key={feature.id}
                      feature={feature}
                      visibility={visibility}
                      savingId={savingId}
                      expandAll={expandAll}
                      onToggle={handleToggle}
                      visibleInFilter={visibleInFilter}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  searchBlock: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchHint: {
    paddingHorizontal: spacing.xs,
  },
  heroCard: {
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexts: { flex: 1, minWidth: 0, gap: 2 },
  progressBlock: { gap: spacing.xs },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    minWidth: 6,
  },
  infoCard: {
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoTexts: { flex: 1, minWidth: 0, gap: 2 },
  groupSection: { gap: spacing.xs, marginBottom: spacing.md },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  groupInner: {
    gap: spacing.md,
  },
});
