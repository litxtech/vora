import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';

type StoryLocationBadgeProps = {
  label: string;
  subtitle?: string | null;
  onPress?: () => void;
  /** Müzik rozeti ile çakışmayı önlemek için sabit konum modunda yukarı kay */
  stacked?: boolean;
  /** Önizleme / düzenleme sırasında sürükleme ipucu */
  draggable?: boolean;
  /** Sürüklenebilir editör içinde — mutlak konumlandırma kapalı */
  inline?: boolean;
};

/** Sol alt — cam efektli konum rozeti */
export function StoryLocationBadge({
  label,
  subtitle,
  onPress,
  stacked = false,
  draggable = false,
  inline = false,
}: StoryLocationBadgeProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[inline ? styles.inlineWrap : styles.wrap, !inline && stacked && styles.wrapStacked]}
      hitSlop={6}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={[label, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={draggable ? 'Konum kartını taşımak için sürükle' : undefined}
    >
      <View style={styles.shadow}>
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.inner}>
            <View style={styles.pin}>
              <LinearGradient
                colors={['#ff2d55', '#ff7a00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pinGradient}
              >
                <Ionicons name="location" size={14} color="#fff" />
              </LinearGradient>
            </View>
            <View style={styles.meta}>
              <Text variant="caption" style={styles.title} numberOfLines={1}>
                {label}
              </Text>
              {subtitle ? (
                <Text variant="caption" style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {draggable ? (
              <Ionicons name="move-outline" size={13} color="rgba(255,255,255,0.55)" />
            ) : onPress ? (
              <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.55)" />
            ) : null}
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inlineWrap: {
    maxWidth: 260,
  },
  wrap: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.lg,
    zIndex: 10,
    maxWidth: '78%',
  },
  wrapStacked: {
    bottom: spacing.lg + 48,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientBorder: {
    borderRadius: radius.full,
    padding: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: radius.full - 1,
    backgroundColor: 'rgba(8,8,14,0.78)',
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pinGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});
