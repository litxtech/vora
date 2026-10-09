import { useEffect, useState } from 'react';
import { Pressable, Share, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase/client';
import { createPost } from '@/features/compose/services/createPost';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { addComment, togglePostLike, togglePostSave } from '@/features/feed/services/engagement';
import { CanlarCard, CanlarEmpty, CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import {
  addCanlarComment,
  createCanlarPost,
  linkCanlarVoraPost,
  loadPostDetail,
  toggleCanlarLike,
  toggleCanlarSave,
} from '@/features/vora-canlar/services/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type PostRecord = {
  id: string;
  body: string;
  city_label: string | null;
  vora_post_id: string | null;
  case_id: string | null;
  campaign_id: string | null;
  like_count: number;
  comment_count: number;
  media: { url?: string }[];
};

export function CanlarPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [post, setPost] = useState<PostRecord | null>(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<{ id: string; body: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const result = await loadPostDetail(id);
    if (result.error) setError(result.error);
    const data = result.data as { post?: PostRecord; liked?: boolean; comments?: { id: string; body: string }[] } | null;
    setPost(data?.post ?? null);
    setLiked(Boolean(data?.liked));
    setComments(data?.comments ?? []);
  };

  useEffect(() => {
    void load();
  }, [id]);

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
      const result = await togglePostSave(post.vora_post_id, user.id, false);
      if (result.error) setError(result.error);
    } else {
      const result = await toggleCanlarSave(post.id);
      if (result.error) setError(result.error);
    }
  };

  const comment = async () => {
    if (!user || !post || !draft.trim()) return;
    if (post.vora_post_id) {
      const result = await addComment(post.vora_post_id, user.id, draft.trim());
      if (result.error) setError(result.error);
    } else {
      const result = await addCanlarComment(post.id, draft.trim());
      if (result.error) setError(result.error);
    }
    setDraft('');
    void load();
  };

  return (
    <CanlarScaffold title="Hayvan gönderisi">
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!post ? <CanlarEmpty label="Gönderi bulunamadı." /> : (
        <CanlarCard>
          <Text>{post.body}</Text>
          <Text secondary>{post.city_label || 'Hassas konum paylaşılmıyor'}</Text>
          <Text secondary>{post.like_count} beğeni · {post.comment_count} yorum</Text>
          {post.vora_post_id ? <Text secondary>Etkileşimler bağlı Vora gönderisinde tek sayaçta tutulur.</Text> : null}
          <Pressable onPress={() => void like()}><Text style={{ color: CANLAR_ACCENT, fontWeight: '700' }}>{liked ? 'Beğeniyi geri al' : 'Beğen'}</Text></Pressable>
          <Pressable onPress={() => void save()}><Text>Kaydet</Text></Pressable>
          <Pressable onPress={() => void Share.share({ message: post.body })}><Text>Paylaş</Text></Pressable>
          {post.case_id ? <Pressable onPress={() => router.push(`/vora-canlar/case/${post.case_id}` as never)}><Text>Kurtarma dosyası</Text></Pressable> : null}
          {post.campaign_id ? <Pressable onPress={() => router.push(`/vora-canlar/campaign/${post.campaign_id}` as never)}><Text>Kampanya</Text></Pressable> : null}
        </CanlarCard>
      )}
      {post?.vora_post_id ? <Text secondary>Yorumlar Vora gönderisinin kendi ekranında tutulur.</Text> : comments.map((item) => (
        <CanlarCard key={item.id}><Text>{item.body}</Text></CanlarCard>
      ))}
      <TextInput value={draft} onChangeText={setDraft} placeholder="Yorum" placeholderTextColor={colors.textMuted} style={[field, { color: colors.text, borderColor: colors.border }]} />
      <Pressable onPress={() => void comment()} style={button}><Text style={buttonText}>Yorumu gönder</Text></Pressable>
    </CanlarScaffold>
  );
}

export function CanlarPostCreateScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [body, setBody] = useState('');
  const [city, setCity] = useState('');
  const [caseId, setCaseId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [shareToVora, setShareToVora] = useState(false);
  const [uris, setUris] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Fotoğraf seçmek için galeri izni gerekir.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!picked.canceled) setUris(picked.assets.map((asset) => asset.uri));
  };

  const publish = async () => {
    const regionId = profile?.region_id;
    if (!user || !regionId) {
      setError('Gönderi için doğrulanmış bir hesap ve bölge gerekir.');
      return;
    }
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
          mediaUris: uris,
          locationLabel: city || null,
        });
        if (created.error || !created.postId) throw new Error(created.error ?? 'Vora gönderisi oluşturulamadı.');
        voraPostId = created.postId;
        const { data } = await supabase
          .from('posts')
          .select('media_urls')
          .eq('id', created.postId)
          .maybeSingle();
        media = (data?.media_urls ?? []).map((url) => ({ url, kind: 'image' }));
      } else {
        for (const [index, uri] of uris.entries()) {
          const uploaded = await uploadPostMedia(user.id, uri, index);
          if (uploaded.error || !uploaded.url) throw new Error(uploaded.error ?? 'Medya yüklenemedi.');
          media.push({ url: uploaded.url, kind: 'image' });
        }
      }
      const created = await createCanlarPost({
        body,
        media,
        caseId: caseId.trim() || null,
        campaignId: campaignId.trim() || null,
        city,
        species: null,
        urgency: 'normal',
      });
      if (created.error || !created.data) throw new Error(created.error ?? 'Canlar gönderisi oluşturulamadı.');
      if (voraPostId) {
        const linked = await linkCanlarVoraPost(created.data, voraPostId);
        if (linked.error) throw new Error(linked.error);
      }
      router.replace(`/vora-canlar/post/${created.data}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gönderi yayımlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <CanlarScaffold title="Hayvan gönderisi">
      <Text style={{ color: colors.textSecondary }}>
        Yalnızca Vora Canlar’da yayımlanır. Vora akışına da eklenirse aynı içeriğin etkileşimleri tek gönderide toplanır.
      </Text>
      <TextInput value={body} onChangeText={setBody} placeholder="Ne paylaşmak istiyorsunuz?" placeholderTextColor={colors.textMuted} multiline style={[field, { minHeight: 120, color: colors.text, borderColor: colors.border }]} />
      <TextInput value={city} onChangeText={setCity} placeholder="Şehir" placeholderTextColor={colors.textMuted} style={[field, { color: colors.text, borderColor: colors.border }]} />
      <TextInput value={caseId} onChangeText={setCaseId} placeholder="Kurtarma dosyası kimliği (isteğe bağlı)" placeholderTextColor={colors.textMuted} style={[field, { color: colors.text, borderColor: colors.border }]} />
      <TextInput value={campaignId} onChangeText={setCampaignId} placeholder="Kampanya kimliği (isteğe bağlı)" placeholderTextColor={colors.textMuted} style={[field, { color: colors.text, borderColor: colors.border }]} />
      <Pressable onPress={() => void pick()}><Text style={{ color: CANLAR_ACCENT }}>{uris.length ? `${uris.length} görsel seçildi` : 'Fotoğraf ekle'}</Text></Pressable>
      <Pressable onPress={() => setShareToVora((value) => !value)}>
        <Text>{shareToVora ? 'Vora akışında da paylaşılacak' : 'Yalnızca Vora Canlar’da yayınla'}</Text>
      </Pressable>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable disabled={busy} onPress={() => void publish()} style={button}>
        <Text style={buttonText}>{busy ? 'Yayımlanıyor' : 'Yayımla'}</Text>
      </Pressable>
    </CanlarScaffold>
  );
}

const field = { borderWidth: 1, borderRadius: 12, padding: 12 } as const;
const button = { backgroundColor: CANLAR_ACCENT, borderRadius: 12, padding: 14 } as const;
const buttonText = { color: '#fff', fontWeight: '700', textAlign: 'center' } as const;
