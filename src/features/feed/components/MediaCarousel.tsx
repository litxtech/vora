import { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_WIDTH = SCREEN_WIDTH - spacing.md * 2;

type MediaCarouselProps = {
  urls: string[];
};

export function MediaCarousel({ urls }: MediaCarouselProps) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);

  if (urls.length === 0) return null;

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
          setIndex(next);
        }}
      >
        {urls.map((url, i) => (
          <Image
            key={`${url}-${i}`}
            source={{ uri: url }}
            style={[styles.image, { backgroundColor: colors.surfaceElevated }]}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {urls.length > 1 ? (
        <View style={styles.dots}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>
      ) : null}
      {urls.length > 1 ? (
        <View style={[styles.counter, { backgroundColor: colors.overlay }]}>
          <Text variant="caption" style={{ color: '#fff' }}>
            {index + 1}/{urls.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: CAROUSEL_WIDTH,
    height: CAROUSEL_WIDTH * 0.75,
    borderRadius: radius.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
