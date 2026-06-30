import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HizmetManageMenuCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
  accent?: string;
  gradient?: readonly [string, string];
  index?: number;
};

export function HizmetManageMenuCard({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  accent = '#0EA5E9',
  gradient = ['#0EA5E9', '#38BDF8'],
  index = 0,
}: HizmetManageMenuCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).springify().damping(16)}
      style={styles.cell}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 280 });
        }}
        style={[styles.card, animatedStyle, { borderColor: `${accent}35`, backgroundColor: colors.surfaceElevated }]}
      >
        <LinearGradient colors={[`${accent}16`, 'transparent']} style={styles.cardGlow} />
        <LinearGradient colors={[...gradient]} style={styles.iconRing}>
          <Ionicons name={icon} size={22} color="#fff" />
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="label" numberOfLines={1}>
              {title}
            </Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: `${accent}20` }]}>
                <Text variant="caption" style={{ color: accent, fontWeight: '800', fontSize: 10 }}>
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
          <Text secondary variant="caption" numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>

        <View style={[styles.chevron, { backgroundColor: `${accent}14` }]}>
          <Ionicons name="arrow-forward" size={14} color={accent} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: '50%',
    padding: spacing.xs,
  },
  card: {
    minHeight: 132,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  subtitle: {
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  chevron: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
