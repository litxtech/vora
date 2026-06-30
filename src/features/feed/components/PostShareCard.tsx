import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { POST_SHARE_CARD_WIDTH } from '@/features/feed/constants';
import { formatPostShareDisplayPath } from '@/lib/sharing/constants';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { resolveVideoThumbnailUrl } from '@/lib/media/videoThumbnailUrl';
import { captureThumbnail } from '@/features/vora-studio/services/videoThumbnails';
import type { FeedItem } from '@/features/feed/types';
import {
  prepareShareCardText,
  shareCardContentFontSize,
  shareCardContentLineHeight,
} from '@/features/feed/utils/shareCardText';
import { radius, spacing } from '@/constants/theme';

const ACCENT = '#80DEEA';
const CARD_BG = '#0A0E14';
const CARD_GRADIENT = ['#0A0E14', '#121A24', '#0D1219'] as const;
const MEDIA_HEIGHT = POST_SHARE_CARD_WIDTH * 0.62;

type PostShareCardProps = {
  item: FeedItem;
  width?: number;
  onMediaLoaded?: () => void;
};

export const PostShareCard = forwardRef<View, PostShareCardProps>(function PostShareCard(
  { item, width = POST_SHARE_CARD_WIDTH, onMediaLoaded },
  ref,
) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const mediaUrl = item.mediaUrls[0] ?? null;
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  const hasMediaAttachment = Boolean(mediaUrl);
  const staticPreview = useMemo(
    () => (mediaUrl ? resolveVideoThumbnailUrl(mediaUrl) : null),
    [mediaUrl],
  );
  const [previewUri, setPreviewUri] = useState<string | null>(staticPreview);

  const extraMedia = Math.max(0, item.mediaUrls.length - 1);
  const shortUrl = formatPostShareDisplayPath(item.sourceId);
  const body = item.content.trim();
  const initial = item.author.username.slice(0, 1).toUpperCase();

  const lineHeight = shareCardContentLineHeight(hasMediaAttachment);
  const fontSize = shareCardContentFontSize(hasMediaAttachment);

  const { display, isTruncated } = useMemo(
    () => prepareShareCardText(body, { hasMedia: hasMediaAttachment }),
    [body, hasMediaAttachment],
  );

  const notifyMediaReady = () => {
    onMediaLoaded?.();
  };

  useEffect(() => {
    setPreviewUri(staticPreview);
    setPreviewFailed(false);
  }, [staticPreview, mediaUrl]);

  const showPreviewImage = Boolean(previewUri) && !previewFailed;

  useEffect(() => {
    if (!hasMediaAttachment) {
      notifyMediaReady();
      return;
    }
    if (staticPreview) return;
    if (!isVideo || !mediaUrl) {
      notifyMediaReady();
      return;
    }

    let cancelled = false;
    void captureThumbnail(mediaUrl, 1).then((uri) => {
      if (cancelled) return;
      if (uri) {
        setPreviewUri(uri);
        return;
      }
      notifyMediaReady();
    });

    return () => {
      cancelled = true;
    };
  }, [hasMediaAttachment, staticPreview, isVideo, mediaUrl]);

  useEffect(() => {
    if (showPreviewImage || !hasMediaAttachment || isVideo) return;
    if (!staticPreview || previewFailed) {
      notifyMediaReady();
    }
  }, [showPreviewImage, hasMediaAttachment, isVideo, staticPreview, previewFailed]);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.captureRoot, { width, borderRadius: radius.xl }]}
    >
      <LinearGradient colors={[...CARD_GRADIENT]} style={styles.cardFill}>
        <View style={styles.accentBar} />

        <View style={styles.header}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {item.author.avatarUrl && !avatarFailed ? (
                <Image
                  source={{ uri: item.author.avatarUrl }}
                  style={[
                    styles.avatarImage,
                    item.author.isBusinessVerified && styles.avatarImageLogo,
                  ]}
                  resizeMode={item.author.isBusinessVerified ? 'contain' : 'cover'}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </View>
            <View style={styles.authorMeta}>
              <Text style={styles.username}>@{item.author.username}</Text>
              {item.author.fullName ? (
                <Text style={styles.displayName} numberOfLines={1}>
                  {item.author.fullName}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.brand}>VORA</Text>
        </View>

        {hasMediaAttachment ? (
          <View style={styles.mediaWrap}>
            {showPreviewImage ? (
              <OptimizedImage
                uri={previewUri}
                style={styles.media}
                contentFit="cover"
                tier="feed"
                layoutWidth={width}
                recyclingKey={previewUri ?? mediaUrl ?? 'share-preview'}
                onLoad={notifyMediaReady}
                onError={() => {
                  setPreviewFailed(true);
                  notifyMediaReady();
                }}
              />
            ) : (
              <View style={[styles.media, styles.videoFallback]}>
                <Ionicons name={isVideo ? 'videocam' : 'image-outline'} size={28} color={ACCENT} />
              </View>
            )}
            {isVideo ? (
              <View style={styles.playBadge}>
                <Ionicons name="play" size={18} color={CARD_BG} />
              </View>
            ) : null}
            {extraMedia > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>+{extraMedia}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.textOnlyAccent}>
            <View style={styles.quoteMark}>
              <Text style={styles.quoteGlyph}>“</Text>
            </View>
          </View>
        )}

        {item.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}

        {display ? (
          <View style={styles.contentBlock}>
            <Text
              style={[
                styles.content,
                !hasMediaAttachment && styles.contentTextOnly,
                { lineHeight, fontSize },
              ]}
            >
              {display}
            </Text>
            {isTruncated ? (
              <Text style={styles.continueHint} numberOfLines={1}>
                Devamı · {shortUrl}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          {item.vctsTrustCode ? (
            <View style={styles.verifiedRow}>
              <Ionicons name="shield-checkmark" size={13} color={ACCENT} />
              <Text style={styles.verifiedText}>Doğrulanmış kaynak</Text>
            </View>
          ) : null}
          <Text style={styles.link} numberOfLines={1}>
            {shortUrl}
          </Text>
          <Text style={styles.watermark}>Orijinal içerik · VORA</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  captureRoot: {
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    overflow: 'hidden',
  },
  cardFill: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 222, 234, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  avatarImageLogo: {
    width: 30,
    height: 30,
    borderRadius: 4,
  },
  avatarInitial: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: '#ECEFF1',
    fontSize: 14,
    fontWeight: '700',
  },
  displayName: {
    color: '#90A4AE',
    fontSize: 12,
  },
  brand: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  mediaWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.xs,
    backgroundColor: '#121A24',
  },
  media: {
    width: '100%',
    height: MEDIA_HEIGHT,
  },
  videoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121A24',
  },
  playBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  countBadge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(10, 14, 20, 0.78)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128, 222, 234, 0.35)',
  },
  countBadgeText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
  },
  textOnlyAccent: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  quoteMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(128, 222, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteGlyph: {
    color: ACCENT,
    fontSize: 24,
    lineHeight: 28,
    marginTop: -4,
  },
  title: {
    color: '#F5F7FA',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  contentBlock: {
    gap: spacing.xs,
  },
  content: {
    color: '#B0BEC5',
  },
  contentTextOnly: {
    color: '#CFD8DC',
  },
  continueHint: {
    color: 'rgba(128, 222, 234, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 6,
    alignItems: 'center',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '600',
  },
  link: {
    color: '#78909C',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  watermark: {
    color: 'rgba(128, 222, 234, 0.65)',
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
});
