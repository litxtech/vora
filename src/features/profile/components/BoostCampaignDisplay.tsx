import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BoostCampaignDisplayProps = {
  message: string;
  compact?: boolean;
};

export function BoostCampaignDisplay({ message, compact = false }: BoostCampaignDisplayProps) {
  const { colors } = useTheme();
  const trimmed = message.trim();
  if (!trimmed) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <LinearGradient
        colors={[`${colors.primary}30`, `${colors.primary}08`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderColor: `${colors.primary}44` }]}
      >
        <View style={styles.labelRow}>
          <Ionicons name="sparkles" size={compact ? 10 : 11} color={colors.primary} />
          <Text
            variant="caption"
            style={[
              styles.label,
              compact && styles.labelCompact,
              { color: colors.primary },
            ]}
          >
            VİTRİN
          </Text>
        </View>
        <Text
          style={[
            styles.headline,
            compact && styles.headlineCompact,
            { color: colors.text },
          ]}
          numberOfLines={compact ? 2 : 3}
        >
          {trimmed}
        </Text>
      </LinearGradient>
    </View>
  );
}

const displayFont = Platform.select({
  ios: 'Avenir Next Demi Bold',
  android: 'sans-serif-medium',
  default: undefined,
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  wrapCompact: {
    marginTop: 0,
    flex: 1,
  },
  gradient: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  labelCompact: {
    fontSize: 9,
    letterSpacing: 2,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: displayFont,
  },
  headlineCompact: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
});
