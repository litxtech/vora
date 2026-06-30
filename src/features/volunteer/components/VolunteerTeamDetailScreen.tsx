import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { HELP_CENTER_ACCENT } from '@/features/help/constants';
import { HELP_FEATURE } from '@/features/help/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VOLUNTEER_CATEGORIES } from '@/features/volunteer/constants';
import {
  fetchVolunteerTeamById,
  joinVolunteerTeam,
  leaveVolunteerTeam,
  type VolunteerTeamDetail,
} from '@/features/volunteer/services/volunteerData';
import { regionNameById } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function VolunteerTeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const showJoin = useFeatureVisible(HELP_FEATURE.detailJoin);
  const showLeave = useFeatureVisible(HELP_FEATURE.detailLeave);

  const [team, setTeam] = useState<VolunteerTeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setTeam(await fetchVolunteerTeamById(id, user?.id ?? null));
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJoin = async () => {
    if (!(await requireAuth('Ekibe katılma')) || !user?.id || !team) return;

    setActing(true);
    const { error } = await joinVolunteerTeam(team.id, user.id);
    setActing(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Katıldınız', `${team.name} ekibine üye oldunuz.`);
    void load();
  };

  const handleLeave = () => {
    if (!user?.id || !team) return;

    Alert.alert('Ekipten ayrıl', `${team.name} ekibinden ayrılmak istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          const { error } = await leaveVolunteerTeam(team.id, user.id);
          setActing(false);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }
          void load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={HELP_CENTER_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (!team) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <ScreenBackButton />
          <GlassCard style={styles.empty}>
            <Text secondary>Ekip bulunamadı.</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const cat = VOLUNTEER_CATEGORIES[team.category];

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <ScreenBackButton />

        <GlassCard style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={32} color={cat.color} />
          </View>
          <View style={styles.heroText}>
            <Text variant="h2">{team.name}</Text>
            <Text variant="caption" style={{ color: cat.color }}>{cat.label}</Text>
            {team.regionId ? (
              <Text secondary variant="caption">
                {regionNameById(team.regionId) ?? team.regionId}
              </Text>
            ) : null}
          </View>
        </GlassCard>

        <GlassCard style={styles.statRow}>
          <Ionicons name="people" size={20} color={cat.color} />
          <Text variant="label">{team.memberCount} üye</Text>
        </GlassCard>

        {team.description ? (
          <GlassCard style={styles.section}>
            <Text variant="label">Hakkında</Text>
            <Text secondary>{team.description}</Text>
          </GlassCard>
        ) : null}

        {team.isMember && showLeave ? (
          <Button title="Ekipten Ayrıl" variant="outline" onPress={handleLeave} loading={acting} />
        ) : !team.isMember && showJoin ? (
          <Button title="Ekibe Katıl" onPress={() => void handleJoin()} loading={acting} />
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: spacing.xl, alignItems: 'center' },
  hero: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: spacing.xs },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.sm },
});
