import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { CommentSheet } from '@/features/feed/components/CommentSheet';
import { MediaCarousel } from '@/features/feed/components/MediaCarousel';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { SponsoredAdActions } from '@/features/ads/components/SponsoredAdActions';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { AD_FEED_ACCENT, ctaLabelText } from '@/features/ads/constants';
import { recordAdClick, recordAdImpression } from '@/features/ads/services/adServing';
import { navigateToAuthorProfile } from '@/features/feed/services/feedNavigation';
import type { FeedItem } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { openUrl } from '@/lib/linking/openUrl';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useUserCardOptional } from '@/providers/UserCardProvider';
import { supabase } from '@/lib/supabase/client';

type Props = {
  item: FeedItem;
  isVisible?: boolean;
  onUpdate?: (patch: Partial<FeedItem>) => void;
};

const AVATAR_SIZE = 40;

export const FeedSponsoredAdCard = memo(function FeedSponsoredAdCard({
  item,
  isVisible = true,
  onUpdate,
}: Props) {
  const { colors } = useTheme();
  const userCard = useUserCardOptional();
  const { requireAuth } = useRequireAuth();
  const impressionRecorded = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [engagementPostId, setEngagementPostId] = useState<string | null>(
    item.engagementPostId ?? null,
  );

  const adId = item.businessAdId ?? item.sourceId;
  const cta = item.adCtaLabel ? ctaLabelText(item.adCtaLabel) : 'Daha Fazla Bilgi';
  const hasMedia = item.mediaUrls.length > 0;

  useEffect(() => {
    if (!isVisible || impressionRecorded.current || !adId) return;
    impressionRecorded.current = true;
    void recordAdImpression(adId);
  }, [isVisible, adId]);

  useEffect(() => {
    if (engagementPostId || !adId) return;
    void supabase.rpc('ensure_business_ad_engagement_post', { p_ad_id: adId }).then(({ data }) => {
      if (typeof data === 'string' && data) {
        setEngagementPostId(data);
      }
    });
  }, [adId, engagementPostId]);

  const handleCta = useCallback(async () => {
    if (!adId) return;

    const { error } = await recordAdClick(adId);
    if (error) {
      if (item.adDestinationUrl) {
        await openUrl(item.adDestinationUrl);
      }
      return;
    }

    if (item.adDestinationUrl) {
      await openUrl(item.adDestinationUrl);
    }
  }, [adId, item.adDestinationUrl]);

  const openAuthor = useCallback(() => {
    if (userCard) {
      userCard.openUserCard(item.author, item.isFollowing);
      return;
    }
    navigateToAuthorProfile(item.author);
  }, [item.author, item.isFollowing, userCard]);

  const patchItem = useCallback(
    (patch: Partial<FeedItem>) => {
      onUpdate?.(patch);
    },
    [onUpdate],
  );

  const handleCommentAdded = useCallback(() => {
    patchItem({ commentCount: item.commentCount + 1 });
  }, [item.commentCount, patchItem]);

  const handleCommentDeleted = useCallback(() => {
    patchItem({ commentCount: Math.max(0, item.commentCount - 1) });
  }, [item.commentCount, patchItem]);

  const openComments = useCallback(async () => {
    if (!(await requireAuth('Yorum'))) return;
    if (!engagementPostId) {
      Alert.alert('Hazırlanıyor', 'Yorumlar birkaç saniye içinde açılacak.');
      return;
    }
    setShowComments(true);
  }, [engagementPostId, requireAuth]);

  return (
    <View style={[styles.post, { borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <Pressable onPress={openAuthor} style={styles.avatarCol} hitSlop={4}>
          <FeedAuthorAvatar
            author={item.author}
            size={AVATAR_SIZE}
            fallbackIcon="storefront-outline"
            fallbackIconColor={AD_FEED_ACCENT}
          />
        </Pressable>

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.headerBadge} pointerEvents="box-none">
              <UserBadge
                author={item.author}
                timeLabel={formatFeedTime(item.createdAt)}
                linkToProfile
                variant="post"
                hideAvatar
                tappable
              />
            </View>
            <View style={styles.headerActions} pointerEvents="box-none">
              <FollowButton
                authorId={item.author.id}
                businessId={item.author.businessId}
                username={item.author.username}
                isFollowing={item.isFollowing}
                onToggle={(next) => patchItem({ isFollowing: next })}
              />
            </View>
          </View>

          <View style={styles.highlightRow}>
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
              Sponsorlu
            </Text>
          </View>

          {item.title ? (
            <Pressable onPress={() => void handleCta()}>
              <Text variant="label" style={styles.title}>
                {item.title}
              </Text>
            </Pressable>
          ) : null}

          <Pressable onPress={() => void handleCta()}>
            <Text secondary variant="body">
              {item.content}
            </Text>
          </Pressable>

          {hasMedia ? (
            <MediaCarousel
              urls={item.mediaUrls}
              variant="inline"
              onMediaPress={() => void handleCta()}
            />
          ) : null}

          <Pressable
            onPress={() => void handleCta()}
            style={({ pressed }) => [styles.ctaLink, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={4}
          >
            <Text variant="caption" style={{ color: AD_FEED_ACCENT, fontWeight: '700' }}>
              {cta}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={AD_FEED_ACCENT} />
          </Pressable>

          <SponsoredAdActions
            item={item}
            engagementPostId={engagementPostId}
            onUpdate={patchItem}
            onCommentPress={openComments}
            accent={AD_FEED_ACCENT}
          />
        </View>
      </View>

      <CommentSheet
        visible={showComments}
        postId={engagementPostId ?? ''}
        postAuthorId={item.author.id}
        onClose={() => setShowComments(false)}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  post: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  avatarCol: {
    paddingTop: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  headerBadge: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  ctaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});
