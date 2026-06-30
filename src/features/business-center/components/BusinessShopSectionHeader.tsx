import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BUSINESS_GRADIENT, shopAccentColor } from '@/features/business-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  title?: string;
  itemCount?: number;
  accent?: string | null;
  showLive?: boolean;
};

export function BusinessShopSectionHeader({
  title = 'Mağaza vitrini',
  itemCount,
  accent,
  showLive = true,
}: Props) {
  const { colors } = useTheme();
  const tone = shopAccentColor(accent);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[tone, BUSINESS_GRADIENT[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.titleAccent}
      />
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Ionicons name="bag-handle-outline" size={16} color={tone} />
          <Text variant="label" style={{ color: tone, fontWeight: '800' }}>
            {title}
          </Text>
        </View>
        {showLive ? (
          <View style={[styles.livePill, { borderColor: `${tone}44`, backgroundColor: `${tone}14` }]}>
            <View style={[styles.liveDot, { backgroundColor: '#4CAF50' }]} />
            <Text variant="caption" style={{ color: tone, fontWeight: '800', fontSize: 10 }}>
              Canlı
            </Text>
          </View>
        ) : null}
        {itemCount != null && itemCount > 0 ? (
          <Text secondary variant="caption" style={{ color: colors.textMuted }}>
            {itemCount} vitrin
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  titleAccent: { height: 3, width: 48, borderRadius: radius.full },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  titleCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
});
