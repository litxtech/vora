import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { PLATFORM_GUIDE_CATEGORY_META } from '@/features/platform-guide/constants';
import { fetchPlatformGuideBySlug } from '@/features/platform-guide/services/platformGuideData';
import type { PlatformGuideDetail } from '@/features/platform-guide/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function GuideVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });

  return (
    <View style={styles.mediaWrap}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
    </View>
  );
}

export function PlatformGuideDetailScreen() {
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [guide, setGuide] = useState<PlatformGuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const result = await fetchPlatformGuideBySlug(slug);
      setGuide(result.data);
      setError(result.error);
      setLoading(false);
    })();
  }, [slug]);

  const meta = guide
    ? PLATFORM_GUIDE_CATEGORY_META[guide.category] ?? PLATFORM_GUIDE_CATEGORY_META.general
    : null;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader
          title={guide?.title ?? 'Rehber'}
          subtitle={guide?.summary ?? meta?.label}
          showBack
        />

        {loading ? (
          <GlassCard>
            <Text secondary variant="caption">
              Yükleniyor…
            </Text>
          </GlassCard>
        ) : error || !guide ? (
          <GlassCard>
            <Text variant="label">Rehber bulunamadı</Text>
            <Text secondary variant="caption">
              {error ?? 'Bu içerik kaldırılmış veya henüz yayınlanmamış olabilir.'}
            </Text>
          </GlassCard>
        ) : (
          <>
            {guide.imageUrl ? (
              <Image source={{ uri: guide.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : null}

            {guide.videoUrl ? <GuideVideo url={guide.videoUrl} /> : null}

            {guide.sections.map((section) => (
              <GlassCard key={section.heading || section.body.slice(0, 24)} style={styles.section}>
                {section.heading ? <Text variant="h3">{section.heading}</Text> : null}
                <Text secondary style={styles.body}>
                  {section.body}
                </Text>
              </GlassCard>
            ))}

            {guide.footerNote ? (
              <GlassCard style={[styles.section, styles.footer]}>
                <Text variant="label" style={{ color: colors.primary }}>
                  Not
                </Text>
                <Text secondary style={styles.body}>
                  {guide.footerNote}
                </Text>
              </GlassCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
  },
  mediaWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#00000044',
  },
  video: {
    width: '100%',
    height: 220,
  },
  section: { gap: spacing.sm },
  body: { lineHeight: 24 },
  footer: { borderStyle: 'dashed' },
});
