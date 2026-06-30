import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  serviceProviderDetailPath,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import {
  fetchProviderByUserId,
  setProviderShowOnProfile,
} from '@/features/vora-hizmetler/services/providerData';
import type { ServiceProviderProfile } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProviderProfileSectionProps = {
  userId: string;
  isOwnProfile?: boolean;
};

function buildSubtitle(
  profession: string,
  rating: number,
  reviewCount: number,
  completedJobs: number,
): string {
  const parts: string[] = [profession];
  if (rating > 0) parts.push(`${rating.toFixed(1)} ★`);
  if (reviewCount > 0) parts.push(`${reviewCount} yorum`);
  if (completedJobs > 0) parts.push(`${completedJobs} iş`);
  return parts.join(' · ');
}

export function ProviderProfileSection({ userId, isOwnProfile = false }: ProviderProfileSectionProps) {
  const { colors } = useTheme();
  const [provider, setProvider] = useState<ServiceProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const loadProvider = useCallback(async () => {
    if (!userId) {
      setProvider(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await fetchProviderByUserId(userId);
    setProvider(result.provider);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadProvider();
  }, [loadProvider]);

  const handleVisibilityChange = useCallback(
    async (next: boolean) => {
      if (!provider) return;
      setSavingVisibility(true);
      const result = await setProviderShowOnProfile(provider.id, next);
      setSavingVisibility(false);
      if (result.error) return;
      await loadProvider();
    },
    [provider, loadProvider],
  );

  if (loading || !provider) return null;
  if (!isOwnProfile && !provider.showOnProfile) return null;

  const openProviderProfile = () => {
    router.push(serviceProviderDetailPath(provider.id) as never);
  };

  const title = isOwnProfile ? 'Usta profilim' : 'Usta profili';
  const subtitle = buildSubtitle(
    provider.profession,
    provider.rating,
    provider.reviewCount,
    provider.completedJobs,
  );

  if (isOwnProfile && !provider.showOnProfile) {
    return (
      <View style={[styles.hiddenCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="eye-off-outline" size={18} color={colors.textSecondary} />
        <View style={styles.hiddenCopy}>
          <Text variant="label">Usta profiliniz gizli</Text>
          <Text secondary variant="caption">
            Ziyaretçiler sosyal profilinizde usta kartınızı görmez. Vora Hizmetler ve keşfet listesi etkilenmez.
          </Text>
        </View>
        <Switch
          value={false}
          onValueChange={() => void handleVisibilityChange(true)}
          disabled={savingVisibility}
          trackColor={{ true: VORA_HIZMETLER_ACCENT, false: colors.border }}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openProviderProfile}
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: `${VORA_HIZMETLER_ACCENT}55`,
            backgroundColor: `${VORA_HIZMETLER_ACCENT}12`,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${VORA_HIZMETLER_ACCENT}22` }]}>
          <Ionicons name="construct-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
        </View>
        <View style={styles.copy}>
          <Text variant="label" style={{ color: colors.text, fontWeight: '800' }}>
            {title}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={VORA_HIZMETLER_ACCENT} />
      </Pressable>

      {isOwnProfile ? (
        <>
          <Pressable
            onPress={() => router.push('/vora-hizmetler/provider-portfolio' as never)}
            style={({ pressed }) => [
              styles.editBtn,
              {
                borderColor: VORA_HIZMETLER_ACCENT,
                backgroundColor: `${VORA_HIZMETLER_ACCENT}14`,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Ionicons name="images-outline" size={16} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '800' }}>
              İş ekle
            </Text>
          </Pressable>

          <View style={[styles.visibilityRow, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
            <View style={styles.visibilityCopy}>
              <Text variant="caption" style={{ fontWeight: '700' }}>
                Profilde göster
              </Text>
              <Text secondary variant="caption" numberOfLines={2}>
                Kapatırsanız ziyaretçiler usta kartınızı burada görmez
              </Text>
            </View>
            <Switch
              value={provider.showOnProfile}
              onValueChange={(value) => void handleVisibilityChange(value)}
              disabled={savingVisibility}
              trackColor={{ true: VORA_HIZMETLER_ACCENT, false: colors.border }}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  editBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  visibilityCopy: {
    flex: 1,
    gap: 2,
  },
  hiddenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  hiddenCopy: {
    flex: 1,
    gap: 2,
  },
});
