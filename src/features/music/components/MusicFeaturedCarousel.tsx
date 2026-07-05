import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Text } from '@/components/ui/Text';
import type { AudioCatalogItem } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicFeaturedCarouselProps = {
  items: AudioCatalogItem[];
  playingId: string | null;
  onPress: (item: AudioCatalogItem) => void;
  onPreview: (item: AudioCatalogItem) => void;
};

const CARD_WIDTH = 132;
const CARD_HEIGHT = 168;

export function MusicFeaturedCarousel({
  items,
  playingId,
  onPress,
  onPreview,
}: MusicFeaturedCarouselProps) {
  const { colors } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text variant="label" style={styles.title}>
          Öne çıkanlar
        </Text>
        <Text variant="caption" secondary>
          Trend parçalar
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <FeaturedCard
            key={`${item.source}:${item.id}`}
            item={item}
            playing={playingId === item.id}
            colors={colors}
            onPress={() => onPress(item)}
            onPreview={() => onPreview(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FeaturedCard({
  item,
  playing,
  colors,
  onPress,
  onPreview,
}: {
  item: AudioCatalogItem;
  playing: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
  onPreview: () => void;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (playing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 5200, easing: Easing.linear }),
        -1,
        false,
      );
      return;
    }
    cancelAnimation(rotation);
    rotation.value = withTiming(0, { duration: 180 });
  }, [playing, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: `${colors.textMuted}10` }]}
    >
      <View style={styles.artWrap}>
        <Animated.View style={[styles.artSpin, playing && spinStyle]}>
          {item.coverUrl ? (
            <Image
              source={{ uri: item.coverUrl }}
              style={[styles.art, playing && styles.artPlaying]}
            />
          ) : (
            <View style={[styles.art, styles.artFallback, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="musical-note" size={28} color={colors.primary} />
            </View>
          )}
        </Animated.View>
        <Pressable
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          onPress={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          hitSlop={8}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={16} color="#fff" />
        </Pressable>
        {item.source === 'sound' ? (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              Ses
            </Text>
          </View>
        ) : null}
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View style={styles.meta}>
        <Text variant="caption" numberOfLines={2} style={styles.trackTitle}>
          {item.displayTitle}
        </Text>
        <Text variant="caption" numberOfLines={1} style={styles.artist}>
          {item.artist || 'Bilinmeyen sanatçı'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  title: {
    fontWeight: '800',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  artWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artSpin: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  artPlaying: {
    borderRadius: CARD_WIDTH / 2,
    transform: [{ scale: 0.82 }],
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  meta: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    gap: 2,
  },
  trackTitle: {
    color: '#fff',
    fontWeight: '700',
    lineHeight: 16,
  },
  artist: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
  },
});
