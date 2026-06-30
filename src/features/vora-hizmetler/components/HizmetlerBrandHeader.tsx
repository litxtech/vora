import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT, VORA_HIZMETLER_GRADIENT } from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetlerBrandHeaderProps = {
  subtitle?: string;
  compact?: boolean;
};

export function HizmetlerBrandHeader({
  subtitle = "Türkiye'nin Yerel Hizmet Platformu",
  compact = false,
}: HizmetlerBrandHeaderProps) {
  const { colors } = useTheme();

  if (compact) {
    return (
      <View style={[styles.compactRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <LinearGradient colors={[...VORA_HIZMETLER_GRADIENT]} style={styles.compactBadge}>
          <Ionicons name="construct" size={18} color="#fff" />
        </LinearGradient>
        <Text variant="label">Vora Hizmetler</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...VORA_HIZMETLER_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}
    >
      <View style={styles.bannerGlow} />
      <View style={styles.bannerTop}>
        <View style={styles.bannerIcon}>
          <Ionicons name="construct" size={26} color="#fff" />
        </View>
        <View style={styles.bannerText}>
          <Text variant="h2" style={styles.bannerTitle}>
            Vora Hizmetler
          </Text>
          <Text variant="caption" style={styles.bannerSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.featureRow}>
        <FeaturePill icon="briefcase-outline" label="İş İlanları" />
        <FeaturePill icon="construct-outline" label="Ustalar" />
        <FeaturePill icon="shield-checkmark-outline" label="Güvenli Ödeme" />
      </View>
    </LinearGradient>
  );
}

function FeaturePill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.featurePill}>
      <Ionicons name={icon} size={12} color="#fff" />
      <Text variant="caption" style={styles.featurePillText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: VORA_HIZMETLER_ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  bannerGlow: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: '#fff',
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  featurePillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  compactBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
