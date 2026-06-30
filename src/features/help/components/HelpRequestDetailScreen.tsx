import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import {
  HELP_CATEGORIES,
  HELP_CENTER_ACCENT,
  URGENCY_COLORS,
  type HelpRequest,
} from '@/features/help/constants';
import { fetchHelpRequestById, resolveHelpRequest } from '@/features/help/services/helpData';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { HELP_FEATURE } from '@/features/help/featureFlags';
import { useTheme } from '@/providers/ThemeProvider';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HelpRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const showDetailContact = useFeatureVisible(HELP_FEATURE.detailContact);
  const showDetailResolve = useFeatureVisible(HELP_FEATURE.detailResolve);

  const [item, setItem] = useState<HelpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setItem(await fetchHelpRequestById(id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isAuthor = user?.id && item?.authorId === user.id;

  const handleResolve = () => {
    if (!user?.id || !item) return;
    Alert.alert('Talebi kapat', 'Bu yardım talebi çözüldü olarak işaretlensin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çözüldü',
        onPress: async () => {
          setResolving(true);
          const { error } = await resolveHelpRequest(item.id, user.id);
          setResolving(false);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }
          router.back();
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

  if (!item) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <ScreenBackButton />
          <GlassCard style={styles.empty}>
            <Text secondary>Talep bulunamadı veya kaldırılmış.</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const cat = HELP_CATEGORIES[item.category];
  const urgencyColor = URGENCY_COLORS[item.urgency];

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <ScreenBackButton />

        <GlassCard style={[styles.hero, { borderLeftWidth: 4, borderLeftColor: urgencyColor }]}>
          <View style={[styles.icon, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={28} color={cat.color} />
          </View>
          <View style={styles.heroText}>
            <Text variant="h2">{item.title}</Text>
            <Text variant="caption" style={{ color: cat.color }}>{cat.label}</Text>
            <Text secondary variant="caption">{formatDate(item.createdAt)}</Text>
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text variant="label">Açıklama</Text>
          <Text secondary>{item.description}</Text>
        </GlassCard>

        {item.contactInfo && showDetailContact ? (
          <Pressable onPress={() => void openUrl(`tel:${item.contactInfo}`)}>
            <GlassCard style={styles.contactCard}>
              <Ionicons name="call" size={22} color={HELP_CENTER_ACCENT} />
              <View style={styles.contactText}>
                <Text variant="label">İletişim</Text>
                <Text style={{ color: HELP_CENTER_ACCENT }}>{item.contactInfo}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </GlassCard>
          </Pressable>
        ) : null}

        {isAuthor && showDetailResolve ? (
          <Button
            title="Çözüldü Olarak İşaretle"
            variant="outline"
            onPress={handleResolve}
            loading={resolving}
          />
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
  icon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.sm },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contactText: { flex: 1, gap: 2 },
});
