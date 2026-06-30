import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function statGradient(color: string): readonly [string, string] {
  return [`${color}EE`, `${color}AA`] as const;
}

export type HizmetStatTileProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  compact?: boolean;
  index?: number;
};

export function HizmetStatTile({
  label,
  value,
  icon,
  color = VORA_HIZMETLER_ACCENT,
  compact = false,
  index = 0,
}: HizmetStatTileProps) {
  const { colors } = useTheme();

  const iconRing = (
    <LinearGradient colors={statGradient(color)} style={[styles.iconRing, compact && styles.iconRingCompact]}>
      <Ionicons name={icon} size={compact ? 16 : 20} color="#fff" />
    </LinearGradient>
  );

  const valueText = (
    <Text
      variant="label"
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={[styles.value, { color }, compact && styles.valueCompact]}
    >
      {value}
    </Text>
  );

  const labelText = (
    <Text secondary variant="caption" numberOfLines={2} style={[styles.label, compact && styles.labelCompact]}>
      {label}
    </Text>
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 45).springify().damping(18)}
      style={[styles.tileWrap, compact && styles.tileWrapCompact]}
    >
      <View
        style={[
          styles.tile,
          compact ? styles.tileHorizontal : styles.tileVertical,
          { borderColor: `${color}35`, backgroundColor: colors.surfaceElevated },
        ]}
      >
        <LinearGradient colors={[`${color}18`, `${color}04`]} style={styles.tileBg} />
        <View style={[styles.tileAccent, { backgroundColor: color }]} />

        {compact ? (
          <>
            {iconRing}
            <View style={styles.tileBodyHorizontal}>
              {valueText}
              {labelText}
            </View>
          </>
        ) : (
          <>
            {iconRing}
            <View style={styles.tileBodyVertical}>
              {valueText}
              {labelText}
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

export type HizmetStatChipProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  muted?: boolean;
};

export function HizmetStatChip({
  icon,
  label,
  color = VORA_HIZMETLER_ACCENT,
  muted,
}: HizmetStatChipProps) {
  const { colors } = useTheme();
  const tone = muted ? colors.textSecondary : color;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: muted ? `${colors.textSecondary}10` : `${color}14`,
          borderColor: muted ? colors.border : `${color}30`,
        },
      ]}
    >
      <View style={[styles.chipIcon, { backgroundColor: muted ? `${colors.textSecondary}16` : `${color}22` }]}>
        <Ionicons name={icon} size={11} color={tone} />
      </View>
      <Text variant="caption" style={{ color: muted ? colors.textSecondary : colors.text, fontWeight: '700', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

export function HizmetStatsGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function HizmetStatsRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tileWrap: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
  },
  tileWrapCompact: {
    width: undefined,
    flex: 1,
    flexBasis: '30%',
    minWidth: 100,
  },
  tile: {
    borderRadius: radius.xl,
    borderWidth: 1,
    position: 'relative',
  },
  tileVertical: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    minHeight: 108,
  },
  tileHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 76,
  },
  tileBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
  },
  tileAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  iconRing: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  iconRingCompact: {
    width: 34,
    height: 34,
    borderRadius: 11,
    marginLeft: 4,
  },
  tileBodyVertical: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  tileBodyHorizontal: {
    flex: 1,
    gap: 2,
    paddingVertical: 2,
    minWidth: 0,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
    textAlign: 'center',
  },
  valueCompact: {
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'left',
  },
  label: {
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelCompact: {
    textAlign: 'left',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
