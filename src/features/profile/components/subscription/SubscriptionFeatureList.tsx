import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { PREMIUM_GOLD, PREMIUM_GOLD_DARK } from '@/features/profile/constants/premiumUi';
import { formatBoostRemaining, isProfileBoosted } from '@/features/profile/services/profileBoost';
import { PREMIUM_FEATURES } from '@/features/profile/services/premiumService';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SubscriptionFeatureListProps = {
  subscribed: boolean;
  profileBoostedUntil?: string | null;
};

function featureStatusLabel(
  featureId: string,
  subscribed: boolean,
  profileBoostedUntil?: string | null,
): string | null {
  if (!subscribed) return null;
  if (featureId === 'boost') {
    if (isProfileBoosted(profileBoostedUntil)) {
      return formatBoostRemaining(profileBoostedUntil) ?? 'Aktif';
    }
    return 'Kullanılabilir';
  }
  return 'Dahil';
}

export function SubscriptionFeatureList({
  subscribed,
  profileBoostedUntil,
}: SubscriptionFeatureListProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <Text variant="label">{subscribed ? 'Paketinizdeki özellikler' : 'Premium avantajları'}</Text>
      <Text secondary variant="caption">
        {subscribed
          ? 'Her özelliğe dokunarak ilgili ekrana gidebilirsiniz.'
          : 'Aylık ve yıllık paketlerde aynı özellikler sunulur.'}
      </Text>

      <View style={styles.list}>
        {PREMIUM_FEATURES.map((feature) => {
          const status = featureStatusLabel(feature.id, subscribed, profileBoostedUntil);
          const isBoostActive = feature.id === 'boost' && isProfileBoosted(profileBoostedUntil);

          return (
            <Pressable
              key={feature.id}
              onPress={() => router.push(feature.actionRoute as Href)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? `${colors.primary}08` : colors.surfaceElevated,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: subscribed
                      ? isBoostActive
                        ? `${colors.primary}22`
                        : `${colors.success}18`
                      : `${PREMIUM_GOLD}22`,
                  },
                ]}
              >
                <Ionicons
                  name={feature.icon}
                  size={18}
                  color={subscribed ? (isBoostActive ? colors.primary : colors.success) : PREMIUM_GOLD_DARK}
                />
              </View>

              <View style={styles.copy}>
                <Text variant="body" style={styles.featureTitle}>
                  {feature.text}
                </Text>
                <Text secondary variant="caption" numberOfLines={2}>
                  {feature.usageHint}
                </Text>
                {subscribed ? (
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '600', marginTop: 2 }}>
                    {feature.actionLabel} →
                  </Text>
                ) : null}
              </View>

              {status ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isBoostActive
                        ? `${colors.primary}18`
                        : `${colors.success}18`,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: isBoostActive ? colors.primary : colors.success,
                    }}
                  >
                    {status}
                  </Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

export function SubscriptionQuickLinks() {
  const { colors } = useTheme();

  const links = [
    { icon: 'person-outline' as const, label: 'Profilim', route: '/(tabs)/profile' as Href },
    { icon: 'rocket-outline' as const, label: 'Öne çıkar', route: '/ads' as Href },
    { icon: 'chatbubbles-outline' as const, label: 'Mesajlar', route: '/(tabs)/messages' as Href },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickScroll}
    >
      {links.map((link) => (
        <Pressable
          key={link.label}
          onPress={() => router.push(link.route)}
          style={({ pressed }) => [
            styles.quickChip,
            {
              borderColor: `${PREMIUM_GOLD}44`,
              backgroundColor: pressed ? `${PREMIUM_GOLD}18` : `${PREMIUM_GOLD}10`,
            },
          ]}
        >
          <Ionicons name={link.icon} size={16} color={PREMIUM_GOLD_DARK} />
          <Text variant="caption" style={{ fontWeight: '600', color: colors.text }}>
            {link.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  featureTitle: { fontWeight: '600' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    maxWidth: 88,
  },
  quickScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
