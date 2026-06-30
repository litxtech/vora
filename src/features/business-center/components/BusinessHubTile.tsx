import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  accent: string;
  onPress: () => void;
  wide?: boolean;
};

export function BusinessHubTile({ icon, title, detail, accent, onPress, wide = false }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        wide && styles.tileWide,
        {
          borderColor: `${accent}35`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <LinearGradient
        colors={[`${accent}CC`, `${accent}55`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.glow}
        pointerEvents="none"
      />
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text variant="label" style={{ fontWeight: '800' }} numberOfLines={1}>
        {title}
      </Text>
      <Text secondary variant="caption" numberOfLines={2} style={{ lineHeight: 16 }}>
        {detail}
      </Text>
      <View style={styles.cta}>
        <Text variant="caption" style={{ color: accent, fontWeight: '700', fontSize: 11 }}>
          Aç
        </Text>
        <Ionicons name="arrow-forward" size={12} color={accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48.5%',
    flexGrow: 1,
    minHeight: 128,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  tileWide: { width: '100%' },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' },
});
