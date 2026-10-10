import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { CanlarComposeCards, CanlarDonateToggle } from '@/features/vora-canlar/components/CanlarComposeCards';
import { CanlarComposeMedia, type CanlarDraftMedia } from '@/features/vora-canlar/components/CanlarComposeMedia';
import { CanlarButton, CanlarEmpty, CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import { loadListingState, loadPostDetail, updateCanlarListing } from '@/features/vora-canlar/services/api';
import { explainCanlarError, missingMessage } from '@/features/vora-canlar/services/plainLanguage';
import { dropCanlarPost, readCanlarPost, writeCanlarPost } from '@/features/vora-canlar/services/sessionCache';
import { isLocalVideoUri, isVideoUrl } from '@/lib/media/isVideoUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Loaded = {
  body: string;
  city: string;
  media: { url?: string; kind?: string }[];
  donationOpen: boolean;
  donationNote: string;
  outcome: string | null;
  authorId: string | null;
};

export function CanlarPostEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [body, setBody] = useState('');
  const [city, setCity] = useState('');
  const [media, setMedia] = useState<CanlarDraftMedia[]>([]);
  const [addDonate, setAddDonate] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const result = await loadPostDetail(id);
      const flags = await loadListingState([id]);
      const flag = flags.data?.[0];
      const data = result.data as { post?: Loaded & { author_id?: string; city_label?: string | null; donation_open?: boolean; donation_note?: string | null; outcome?: string | null } } | null;
      const post = data?.post;
      if (!post) {
        setError(result.error ?? 'İlan bulunamadı.');
        return;
      }
      const donationNote = flag?.donation_note ?? post.donation_note ?? '';
      const open = Boolean(flag?.donation_open ?? post.donation_open);
      setLoaded({
        body: post.body,
        city: post.city_label ?? '',
        media: post.media ?? [],
        donationOpen: open,
        donationNote: donationNote === 'Açık bağış. Sabit hedef yok.' ? '' : donationNote,
        outcome: flag?.outcome ?? post.outcome ?? null,
        authorId: flag?.author_id ?? post.author_id ?? null,
      });
      setBody(post.body);
      setCity(post.city_label ?? '');
      setMedia((post.media ?? []).flatMap((item) => item.url ? [{ uri: item.url, kind: item.kind === 'video' || isVideoUrl(item.url) ? 'video' as const : 'image' as const }] : []));
      setAddDonate(open);
      setNote(donationNote === 'Açık bağış. Sabit hedef yok.' ? '' : donationNote);
    })();
  }, [id]);

  const save = async () => {
    if (busy) return;
    if (!id || !user) {
      setError('Kaydetmek için giriş yapın.');
      return;
    }
    const problems = [
      body.trim().length < 1 ? 'Paylaşım metni boş. Ne olduğunu yazın.' : '',
      city.trim().length < 2 ? 'Şehir eksik. İl adını yazın.' : '',
    ].filter(Boolean);
    const missing = missingMessage(problems);
    if (missing) {
      setError(missing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        media.map(async (item, index) => {
          if (item.uri.startsWith('http')) return { url: item.uri, kind: item.kind };
          const result = await uploadPostMedia(user.id, item.uri, index, item.kind);
          if (result.error || !result.url) throw new Error(result.error ?? 'Medya yüklenemedi.');
          return { url: result.url, kind: isLocalVideoUri(item.uri) ? 'video' : item.kind };
        }),
      );
      const result = await updateCanlarListing({
        postId: id,
        body,
        city,
        media: uploaded,
        donation: loaded?.outcome ? false : addDonate,
        note,
      });
      if (result.error) throw new Error(result.error);
      const cached = readCanlarPost(id);
      const previous = cached?.post;
      if (previous && typeof previous === 'object') {
        writeCanlarPost(id, {
          ...cached,
          post: {
            ...(previous as object),
            body: body.trim(),
            city_label: city.trim(),
            media: uploaded,
            donation_open: loaded?.outcome ? false : addDonate,
            donation_note: note.trim() || null,
          },
        });
      } else {
        dropCanlarPost(id);
      }
      if (router.canGoBack()) router.back();
      else router.replace(`/vora-canlar/post/${id}` as never);
    } catch (err) {
      setError(explainCanlarError(err instanceof Error ? err.message : 'İlan kaydedilemedi.'));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded && !error) {
    return (
      <CanlarScaffold title="Gönderi düzenle">
        <CanlarEmpty label="İlan yükleniyor." />
      </CanlarScaffold>
    );
  }

  return (
    <CanlarScaffold title="Gönderi düzenle">
      <CanlarComposeCards body={body} city={city} onBody={setBody} onCity={setCity} />
      <CanlarComposeMedia items={media} onChange={setMedia} />
      <CanlarDonateToggle
        enabled={addDonate}
        note={note}
        locked={Boolean(loaded?.outcome)}
        onToggle={() => setAddDonate((value) => !value)}
        onNote={setNote}
      />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CanlarButton label={busy ? 'Kaydediliyor' : 'Kaydet'} icon="checkmark" onPress={() => { if (!busy) void save(); }} />
    </CanlarScaffold>
  );
}
