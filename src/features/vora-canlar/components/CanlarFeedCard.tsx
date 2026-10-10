import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { shareCanlarListing } from '@/features/vora-canlar/services/shareListing';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { deletePost } from '@/features/feed/services/engagement';
import { CanlarAuthorRow } from '@/features/vora-canlar/components/CanlarAuthor';
import { CanlarPostComments } from '@/features/vora-canlar/components/CanlarCommentSheet';
import { CanlarListingMenu } from '@/features/vora-canlar/components/CanlarListingMenu';
import { CanlarMediaGallery } from '@/features/vora-canlar/components/CanlarMediaGallery';
import { CanlarGlassCard, CanlarMoneyMeter, CanlarOutcomeTag } from '@/features/vora-canlar/components/canlarUi';
import { CANLAR_ACCENT, formatMinor } from '@/features/vora-canlar/constants';
import { deleteCanlarPost, setListingOutcome } from '@/features/vora-canlar/services/api';
import type { CanlarFeedRow } from '@/features/vora-canlar/services/homeFeed';
import { dropCanlarPost, seedCanlarCase, seedCanlarPost } from '@/features/vora-canlar/services/sessionCache';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarFeedCard({ row, onChanged }: { row: CanlarFeedRow; onChanged?: () => void }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const canManage = Boolean(user && row.post && row.post.author_id === user.id && !row.example);

  const openExample = () => {
    if (row.href) router.push(row.href as never);
  };

  const openPost = () => {
    if (row.example) {
      openExample();
      return;
    }
    if (!row.post) return;
    seedCanlarPost(row.post);
    router.push(`/vora-canlar/post/${row.post.id}` as never);
  };

  const openComments = () => {
    if (row.example) {
      openExample();
      return;
    }
    if (!row.post) return;
    setCommentsOpen(true);
  };

  const openStatus = () => {
    if (row.example) {
      openExample();
      return;
    }
    if (row.caseRow && row.caseId) {
      seedCanlarCase(row.caseRow);
      router.push(`/vora-canlar/case/${row.caseId}` as never);
      return;
    }
    openPost();
  };

  const openDonate = () => {
    if (!row.campaignId || !row.donationOpen) return;
    router.push(`/vora-canlar/donate/${row.campaignId}` as never);
  };

  const mediaUrls = row.mediaUrls ?? [];

  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)';

  return (
    <CanlarGlassCard>
      <View style={styles.body}>
        {row.post ? (
          <View style={styles.authorLine}>
            <View style={{ flex: 1, gap: 8 }}>
              <CanlarAuthorRow
                name={row.title}
                meta={row.meta}
                userId={row.example ? null : row.post.author_id}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="İlanı aç" onPress={openPost}>
                {row.post?.outcome ? (
                  <CanlarOutcomeTag outcome={row.post.outcome} />
                ) : (
                  <View style={[styles.badge, { backgroundColor: `${row.badge.tone}18`, borderColor: `${row.badge.tone}55` }]}>
                    <Ionicons name={row.badge.icon} size={13} color={row.badge.tone} />
                    <Text style={{ color: row.badge.tone, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>{row.badge.label}</Text>
                  </View>
                )}
              </Pressable>
            </View>
            <CanlarListingMenu
              canManage={canManage}
              outcome={row.post.outcome}
              onEdit={() => router.push(`/vora-canlar/post/edit/${row.post?.id}` as never)}
              onOutcome={(outcome) => {
                if (!row.post) return;
                void setListingOutcome(row.post.id, outcome).then((result) => {
                  if (result.error) Alert.alert('Durum', result.error);
                  else onChanged?.();
                });
              }}
              onDelete={() => {
                if (!row.post) return;
                const post = row.post;
                void (async () => {
                  const removed = await deleteCanlarPost(post.id);
                  if (removed.error) {
                    Alert.alert('İlan', removed.error);
                    return;
                  }
                  if (post.vora_post_id && user && post.author_id === user.id) {
                    await deletePost(post.vora_post_id, user.id);
                  }
                  dropCanlarPost(post.id);
                  onChanged?.();
                })();
              }}
            />
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={row.caseId ? openStatus : openPost}>
            <View style={styles.head}>
              <View style={[styles.badge, { backgroundColor: `${row.badge.tone}18`, borderColor: `${row.badge.tone}55` }]}>
                <Ionicons name={row.badge.icon} size={13} color={row.badge.tone} />
                <Text style={{ color: row.badge.tone, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>{row.badge.label}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>{row.title}</Text>
              {row.meta ? <Text secondary numberOfLines={1}>{row.meta}</Text> : null}
            </View>
          </Pressable>
        )}
      </View>
      {mediaUrls.length > 0 ? (
        <View style={styles.mediaFrame}>
          <CanlarMediaGallery urls={mediaUrls} />
        </View>
      ) : null}
      {mediaUrls.length === 0 && row.image ? (
        <Pressable accessibilityRole="button" onPress={row.caseId ? openStatus : openPost}>
          <View style={styles.mediaFrame}>
            <Image
              source={typeof row.image === 'string' ? { uri: row.image } : row.image}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel="İlan görseli"
            />
            {row.example ? (
              <View style={styles.stamp}>
                <Text style={styles.stampText}>Örnektir</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={row.caseId ? openStatus : openPost} style={styles.body}>
        {row.body ? <Text numberOfLines={4}>{row.body}</Text> : null}
        {row.moneyNote ? <Text style={{ fontWeight: '800' }}>{row.moneyNote}</Text> : null}
        {row.raisedMinor != null ? (
          <View style={styles.money}>
            <Text style={{ fontWeight: '800' }}>Toplanan {formatMinor(row.raisedMinor, row.currency ?? 'try')}</Text>
            {row.targetMinor != null ? (
              <CanlarMoneyMeter raised={row.raisedMinor} target={row.targetMinor} currency={row.currency} />
            ) : null}
          </View>
        ) : null}
      </Pressable>
      <View style={[styles.actions, { borderTopColor: hairline }]}>
        {row.post || row.example ? (
          <Action icon="chatbubble-outline" label={row.commentCount ? `${row.commentCount} yorum` : 'Yorum'} onPress={openComments} />
        ) : null}
        {row.donationOpen && row.campaignId ? <Action icon="heart-outline" label="Bağış" onPress={openDonate} /> : null}
        {row.caseId && !row.post ? <Action icon="paw-outline" label="Durum" onPress={openStatus} /> : null}
        <Action
          icon="share-outline"
          label="Paylaş"
          onPress={() => {
            if (row.post) {
              void shareCanlarListing({ id: row.post.id, body: row.post.body, city: row.post.city_label });
              return;
            }
            void Share.share({ message: row.shareText });
          }}
        />
      </View>
      {row.post ? (
        <CanlarPostComments
          visible={commentsOpen}
          postId={row.post.id}
          voraPostId={row.post.vora_post_id}
          authorId={row.post.author_id}
          onClose={() => setCommentsOpen(false)}
        />
      ) : null}
    </CanlarGlassCard>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
      <Ionicons name={icon} size={18} color={CANLAR_ACCENT} />
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.md, gap: spacing.sm },
  mediaFrame: {
    marginHorizontal: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  authorLine: { flexDirection: 'row', alignItems: 'center' },
  head: { gap: 4 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: { fontSize: 18, fontWeight: '800' },
  photo: { width: '100%', height: 220, borderRadius: 16 },
  stamp: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stampText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  money: { gap: 6 },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
