import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { CommentSheet } from '@/features/feed/components/CommentSheet';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { MediaCarousel } from '@/features/feed/components/MediaCarousel';
import { PostActions } from '@/features/feed/components/PostActions';
import { QuotedPostPreview } from '@/features/feed/components/QuotedPostPreview';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { HashtagText } from '@/features/feed/components/HashtagText';
import { blockUser, createQuotePost } from '@/features/feed/services/engagement';
import { recordPostView } from '@/features/feed/services/feedData';
import type { FeedItem } from '@/features/feed/types';
import { formatFeedTime } from '@/features/feed/utils';
import { REGIONS } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type FeedPostCardProps = {
  item: FeedItem;
  onUpdate: (patch: Partial<FeedItem>) => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  news: 'Haber',
  emergency: 'Acil',
  traffic: 'Trafik',
  event: 'Etkinlik',
  job: 'İş İlanı',
  business: 'İşletme',
  lost_found: 'Kayıp',
  reels: 'Reels',
  general: 'Genel',
};

export function FeedPostCard({ item, onUpdate }: FeedPostCardProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  useEffect(() => {
    if (item.isDemo) return;
    recordPostView(item.sourceId, user?.id ?? null);
  }, [item.sourceId, item.isDemo, user?.id]);

  const regionName = REGIONS.find((r) => r.id === item.regionId)?.name;
  const locationParts = [item.locationLabel, item.district, regionName].filter(Boolean);

  const handleQuote = async () => {
    if (!requireAuth('Alıntı')) return;
    if (!user || !quoteText.trim()) return;

    const { error } = await createQuotePost(
      user.id,
      item.regionId,
      item.sourceId,
      quoteText.trim(),
    );

    if (error) {
      Alert.alert('Hata', 'Alıntı paylaşılamadı.');
      return;
    }

    onUpdate({ quoteCount: item.quoteCount + 1 });
    setShowQuote(false);
    setQuoteText('');
    Alert.alert('Paylaşıldı', 'Alıntın akışa eklendi.');
  };

  const openLocation = () => {
    if (item.latitude == null || item.longitude == null) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`,
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <UserBadge author={item.author} timeLabel={formatFeedTime(item.createdAt)} />
        <View style={styles.topActions}>
          <FollowButton
            authorId={item.author.id}
            isFollowing={item.isFollowing}
            onToggle={(next) => onUpdate({ isFollowing: next })}
          />
          <Pressable onPress={() => setShowMenu(true)} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {locationParts.length > 0 || item.category !== 'general' ? (
        <View style={styles.tags}>
          {item.category !== 'general' ? (
            <View style={[styles.tag, { backgroundColor: 'rgba(30,136,229,0.12)' }]}>
              <Text variant="caption" style={{ color: colors.primary }}>
                {CATEGORY_LABELS[item.category] ?? item.category}
              </Text>
            </View>
          ) : null}
          {locationParts.length > 0 ? (
            <Pressable style={styles.locationTag} onPress={openLocation}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text variant="caption" secondary numberOfLines={1}>
                {locationParts.join(' · ')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {item.title ? <Text variant="h3">{item.title}</Text> : null}
      <HashtagText content={item.content} />

      {item.quotedPost ? <QuotedPostPreview quoted={item.quotedPost} /> : null}
      <MediaCarousel urls={item.mediaUrls} />

      {item.isDemo ? (
        <View style={[styles.demoBadge, { borderColor: colors.warning }]}>
          <Text variant="caption" style={{ color: colors.warning }}>
            Örnek içerik
          </Text>
        </View>
      ) : null}

      <PostActions
        item={item}
        onUpdate={onUpdate}
        onCommentPress={() => setShowComments(true)}
        onQuotePress={() => setShowQuote(true)}
      />

      {item.viewCount > 0 ? (
        <Pressable
          onPress={() => {
            if (user?.id === item.author.id || item.isDemo) {
              router.push(`/post-viewers/${item.sourceId}?authorId=${item.author.id}` as never);
            }
          }}
        >
          <Text secondary variant="caption" style={styles.views}>
            {item.viewCount.toLocaleString('tr-TR')} görüntülenme
          </Text>
        </Pressable>
      ) : null}

      <CommentSheet
        visible={showComments}
        postId={item.sourceId}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => onUpdate({ commentCount: item.commentCount + 1 })}
      />

      <ReportSheet
        visible={showReport}
        targetType="post"
        targetId={item.sourceId}
        onClose={() => setShowReport(false)}
      />

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menu, { backgroundColor: colors.surface }]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowReport(true);
              }}
            >
              <Text>Raporla</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                if (!requireAuth('Engelleme') || !user) return;
                setShowMenu(false);
                Alert.alert('Engelle', `@${item.author.username} engellensin mi?`, [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Engelle',
                    style: 'destructive',
                    onPress: async () => {
                      const { error } = await blockUser(user.id, item.author.id, false);
                      if (!error) Alert.alert('Engellendi', 'Bu kullanıcının içerikleri artık görünmeyecek.');
                    },
                  },
                  {
                    text: 'Kısıtla',
                    onPress: async () => {
                      const { error } = await blockUser(user.id, item.author.id, true);
                      if (!error) Alert.alert('Kısıtlandı', 'Kullanıcı kısıtlandı.');
                    },
                  },
                ]);
              }}
            >
              <Text>Kullanıcıyı engelle / kısıtla</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showQuote} transparent animationType="slide" onRequestClose={() => setShowQuote(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowQuote(false)}>
          <Pressable
            style={[styles.quoteSheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="h3">Alıntı yap</Text>
            <View style={[styles.quotePreview, { borderColor: colors.border }]}>
              <Text secondary variant="caption">
                @{item.author.username}
              </Text>
              <Text numberOfLines={2}>{item.content}</Text>
            </View>
            <TextInput
              style={[styles.quoteInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Yorumunu ekle..."
              placeholderTextColor={colors.textMuted}
              value={quoteText}
              onChangeText={setQuoteText}
              multiline
            />
            <Button title="Paylaş" onPress={handleQuote} disabled={!quoteText.trim()} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  tag: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  demoBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  views: { marginTop: spacing.xs },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  menu: { borderRadius: radius.lg, overflow: 'hidden' },
  menuItem: { padding: spacing.lg },
  quoteSheet: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  quotePreview: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  quoteInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
