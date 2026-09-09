import { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';
import { useLinkPreview } from '../hooks/useLinkPreview';
import { firstUrlInText, isPreviewableUrl } from '../utils/textSegments';
import { formatUrlDisplay, hostnameFromUrl } from '../utils/urlDisplay';
import {
  internalShareIcon,
  internalShareLabel,
  resolveInternalShare,
} from '../services/internalShareCard';
import { LinkPreviewCard } from './LinkPreviewCard';

type CommentLinkAttachmentProps = {
  content: string;
  /** Koyu arka plan (ör. Reels yorumları) için açık renk paleti */
  light?: boolean;
  /**
   * `rich` — yorumlar (büyük kart)
   * `compact` — gönderi gövdesi (küçük yatay şerit)
   */
  layout?: 'rich' | 'compact';
  /** Link açılmadan önce (ör. yorum sheet kapat) */
  onBeforeOpen?: () => void;
};

export const CommentLinkAttachment = memo(function CommentLinkAttachment({
  content,
  light = false,
  layout = 'rich',
  onBeforeOpen,
}: CommentLinkAttachmentProps) {
  const { colors } = useTheme();
  const rawUrl = useMemo(() => firstUrlInText(content), [content]);
  const url = useMemo(
    () => (rawUrl && isPreviewableUrl(rawUrl) ? rawUrl : null),
    [rawUrl],
  );
  const internal = useMemo(() => (url ? resolveInternalShare(url) : null), [url]);
  const { preview, loading } = useLinkPreview(url);

  if (!url) return null;

  const open = () => void openUrl(url, { onBeforeNavigate: onBeforeOpen });

  const surfaceColor = light ? 'rgba(255,255,255,0.10)' : colors.surfaceElevated;
  const accentColor = internal ? colors.primary : colors.accent;
  const titleColor = light ? '#fff' : colors.text;
  const metaColor = light ? 'rgba(255,255,255,0.7)' : colors.textMuted;
  const borderColor = light ? 'rgba(255,255,255,0.18)' : `${accentColor}28`;

  if (preview) {
    return (
      <LinkPreviewCard
        preview={preview}
        surfaceColor={surfaceColor}
        accentColor={accentColor}
        titleColor={titleColor}
        metaColor={metaColor}
        borderColor={borderColor}
        badge={internal ? 'Vora' : undefined}
        layout={layout}
        onPress={open}
      />
    );
  }

  const host = hostnameFromUrl(url);
  const iconName = (
    internal ? internalShareIcon(internal.kind) : layout === 'compact' ? 'link-outline' : 'newspaper-outline'
  ) as keyof typeof Ionicons.glyphMap;
  const eyebrow = internal ? `Vora · ${internalShareLabel(internal.kind)}` : host;
  const headline = internal ? "Vora'da aç" : formatUrlDisplay(url, layout === 'compact' ? 40 : 48);

  if (layout === 'compact') {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.fallbackCompact,
          {
            backgroundColor: surfaceColor,
            borderColor,
            opacity: pressed ? 0.94 : 1,
          },
        ]}
        onPress={open}
        accessibilityRole="link"
        accessibilityLabel={`${eyebrow}: ${headline}`}
      >
        <View style={[styles.compactThumb, { backgroundColor: `${accentColor}14` }]}>
          {loading ? (
            <ActivityIndicator color={accentColor} size="small" />
          ) : (
            <Ionicons name={iconName} size={18} color={accentColor} />
          )}
        </View>
        <View style={styles.compactBody}>
          <Text variant="caption" numberOfLines={1} style={{ color: accentColor, fontWeight: '700' }}>
            {loading ? 'Önizleme…' : eyebrow}
          </Text>
          <Text numberOfLines={1} style={{ color: titleColor, fontWeight: '600', fontSize: 13, lineHeight: 17 }}>
            {headline}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={metaColor} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fallback,
        {
          backgroundColor: surfaceColor,
          borderColor,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${eyebrow}: ${headline}`}
    >
      <View style={[styles.hero, { backgroundColor: `${accentColor}12` }]}>
        {loading ? (
          <ActivityIndicator color={accentColor} />
        ) : (
          <View style={[styles.iconBubble, { backgroundColor: `${accentColor}20` }]}>
            <Ionicons name={iconName} size={26} color={accentColor} />
          </View>
        )}
        <Text variant="caption" numberOfLines={1} style={{ color: accentColor, fontWeight: '700', marginTop: 8 }}>
          {loading ? 'Site içeriği yükleniyor…' : eyebrow}
        </Text>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={{ color: titleColor, fontWeight: '700', fontSize: 15, lineHeight: 20 }}>
          {headline}
        </Text>
        <View style={styles.footer}>
          <Text variant="caption" numberOfLines={1} style={{ color: metaColor, flex: 1 }}>
            {formatUrlDisplay(url, 40)}
          </Text>
          <View style={[styles.ctaChip, { backgroundColor: `${accentColor}16` }]}>
            <Text variant="caption" style={{ color: accentColor, fontWeight: '700', fontSize: 12 }}>
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
  fallback: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignSelf: 'stretch',
    minWidth: 240,
  },
  hero: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fallbackCompact: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
