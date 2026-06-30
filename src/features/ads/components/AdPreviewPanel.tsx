import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AD_TYPES, adTypeMeta, ctaLabelText } from '@/features/ads/constants';
import type { AdCtaLabel, AdType } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type AdPreviewData = {
  title: string;
  description: string;
  adType: AdType;
  imageUri: string | null;
  ctaLabel: AdCtaLabel;
  advertiserName: string;
  advertiserAvatarUrl: string | null;
};

type AdPreviewPanelProps = {
  data: AdPreviewData;
};

export function AdPreviewPanel({ data }: AdPreviewPanelProps) {
  const { colors, isDark } = useTheme();
  const meta = adTypeMeta(data.adType);

  return (
    <View style={styles.wrap}>
      <View style={styles.phoneFrame}>
        <View style={[styles.phoneHeader, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
          <Text variant="caption" secondary>
            {meta.label} önizlemesi
          </Text>
        </View>

        <View style={[styles.phoneBody, { backgroundColor: colors.background }]}>
          {data.adType === 'feed' ? (
            <FeedAdPreview data={data} colors={colors} metaColor={meta.color} />
          ) : null}
          {data.adType === 'reels' ? (
            <ReelsAdPreview data={data} colors={colors} />
          ) : null}
          {data.adType === 'map' ? <MapAdPreview data={data} colors={colors} metaColor={meta.color} /> : null}
          {data.adType === 'business' ? (
            <BusinessAdPreview data={data} colors={colors} metaColor={meta.color} />
          ) : null}
        </View>
      </View>

      <View style={styles.legend}>
        {AD_TYPES.map((type) => (
          <View key={type.id} style={styles.legendItem}>
            <Ionicons
              name={type.icon}
              size={14}
              color={data.adType === type.id ? type.color : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{ color: data.adType === type.id ? type.color : colors.textMuted, fontSize: 10 }}
            >
              {type.label.replace(' Reklamı', '')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FeedAdPreview({
  data,
  colors,
  metaColor,
}: {
  data: AdPreviewData;
  colors: { border: string; textMuted: string; warning: string; primary: string };
  metaColor: string;
}) {
  return (
    <View style={[styles.feedCard, { borderColor: colors.border }]}>
      <View style={styles.feedHeader}>
        <AdvertiserAvatar name={data.advertiserName} avatarUrl={data.advertiserAvatarUrl} />
        <View style={styles.feedHeaderCopy}>
          <Text variant="label" numberOfLines={1}>
            {data.advertiserName}
          </Text>
          <View style={styles.sponsoredRow}>
            <Ionicons name="star" size={10} color={colors.warning} />
            <Text variant="caption" style={{ color: colors.warning, fontSize: 10 }}>
              Sponsorlu
            </Text>
          </View>
        </View>
      </View>

      <Text variant="body" numberOfLines={3}>
        {data.description || 'Reklam metniniz burada görünür.'}
      </Text>

      {data.imageUri ? (
        <Image source={{ uri: data.imageUri }} style={styles.feedImage} contentFit="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: `${metaColor}18`, borderColor: `${metaColor}33` }]}>
          <Ionicons name="image-outline" size={28} color={metaColor} />
          <Text secondary variant="caption">
            Görsel ekleyin
          </Text>
        </View>
      )}

      <View style={[styles.ctaButton, { backgroundColor: metaColor }]}>
        <Text variant="caption" style={styles.ctaText}>
          {ctaLabelText(data.ctaLabel)}
        </Text>
      </View>
    </View>
  );
}

function ReelsAdPreview({
  data,
  colors,
}: {
  data: AdPreviewData;
  colors: { text: string; warning: string };
}) {
  return (
    <View style={styles.reelsFrame}>
      {data.imageUri ? (
        <Image source={{ uri: data.imageUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.reelsPlaceholder]}>
          <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.7)" />
        </View>
      )}
      <View style={styles.reelsOverlay}>
        <View style={styles.sponsoredRow}>
          <Ionicons name="star" size={10} color={colors.warning} />
          <Text variant="caption" style={{ color: '#fff', fontSize: 10 }}>
            Sponsorlu Reels
          </Text>
        </View>
        <Text variant="label" style={{ color: '#fff' }} numberOfLines={1}>
          {data.title || 'Başlık'}
        </Text>
        <Text variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }} numberOfLines={2}>
          {data.description || 'Reels açıklamanız'}
        </Text>
        <View style={styles.reelsCta}>
          <Text variant="caption" style={styles.ctaText}>
            {ctaLabelText(data.ctaLabel)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MapAdPreview({
  data,
  colors,
  metaColor,
}: {
  data: AdPreviewData;
  colors: { border: string; surfaceElevated: string };
  metaColor: string;
}) {
  return (
    <View style={styles.mapFrame}>
      <View style={[styles.mapBg, { backgroundColor: `${metaColor}12` }]}>
        <Ionicons name="map" size={40} color={`${metaColor}55`} />
      </View>
      <GlassCard style={[styles.mapPinCard, { borderColor: colors.border }]}>
        <View style={[styles.mapPinIcon, { backgroundColor: `${metaColor}22` }]}>
          <Ionicons name="location" size={16} color={metaColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="label" numberOfLines={1}>
            {data.title || 'Harita reklamı'}
          </Text>
          <Text secondary variant="caption" numberOfLines={2}>
            {data.description || 'Konum kartı açıklaması'}
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

function BusinessAdPreview({
  data,
  colors,
  metaColor,
}: {
  data: AdPreviewData;
  colors: { border: string };
  metaColor: string;
}) {
  return (
    <View style={[styles.businessCard, { borderColor: colors.border }]}>
      {data.imageUri ? (
        <Image source={{ uri: data.imageUri }} style={styles.businessImage} contentFit="cover" />
      ) : (
        <View style={[styles.businessImage, styles.imagePlaceholder, { backgroundColor: `${metaColor}18` }]}>
          <Ionicons name="storefront-outline" size={32} color={metaColor} />
        </View>
      )}
      <View style={styles.businessBody}>
        <Text variant="label">{data.title || 'İşletme adı'}</Text>
        <Text secondary variant="caption" numberOfLines={3}>
          {data.description || 'İşletme tanıtım metni'}
        </Text>
        <View style={[styles.ctaButton, { backgroundColor: metaColor, alignSelf: 'flex-start' }]}>
          <Text variant="caption" style={styles.ctaText}>
            {ctaLabelText(data.ctaLabel)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AdvertiserAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
          {name.slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  phoneFrame: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.25)',
  },
  phoneHeader: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  phoneBody: {
    minHeight: 320,
    padding: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  legendItem: { alignItems: 'center', gap: 2 },
  feedCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedHeaderCopy: { flex: 1, gap: 2 },
  sponsoredRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  ctaButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  reelsFrame: {
    flex: 1,
    minHeight: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  reelsPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  reelsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  reelsCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  mapFrame: { flex: 1, minHeight: 280, gap: spacing.md },
  mapBg: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  mapPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  mapPinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  businessImage: { width: '100%', height: 140 },
  businessBody: { padding: spacing.md, gap: spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 36, height: 36 },
});
