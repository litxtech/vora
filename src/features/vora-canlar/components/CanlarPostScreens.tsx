import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { shareCanlarListing } from '@/features/vora-canlar/services/shareListing';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { supabase } from '@/lib/supabase/client';
import { createPost } from '@/features/compose/services/createPost';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { deletePost, togglePostLike, togglePostSave } from '@/features/feed/services/engagement';
import { CanlarAuthorRow } from '@/features/vora-canlar/components/CanlarAuthor';
import { CanlarPostComments } from '@/features/vora-canlar/components/CanlarCommentSheet';
import { CanlarComposeCards, CanlarDonateToggle, CanlarPublishMode } from '@/features/vora-canlar/components/CanlarComposeCards';
import { CanlarComposeMedia, type CanlarDraftMedia } from '@/features/vora-canlar/components/CanlarComposeMedia';
import { CanlarListingMenu } from '@/features/vora-canlar/components/CanlarListingMenu';
import { CanlarOutcomeConfirm, type ListingOutcome } from '@/features/vora-canlar/components/CanlarOutcomeConfirm';
import { CanlarMediaGallery } from '@/features/vora-canlar/components/CanlarMediaGallery';
import { CanlarButton, CanlarEmpty, CanlarScaffold, CanlarStatusPill } from '@/features/vora-canlar/components/CanlarScaffold';
import { CanlarOutcomeTag } from '@/features/vora-canlar/components/canlarUi';
import { CanlarRaisedBar, CanlarSupportBar } from '@/features/vora-canlar/components/CanlarSupportBar';
import { ReportSheet } from '@/features/feed/components/ReportSheet';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import {
  createCanlarPost,
  deleteCanlarPost,
  linkCanlarVoraPost,
  loadListingState,
  loadPostDetail,
  openListingDonation,
  setListingOutcome,
  toggleCanlarLike,
  toggleCanlarSave,
} from '@/features/vora-canlar/services/api';
import { dropCanlarPost, readCanlarPost, writeCanlarPost } from '@/features/vora-canlar/services/sessionCache';
import { describeCanlarPost } from '@/features/vora-canlar/services/contentKind';
import { explainCanlarError, missingMessage } from '@/features/vora-canlar/services/plainLanguage';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type PostRecord = {
  id: string;
  body: string;
  city_label: string | null;
  vora_post_id: string | null;
  case_id: string | null;
  campaign_id: string | null;
  urgency?: string | null;
  like_count: number;
  comment_count: number;
  media: { url?: string; kind?: string }[];
  author_id?: string;
  author_label?: string | null;
  outcome?: 'treating' | 'recovered' | 'lost' | null;
  donation_open?: boolean;
  donation_note?: string | null;
  raised_minor?: number | null;
};

type CanlarComment = {
  id: string;
  body: string;
  created_at?: string;
  author_label?: string | null;
};

export function CanlarPostDetailScreen() {
  const { id, comments: commentsParam } = useLocalSearchParams<{ id: string; comments?: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const cached = id ? readCanlarPost(id) : null;
  const [post, setPost] = useState<PostRecord | null>((cached?.post as PostRecord | undefined) ?? null);
  const [liked, setLiked] = useState(Boolean(cached?.liked));
  const [saved, setSaved] = useState(Boolean(cached?.saved));
  const [canDelete, setCanDelete] = useState(Boolean(cached?.can_delete));
  const [comments, setComments] = useState<CanlarComment[]>((cached?.comments as CanlarComment[] | undefined) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<ListingOutcome | null>(null);

  const load = async () => {
    if (!id) return;
    const result = await loadPostDetail(id);
    if (result.error) setError(result.error);
    const data = result.data as {
      post?: PostRecord;
      liked?: boolean;
      saved?: boolean;
      can_delete?: boolean;
      comments?: CanlarComment[];
    } | null;
    if (data?.post) {
      const flags = await loadListingState([id]);
      const flag = flags.data?.[0];
      if (flag) {
        data.post.outcome = flag.outcome;
        data.post.donation_open = flag.donation_open;
        data.post.campaign_id = flag.campaign_id ?? data.post.campaign_id;
        data.post.raised_minor = flag.raised_minor;
        data.post.author_id = flag.author_id ?? data.post.author_id;
        data.post.donation_note = flag.donation_note;
      }
      writeCanlarPost(id, data);
      setPost(data.post);
      setLiked(Boolean(data.liked));
      setSaved(Boolean(data.saved));
      setCanDelete(Boolean(data.can_delete));
      setComments(data.comments ?? []);
    } else if (!result.error) {
      dropCanlarPost(id);
      setPost(null);
    }
  };

  const remove = () => {
    if (!post || !id) return;
    Alert.alert(
      post.vora_post_id ? 'Gönderiyi sil' : 'Paylaşımı sil',
      post.vora_post_id
        ? 'Bu kayıt Vora akışındaki gönderiyle birlikte kalkar.'
        : 'Paylaşım listeden kalkar. Bağış veya ihbar dosyası silinmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await deleteCanlarPost(id);
              if (result.error) {
                setError(result.error);
                return;
              }
              if (post.vora_post_id && user && post.author_id === user.id) {
                await deletePost(post.vora_post_id, user.id);
              }
              dropCanlarPost(id);
              router.back();
            })();
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      const next = id ? readCanlarPost(id) : null;
      setPost((next?.post as PostRecord | undefined) ?? null);
      setLiked(Boolean(next?.liked));
      setSaved(Boolean(next?.saved));
      setCanDelete(Boolean(next?.can_delete));
      setComments((next?.comments as CanlarComment[] | undefined) ?? []);
      void load();
    }, [id]),
  );

  useEffect(() => {
    if (commentsParam === '1' && post) setCommentsOpen(true);
  }, [commentsParam, post]);

  const markOutcome = async (outcome: ListingOutcome) => {
    if (!post) return;
    const result = await setListingOutcome(post.id, outcome);
    if (result.error) setError(result.error);
    else void load();
  };

  const like = async () => {
    if (!user || !post) return;
    if (post.vora_post_id) {
      const result = await togglePostLike(post.vora_post_id, user.id, liked);
      if (result.error) setError(result.error);
    } else {
      const result = await toggleCanlarLike(post.id);
      if (result.error) setError(result.error);
    }
    void load();
  };

  const save = async () => {
    if (!user || !post) return;
    if (post.vora_post_id) {
      const result = await togglePostSave(post.vora_post_id, user.id, saved);
      if (result.error) setError(result.error);
      else setSaved(!saved);
    } else {
      const result = await toggleCanlarSave(post.id);
      if (result.error) setError(result.error);
      else setSaved(Boolean(result.data));
    }
  };

  const mediaUrls = (post?.media ?? []).map((item) => item.url).filter((url): url is string => Boolean(url));

  return (
    <CanlarScaffold
      title="İlan"
      overlay={mediaUrls.length > 0}
      hero={mediaUrls.length > 0 ? <CanlarMediaGallery urls={mediaUrls} bleed /> : null}
    >
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!post ? <CanlarEmpty label="Gönderi bulunamadı." /> : (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <CanlarAuthorRow
                name={post.author_label || 'Topluluk'}
                meta={post.city_label}
                userId={post.author_id}
              />
            </View>
            <CanlarListingMenu
              canManage={canDelete || Boolean(user && post.author_id === user.id)}
              outcome={post.outcome}
              onEdit={() => router.push(`/vora-canlar/post/edit/${post.id}` as never)}
              onOutcome={(outcome) => void markOutcome(outcome)}
              onDelete={remove}
            />
          </View>
          <CanlarStatusPill label={describeCanlarPost(post).label} />
          <Text style={{ fontSize: 17, lineHeight: 26 }}>{post.body}</Text>
          <Text secondary>{post.like_count} beğeni · {post.comment_count} yorum</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => void like()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={CANLAR_ACCENT} />
              <Text style={{ color: CANLAR_ACCENT, fontWeight: '800' }}>{liked ? 'Beğeniyi geri al' : 'Beğen'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void save()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? CANLAR_ACCENT : colors.text} />
              <Text style={{ fontWeight: '700', color: saved ? CANLAR_ACCENT : colors.text }}>{saved ? 'Kaydedildi' : 'Kaydet'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void shareCanlarListing({ id: post.id, body: post.body, city: post.city_label })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}
            >
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <Text style={{ fontWeight: '700' }}>Paylaş</Text>
            </Pressable>
            {post.vora_post_id ? (
              <Pressable accessibilityRole="button" onPress={() => setReportOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}>
                <Ionicons name="flag-outline" size={18} color={colors.text} />
                <Text style={{ fontWeight: '700' }}>Raporla</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setCommentsOpen(true)}
              style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10 }}
            >
              <Ionicons name="chatbubble-outline" size={14} color={colors.text} />
              <Text style={{ fontWeight: '700', fontSize: 13 }}>Yorumlar</Text>
              <Text secondary variant="caption">{post.comment_count}</Text>
            </Pressable>
          </View>
          {post.outcome ? <CanlarOutcomeTag outcome={post.outcome} /> : null}
          {post.donation_open || post.outcome || post.campaign_id ? (
            <CanlarRaisedBar amountMinor={post.raised_minor ?? 0} />
          ) : null}
          {post.donation_note && post.donation_note !== 'Açık bağış. Sabit hedef yok.' ? <Text>{post.donation_note}</Text> : null}
          {post.donation_open && post.campaign_id ? <CanlarSupportBar campaignId={post.campaign_id} wide /> : null}
          {user && post.author_id === user.id && !post.outcome ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <CanlarButton quiet label="Tedavi oldu" icon="medkit-outline" onPress={() => setPendingOutcome('treating')} />
              <CanlarButton quiet label="İyileşti" icon="happy-outline" onPress={() => setPendingOutcome('recovered')} />
              <CanlarButton quiet label="Maalesef öldü" icon="heart-dislike-outline" onPress={() => setPendingOutcome('lost')} />
              <Text secondary variant="caption">Durum bir kez seçilir ve değiştirilemez.</Text>
            </View>
          ) : null}
        </View>
      )}
      {post ? (
        <CanlarPostComments
          visible={commentsOpen}
          postId={post.id}
          voraPostId={post.vora_post_id}
          authorId={post.author_id}
          onClose={() => setCommentsOpen(false)}
        />
      ) : null}
      {post?.vora_post_id ? (
        <ReportSheet visible={reportOpen} targetType="post" targetId={post.vora_post_id} onClose={() => setReportOpen(false)} />
      ) : null}
      <CanlarOutcomeConfirm
        outcome={pendingOutcome}
        onCancel={() => setPendingOutcome(null)}
        onConfirm={() => {
          const next = pendingOutcome;
          setPendingOutcome(null);
          if (next) void markOutcome(next);
        }}
      />
    </CanlarScaffold>
  );
}

export function CanlarPostCreateScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [body, setBody] = useState('');
  const [city, setCity] = useState('');
  const [addDonate, setAddDonate] = useState(false);
  const [donationNote, setDonationNote] = useState('');
  const [shareToVora, setShareToVora] = useState(false);
  const [draftMedia, setDraftMedia] = useState<CanlarDraftMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    const regionId = profile?.region_id;
    const problems = [
      !user ? 'Paylaşmak için giriş yapın.' : '',
      user && !regionId ? 'Hesabınızda bölge yok. Ayarlardan bölgenizi seçin.' : '',
      body.trim().length < 1 ? 'Paylaşım metni boş. Ne olduğunu yazın.' : '',
      city.trim().length < 2 ? 'Şehir eksik. İl adını yazın.' : '',
    ].filter(Boolean);
    const missing = missingMessage(problems);
    if (missing) {
      setError(missing);
      return;
    }
    if (!user || !regionId) return;
    setBusy(true);
    setError(null);
    try {
      let media: { url: string; kind: string }[] = [];
      let voraPostId: string | null = null;
      if (shareToVora) {
        const created = await createPost({
          authorId: user.id,
          regionId,
          content: `${body}\n\nVora Canlar`,
          category: 'general',
          mediaUris: draftMedia.map((item) => item.uri),
          locationLabel: city || null,
        });
        if (created.error || !created.postId) throw new Error(created.error ?? 'Vora gönderisi oluşturulamadı.');
        voraPostId = created.postId;
        const { data } = await supabase
          .from('posts')
          .select('media_urls')
          .eq('id', created.postId)
          .maybeSingle();
        media = (data?.media_urls ?? []).map((url, index) => ({
          url,
          kind: draftMedia[index]?.kind === 'video' || isLocalVideoUri(url) ? 'video' : 'image',
        }));
      } else {
        media = await Promise.all(
          draftMedia.map(async (item, index) => {
            const uploaded = await uploadPostMedia(user.id, item.uri, index, item.kind);
            if (uploaded.error || !uploaded.url) throw new Error(uploaded.error ?? 'Medya yüklenemedi.');
            return { url: uploaded.url, kind: item.kind };
          }),
        );
      }
      const created = await createCanlarPost({
        body,
        media,
        caseId: null,
        campaignId: null,
        city,
        species: null,
        urgency: 'normal',
      });
      if (created.error || !created.data) throw new Error(created.error ?? 'Canlar gönderisi oluşturulamadı.');
      if (voraPostId) {
        const linked = await linkCanlarVoraPost(created.data, voraPostId);
        if (linked.error) throw new Error(linked.error);
      }
      if (addDonate) {
        const donation = await openListingDonation(created.data, donationNote);
        if (donation.error) throw new Error(donation.error);
      }
      router.replace(`/vora-canlar/post/${created.data}` as never);
    } catch (err) {
      setError(explainCanlarError(err instanceof Error ? err.message : 'Gönderi yayımlanamadı.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CanlarScaffold title="İlan paylaş">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ProfileAvatar username={profile?.username ?? 'u'} avatarUrl={profile?.avatar_url ?? null} size={32} />
        <Text style={{ fontWeight: '800' }}>Yeni ilan</Text>
      </View>
      <CanlarComposeCards body={body} city={city} onBody={setBody} onCity={setCity} />
      <CanlarComposeMedia items={draftMedia} onChange={setDraftMedia} />
      <CanlarDonateToggle
        enabled={addDonate}
        note={donationNote}
        onToggle={() => setAddDonate((value) => !value)}
        onNote={setDonationNote}
      />
      <CanlarPublishMode shareToVora={shareToVora} onChange={setShareToVora} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => { if (!busy) void publish(); }}
        style={{ alignSelf: 'flex-end', minHeight: 40, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CANLAR_ACCENT, opacity: busy ? 0.7 : 1 }}
      >
        <Ionicons name="paper-plane-outline" size={15} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800' }}>{busy ? 'Yayımlanıyor' : 'Paylaş'}</Text>
      </Pressable>
    </CanlarScaffold>
  );
}
