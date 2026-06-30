import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import {
  fetchSavedSearches,
  removeSavedSearch,
  toggleSavedSearchNotify,
  type PersonnelSavedSearch,
} from '@/features/personnel-center/services/savedSearchData';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function SavedSearchesPanel() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [searches, setSearches] = useState<PersonnelSavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSearches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await fetchSavedSearches(user.id);
    setSearches(rows);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleNotify = async (search: PersonnelSavedSearch) => {
    if (!user?.id) return;
    const next = !search.notifyEnabled;
    const result = await toggleSavedSearchNotify(user.id, search.id, next);
    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }
    setSearches((prev) =>
      prev.map((row) => (row.id === search.id ? { ...row, notifyEnabled: next } : row)),
    );
  };

  const handleRemove = (search: PersonnelSavedSearch) => {
    if (!user?.id) return;
    Alert.alert('Aramayı sil', `"${search.label}" kaydını silmek istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const result = await removeSavedSearch(user.id, search.id);
          if (result.error) Alert.alert('Hata', result.error);
          else setSearches((prev) => prev.filter((row) => row.id !== search.id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <GlassCard>
        <Text secondary>Yükleniyor…</Text>
      </GlassCard>
    );
  }

  if (!searches.length) {
    return (
      <GlassCard style={styles.empty}>
        <Ionicons name="bookmark-outline" size={28} color={colors.textMuted} />
        <Text secondary>Kayıtlı aramanız yok. Arama yaptıktan sonra kaydedebilirsiniz.</Text>
      </GlassCard>
    );
  }

  return (
    <View style={styles.list}>
      {searches.map((search) => (
        <GlassCard key={search.id} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Ionicons name="bookmark" size={16} color={PERSONNEL_ACCENT} />
              <Text variant="label" numberOfLines={1}>
                {search.label}
              </Text>
            </View>
            <Pressable onPress={() => handleRemove(search)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>

          <Text secondary variant="caption" numberOfLines={2}>
            {[
              search.listingType === 'job' ? 'İş ilanı' : search.listingType === 'staff' ? 'Personel talebi' : 'Tüm ilanlar',
              search.district,
              search.urgentOnly ? 'Acil' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>

          <View style={styles.notifyRow}>
            <Text variant="caption">Yeni ilan bildirimi</Text>
            <Switch
              value={search.notifyEnabled}
              onValueChange={() => void handleToggleNotify(search)}
              trackColor={{ true: PERSONNEL_ACCENT, false: colors.border }}
            />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { gap: spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});
