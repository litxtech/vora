import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { APP_INTRO_SLIDE_COUNT, APP_INTRO_SLIDES } from '@/features/app-intro/constants';
import { fetchAppIntroSlidesForClient } from '@/features/app-intro/services/adminAppIntro';
import { markAppIntroCompleted } from '@/features/app-intro/services/storage';
import type { IntroSlide } from '@/features/app-intro/types';
import { resolveBootTarget } from '@/features/auth/hooks/useBootNavigation';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function IntroSlideCard({ slide, isDark }: { slide: IntroSlide; isDark: boolean }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideInner}>
        <LinearGradient
          colors={[`${slide.accent}30`, `${slide.accent}08`]}
          style={[styles.iconRing, { borderColor: `${slide.accent}44` }]}
        >
          <View style={[styles.iconCore, { backgroundColor: `${slide.accent}22` }]}>
            <Ionicons name={slide.icon} size={52} color={slide.accent} />
          </View>
        </LinearGradient>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
          <Text variant="label" style={{ color: slide.accent, textAlign: 'center' }}>
            {slide.subtitle}
          </Text>
          <Text
            secondary
            style={[
              styles.description,
              { color: isDark ? colors.textSecondary : colors.textMuted },
            ]}
          >
            {slide.description}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function AppIntroScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const listRef = useRef<FlatList<IntroSlide>>(null);
  const [slides, setSlides] = useState<IntroSlide[]>(APP_INTRO_SLIDES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    void fetchAppIntroSlidesForClient().then(setSlides);
  }, []);

  const slideCount = slides.length || APP_INTRO_SLIDE_COUNT;
  const isLastSlide = activeIndex === slideCount - 1;

  const finishIntro = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);

    await markAppIntroCompleted();

    if (user) {
      router.replace(resolveBootTarget(user, profile) as never);
    } else {
      router.replace('/(welcome)/lobby');
    }
  }, [finishing, user, profile]);

  const goNext = useCallback(() => {
    if (isLastSlide) {
      void finishIntro();
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  }, [activeIndex, isLastSlide, finishIntro]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;
    if (index != null) setActiveIndex(index);
  }).current;

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (index !== activeIndex) {
        void Haptics.selectionAsync();
        setActiveIndex(index);
      }
    },
    [activeIndex],
  );

  return (
    <GradientBackground>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.stepBadge}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              {activeIndex + 1} / {slideCount}
            </Text>
          </View>
          <Pressable
            onPress={() => void finishIntro()}
            hitSlop={12}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
          >
            <Text variant="label" style={{ color: colors.textSecondary }}>
              Atla
            </Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IntroSlideCard slide={item} isDark={isDark} />}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={styles.list}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((slide, index) => {
              const active = index === activeIndex;
              return (
                <View
                  key={slide.id}
                  style={[
                    styles.dot,
                    {
                      width: active ? 22 : 8,
                      backgroundColor: active ? slide.accent : colors.border,
                      opacity: active ? 1 : 0.45,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Button
            title={isLastSlide ? 'Başla' : 'Devam Et'}
            loading={finishing}
            onPress={goNext}
            style={styles.cta}
          />
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  skipBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
  },
  slideInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  iconRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 320,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 10,
  },
  dot: {
    height: 8,
    borderRadius: radius.full,
  },
  cta: {
    marginTop: spacing.xs,
  },
});
