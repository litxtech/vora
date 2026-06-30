import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminQuickAlertProps = {
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  tone?: 'warning' | 'danger' | 'primary';
};

export function AdminQuickAlert({ label, count, icon, href, tone = 'warning' }: AdminQuickAlertProps) {
  const { colors } = useTheme();

  const toneColor =
    tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.warning;

  if (count <= 0) return null;

  return (
    <Pressable onPress={() => router.push(href as never)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={[`${toneColor}28`, `${toneColor}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.card, { borderColor: `${toneColor}44` }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${toneColor}22` }]}>
          <Ionicons name={icon} size={15} color={toneColor} />
        </View>
        <View style={styles.texts}>
          <Text variant="caption" style={{ color: toneColor, fontWeight: '700', fontSize: 12 }}>
            {count} {label}
          </Text>
          <Text secondary variant="caption" style={{ fontSize: 10 }}>
            İncele
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={toneColor} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 1 },
});
