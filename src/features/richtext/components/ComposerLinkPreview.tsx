import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { useLinkPreview } from '../hooks/useLinkPreview';
import { firstUrlInText, isPreviewableUrl } from '../utils/textSegments';
import { formatUrlDisplay } from '../utils/urlDisplay';
import {
  internalShareIcon,
  internalShareLabel,
  resolveInternalShare,
} from '../services/internalShareCard';

type ComposerLinkPreviewProps = {
  /** Composer'daki güncel metin */
  content: string;
  light?: boolean;
};

/** Yazarken yapıştırılan ilk linkin kompakt önizleme şeridi. */
export const ComposerLinkPreview = memo(function ComposerLinkPreview({
  content,
  light = false,
}: ComposerLinkPreviewProps) {
  const { colors } = useTheme();
  const rawUrl = useMemo(() => firstUrlInText(content), [content]);
  const url = useMemo(
    () => (rawUrl && isPreviewableUrl(rawUrl) ? rawUrl : null),
    [rawUrl],
  );
  const internal = useMemo(() => (url ? resolveInternalShare(url) : null), [url]);
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null);
  const { preview, loading } = useLinkPreview(url);

  if (!url || url === dismissedUrl) return null;

  const surfaceColor = light ? 'rgba(255,255,255,0.10)' : colors.surfaceElevated;
  const accentColor = internal ? colors.primary : colors.accent;
  const titleColor = light ? '#fff' : colors.text;
  const metaColor = light ? 'rgba(255,255,255,0.7)' : colors.textMuted;
  const borderColor = light ? 'rgba(255,255,255,0.18)' : `${accentColor}28`;

  const title = preview?.title ?? (internal ? "Vora'da aç" : formatUrlDisplay(url, 40));
  const subtitle = internal
    ? `Vora · ${internalShareLabel(internal.kind)}`
    : preview?.siteName ?? (loading ? 'Site içeriği…' : formatUrlDisplay(url, 28));
  const description = preview?.description?.trim() || null;

  return (
    <View style={[styles.strip, { backgroundColor: surfaceColor, borderColor }]}>
      {preview?.imageUrl ? (
        <Image source={{ uri: preview.imageUrl }} style={styles.thumb} contentFit="cover" transition={100} />
      ) : (
        <View style={[styles.thumb, styles.iconThumb, { backgroundColor: `${accentColor}14` }]}>
          <Ionicons
            name={
              (internal
                ? internalShareIcon(internal.kind)
                : 'newspaper-outline') as keyof typeof Ionicons.glyphMap
            }
            size={18}
            color={accentColor}
          />
        </View>
      )}
      <View style={styles.body}>
        <Text variant="caption" numberOfLines={1} style={{ color: accentColor, fontWeight: '700' }}>
          {subtitle}
        </Text>
        <Text numberOfLines={2} style={{ color: titleColor, fontWeight: '700', fontSize: 13, lineHeight: 17 }}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" numberOfLines={2} style={{ color: metaColor, lineHeight: 16 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => setDismissedUrl(url)}
        hitSlop={8}
        accessibilityLabel="Önizlemeyi kaldır"
      >
        <Ionicons name="close" size={18} color={metaColor} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 10,
    marginHorizontal: 8,
    marginBottom: 6,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  iconThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingTop: 1,
  },
});
