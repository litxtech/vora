import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { openUrl } from '@/lib/linking/openUrl';
import type { LinkPreview } from '../services/linkPreview';
import { formatUrlDisplay, hostnameFromUrl } from '../utils/urlDisplay';

type LinkPreviewCardProps = {
  preview: LinkPreview;
  surfaceColor: string;
  accentColor: string;
  titleColor: string;
  metaColor: string;
  borderColor?: string;
  onPress?: () => void;
  /** Sol üstte gösterilecek küçük rozet (ör. iç linkler için "Vora") */
  badge?: string;
  /**
   * `rich` — büyük görsel + başlık + site açıklaması (yorumlar)
   * `compact` — yatay şerit (sohbet)
   */
  layout?: 'rich' | 'compact';
};

export const LinkPreviewCard = memo(function LinkPreviewCard({
  preview,
  surfaceColor,
  accentColor,
  titleColor,
  metaColor,
  borderColor,
  onPress,
  badge,
  layout = 'rich',
}: LinkPreviewCardProps) {
  const siteLabel = badge
    ? `${badge}${preview.siteName ? ` · ${preview.siteName}` : ''}`
    : preview.siteName ?? hostnameFromUrl(preview.url);
  const title = preview.title?.trim() || formatUrlDisplay(preview.url, 48);
  const description = preview.description?.trim() || null;
  const urlLine = formatUrlDisplay(preview.url, 52);
  const handlePress = onPress ?? (() => void openUrl(preview.url));
  const border = borderColor ?? `${accentColor}28`;

  if (layout === 'compact') {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.compact,
          {
            backgroundColor: surfaceColor,
            borderColor: border,
            opacity: pressed ? 0.94 : 1,
          },
        ]}
        onPress={handlePress}
        accessibilityRole="link"
        accessibilityLabel={`${title} — bağlantıyı aç`}
      >
        {preview.imageUrl ? (
          <Image source={{ uri: preview.imageUrl }} style={styles.compactThumb} contentFit="cover" transition={120} />
        ) : (
          <View style={[styles.compactThumb, styles.iconThumb, { backgroundColor: `${accentColor}14` }]}>
            <Ionicons name="link-outline" size={18} color={accentColor} />
          </View>
        )}
        <View style={styles.compactBody}>
          <Text variant="caption" numberOfLines={1} style={{ color: accentColor, fontWeight: '700' }}>
            {siteLabel}
          </Text>
          <Text numberOfLines={1} style={[styles.compactTitle, { color: titleColor }]}>
            {title}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={metaColor} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.rich,
        {
          backgroundColor: surfaceColor,
          borderColor: border,
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={description ? `${title}. ${description}` : `${title} — bağlantıyı aç`}
    >
      {preview.imageUrl ? (
        <View style={styles.hero}>
          <Image source={{ uri: preview.imageUrl }} style={styles.heroImage} contentFit="cover" transition={180} />
          <View style={styles.heroBadge}>
            <Ionicons name="globe-outline" size={11} color="#fff" />
            <Text variant="caption" numberOfLines={1} style={styles.heroBadgeText}>
              {siteLabel}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.heroFallback, { backgroundColor: `${accentColor}12` }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${accentColor}20` }]}>
            <Ionicons name="newspaper-outline" size={26} color={accentColor} />
          </View>
          <Text variant="caption" numberOfLines={1} style={{ color: accentColor, fontWeight: '700', marginTop: 8 }}>
            {siteLabel}
          </Text>
        </View>
      )}

      <View style={styles.richBody}>
        <Text numberOfLines={3} style={[styles.richTitle, { color: titleColor }]}>
          {title}
        </Text>

        {description ? (
          <Text numberOfLines={4} style={[styles.richDescription, { color: metaColor }]}>
            {description}
          </Text>
        ) : null}

        {preview.author ? (
          <Text variant="caption" numberOfLines={1} style={{ color: metaColor }}>
            {preview.author}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.urlRow}>
            <Ionicons name="open-outline" size={13} color={metaColor} />
            <Text variant="caption" numberOfLines={1} style={{ color: metaColor, flexShrink: 1 }}>
              {urlLine}
            </Text>
          </View>
          <View style={[styles.ctaChip, { backgroundColor: `${accentColor}16` }]}>
            <Text variant="caption" style={[styles.ctaText, { color: accentColor }]}>
              Siteyi aç
            </Text>
            <Ionicons name="arrow-forward" size={12} color={accentColor} />
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  rich: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignSelf: 'stretch',
    minWidth: 240,
  },
  hero: {
    width: '100%',
    height: 188,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  heroImage: {
    width: '100%',
    height: 188,
  },
  heroBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '88%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroBadgeText: {
    color: '#fff',
    fontWeight: '700',
    flexShrink: 1,
    fontSize: 11,
  },
  heroFallback: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  richBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
  },
  richTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  richDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  urlRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  ctaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ctaText: {
    fontWeight: '700',
    fontSize: 12,
  },

  compact: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 10,
    alignSelf: 'stretch',
  },
  compactThumb: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  iconThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
});
