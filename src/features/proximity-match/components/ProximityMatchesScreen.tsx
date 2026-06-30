import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { ProximityBackgroundLocationSetting } from '@/features/proximity-match/components/ProximityBackgroundLocationSetting';
import { ProximityMatchCard, ProximityMatchRowSeparator } from '@/features/proximity-match/components/ProximityMatchCard';
import { fetchProximityMatches } from '@/features/proximity-match/services/proximityMatch';
import {
  proximityMatchIneligibilityMessage,
  resolveProximityMatchEligibility,
} from '@/features/proximity-match/services/proximityMatchEligibility';
import type { ProximityMatchedUser } from '@/features/proximity-match/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function ProximityMatchesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const eligibility = resolveProximityMatchEligibility(profile, !!user?.id);
  const [matches, setMatches] = useState<ProximityMatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchProximityMatches();
    setMatches(data);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AuthHeader title="Eşleşilenler" subtitle="Yakınlıkla eşleştiklerin" />

        {eligibility.eligible ? <ProximityBackgroundLocationSetting /> : null}

        {!eligibility.eligible && eligibility.reason ? (
          <View style={[styles.hintCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text variant="caption" style={styles.hintText}>
              {proximityMatchIneligibilityMessage(eligibility.reason)}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.userId}
            ItemSeparatorComponent={ProximityMatchRowSeparator}
            contentContainerStyle={[
              styles.list,
              matches.length === 0 && styles.listEmpty,
              { paddingBottom: insets.bottom + spacing.lg },
            ]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="label">Henüz eşleşme yok</Text>
                <Text secondary variant="caption" style={styles.emptyHint}>
                  500 m yakınında bir Vora kullanıcısı olduğunda ekranda eşleşme kartı görünür. Arka plan
                  eşleşmesi isteğe bağlıdır; yukarıdaki anahtardan açabilirsiniz.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ProximityMatchCard
                match={item}
                onPress={() => router.push(`/user/${item.userId}` as never)}
              />
            )}
          />
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  emptyHint: {
    textAlign: 'center',
    lineHeight: 18,
  },
  hintCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  hintText: {
    lineHeight: 18,
  },
});
