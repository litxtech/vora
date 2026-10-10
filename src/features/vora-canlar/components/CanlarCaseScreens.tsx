import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CanlarButton, CanlarCard, CanlarEmpty, CanlarField, CanlarHeroImage, CanlarScaffold, CanlarSectionTitle, CanlarStatusPill } from '@/features/vora-canlar/components/CanlarScaffold';
import { CanlarSupportBar } from '@/features/vora-canlar/components/CanlarSupportBar';
import { useCanlarUserSheetOptional } from '@/features/vora-canlar/components/CanlarUserSheet';
import { CanlarUpdateTrail } from '@/features/vora-canlar/components/canlarUi';
import {
  CANLAR_ACCENT,
  RESCUE_STATUS_LABELS,
  SPECIES_OPTIONS,
  TREATMENT_LABELS,
  URGENCY_OPTIONS,
} from '@/features/vora-canlar/constants';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { appendCaseEvent, createCanlarCase, followCanlarCase, loadCaseDetail, withdrawCanlarCase } from '@/features/vora-canlar/services/api';
import { dropCanlarCase, readCanlarCase, writeCanlarCase } from '@/features/vora-canlar/services/sessionCache';
import { radius, spacing } from '@/constants/theme';
import { findCanlarExample } from '@/features/vora-canlar/samples';
import { formatCanlarWhen } from '@/features/vora-canlar/services/contentKind';
import { explainCanlarError, findOpenCampaign, missingMessage } from '@/features/vora-canlar/services/plainLanguage';
import { rescueBadge, speciesLabel } from '@/features/vora-canlar/services/presentation';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const { user } = useAuth();
  const userSheet = useCanlarUserSheetOptional();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(id ? readCanlarCase(id) : null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const example = findCanlarExample(typeof id === 'string' ? id : undefined);

  const load = async () => {
    if (!id || example) return;
    const [result, linked] = await Promise.all([loadCaseDetail(id), findOpenCampaign(id)]);
    if (result.error) setError(result.error);
    if (result.data) {
      writeCanlarCase(id, result.data);
      setDetail(result.data);
    } else if (!result.error) {
      dropCanlarCase(id);
      setDetail(null);
    }
    setCampaignId('id' in linked ? linked.id : null);
  };

  const withdraw = () => {
    if (!id) return;
    Alert.alert('İhbarı sil', 'Dosya iptal edilir ve listelerden kalkar. Bağış kaydı varsa silinemez.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result = await withdrawCanlarCase(id);
            if (result.error) {
              setError(result.error);
              return;
            }
            dropCanlarCase(id);
            router.back();
          })();
        },
      },
    ]);
  };

  useEffect(() => {
    setDetail(id ? readCanlarCase(id) : null);
    void load();
  }, [id]);

  const saveNote = async () => {
    const text = note.trim();
    const caseRow = (detail?.case ?? null) as Record<string, unknown> | null;
    if (!id || !caseRow) return;
    if (text.length < 2) {
      setError('Durumu kısa bir cümleyle yazın.');
      return;
    }
    const current = String(caseRow.status ?? 'verifying');
    const optimistic = {
      id: `local-${Date.now()}`,
      to_status: current,
      note: text,
      created_at: new Date().toISOString(),
    };
    setDetail((prev) => {
      if (!prev) return prev;
      const previous = (prev.events ?? []) as { id: string; to_status: string; note: string | null; created_at: string }[];
      return { ...prev, events: [...previous, optimistic] };
    });
    setNote('');
    setError(null);
    setSavingNote(true);
    const result = await appendCaseEvent({ caseId: id, status: current, treatment: null, note: text, isPublic: true });
    setSavingNote(false);
    if (result.error) {
      setError(explainCanlarError(result.error));
      void load();
      return;
    }
    void load();
  };

  if (example && example.kind === 'case') {
    return (
      <CanlarScaffold title={example.title} hero={<CanlarHeroImage source={example.image} label={example.title} />}>
        <CanlarStatusPill label="Örnektir" />
        <Text style={{ fontSize: 28, fontWeight: '800', lineHeight: 34 }}>{example.title}</Text>
        <Text secondary>{example.city}</Text>
        <CanlarStatusPill label={example.badge} tone={example.tone} />
        <Text style={{ fontSize: 17, lineHeight: 26 }}>{example.summary}</Text>
        <CanlarSectionTitle title="Durum" caption="Örnek kayıttır. Yardım veya bağış başlatmaz." />
        {example.events.map((event) => (
          <CanlarCard key={event.label}>
            <Text style={{ fontWeight: '800' }}>{event.label}</Text>
            <Text secondary>{event.note}</Text>
          </CanlarCard>
        ))}
      </CanlarScaffold>
    );
  }

  const record = (detail?.case ?? null) as Record<string, unknown> | null;
  const events = (detail?.events ?? []) as { id: string; to_status: string; note: string | null; created_at: string }[];
  const canUpdate = Boolean(user);
  const badge = rescueBadge({
    status: record ? String(record.status) : null,
    treatment: record?.treatment_status ? String(record.treatment_status) : null,
    urgency: record?.urgency ? String(record.urgency) : null,
  });
  const latestNote = events.length > 0 ? events[events.length - 1]?.note : null;

  const title = record ? String(record.name || 'İsimsiz kayıt') : 'İlan';
  const meta = record
    ? [speciesLabel(record.species ? String(record.species) : null), record.city_label ? String(record.city_label) : null, record.public_code ? `No ${String(record.public_code)}` : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <CanlarScaffold
      title={title}
      hero={record ? <CanlarHeroImage uri={record.cover_url ? String(record.cover_url) : null} label={title} /> : null}
    >
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!record ? <CanlarEmpty label="Dosya bulunamadı." /> : null}
      {record ? (
        <View style={{ gap: spacing.md }}>
          <Text style={{ fontWeight: '800', fontSize: 28, lineHeight: 34 }}>{title}</Text>
          {meta ? <Text secondary>{meta}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <CanlarStatusPill label={badge.label} tone={badge.tone} />
            {record.treatment_status ? (
              <CanlarStatusPill label={TREATMENT_LABELS[String(record.treatment_status)] ?? String(record.treatment_status)} />
            ) : null}
          </View>
          {latestNote ? <Text style={{ fontWeight: '700', lineHeight: 22 }}>{latestNote}</Text> : null}
          {canUpdate && id ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Durum yaz"
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  minHeight: 40,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  color: colors.text,
                  backgroundColor: colors.surface,
                }}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingNote}
                onPress={() => { if (!savingNote) void saveNote(); }}
                style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 4, opacity: savingNote ? 0.5 : 1 }}
              >
                <Text style={{ color: CANLAR_ACCENT, fontWeight: '800' }}>{savingNote ? 'Kaydediliyor' : 'Kaydet'}</Text>
              </Pressable>
            </View>
          ) : null}
          {record.summary ? <Text style={{ fontSize: 17, lineHeight: 26 }}>{String(record.summary)}</Text> : null}
          {badge.memorial ? (
            <Text>Bu canı saygıyla anıyoruz.</Text>
          ) : (
            <CanlarUpdateTrail count={events.length} note={latestNote} />
          )}
          {record.outcome_note ? <Text>Sonuç: {String(record.outcome_note)}</Text> : null}
          {record.reporter_label ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${String(record.reporter_label)} profili`}
              onPress={() => userSheet?.openUser({
                userId: typeof record.reporter_id === 'string' ? record.reporter_id : null,
                username: String(record.reporter_label),
              })}
            >
              <Text secondary style={{ color: CANLAR_ACCENT, fontWeight: '800' }}>İhbar: {String(record.reporter_label)}</Text>
            </Pressable>
          ) : (
            <Text secondary>İhbar sahibi gizli</Text>
          )}
        </View>
      ) : null}
      {record && !['completed', 'lost', 'cancelled', 'rehomed'].includes(String(record.status)) ? (
        <>
          <CanlarSectionTitle title="Bağış" />
          <CanlarSupportBar caseId={id} campaignId={campaignId} />
        </>
      ) : null}
      {detail?.can_withdraw ? (
        <CanlarButton quiet label="İhbarı sil" icon="trash-outline" onPress={withdraw} />
      ) : null}
      {record ? (
        <CanlarButton
          quiet
          label="Paylaş"
          icon="share-outline"
          onPress={() => {
            void Share.share({
              message: `${String(record.name || record.public_code)} · ${String(record.city_label)} · Vora Canlar`,
            });
          }}
        />
      ) : null}
      <CanlarSectionTitle title="Durum" caption="Ne değişti, sırayla." />
      {events.length === 0 ? <CanlarEmpty label="Henüz durum geçmişi yok." /> : events.map((event) => (
        <CanlarCard key={event.id}>
          <Text style={{ fontWeight: '700' }}>{event.note || (RESCUE_STATUS_LABELS[event.to_status] ?? event.to_status)}</Text>
          <Text secondary>{new Date(event.created_at).toLocaleString('tr-TR')}</Text>
        </CanlarCard>
      ))}
      <CanlarButton
        quiet
        label="Takip et"
        icon="heart-outline"
        onPress={async () => {
          const allowed = await requireAuth('Takip');
          if (!allowed || !id) return;
          const result = await followCanlarCase(id);
          if (result.error) setError(result.error);
        }}
      />
    </CanlarScaffold>
  );
}

export function CanlarCaseCreateScreen() {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const params = useLocalSearchParams<{ urgency?: string }>();
  const initialUrgency = params.urgency === 'critical' || params.urgency === 'urgent' ? params.urgency : 'normal';
  const [species, setSpecies] = useState('cat');
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [city, setCity] = useState('');
  const [urgency, setUrgency] = useState(initialUrgency);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locNote, setLocNote] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);

  const pickPhoto = async (camera: boolean) => {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(camera ? 'Kamera izni yok. Galeriden de ekleyebilirsiniz.' : 'Galeri izni yok. İhbar fotoğrafsız da gönderilebilir.');
      return;
    }
    const picked = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!picked.canceled && picked.assets[0]?.uri) setPhoto(picked.assets[0].uri);
  };

  const attachLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setCoords(null);
      setLocNote('Konum izni yok. Şehir ve adres notu yeterlidir; tam konum herkese açılmaz.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    setLocNote('Konum yalnızca dosyanın gizli alanına yazıldı. Ekranda koordinat gösterilmez.');
  };

  const problems = [
    city.trim().length < 2 ? 'Şehir eksik. İl adını yazın.' : '',
    summary.trim().length < 8 ? 'Ne oldu? çok kısa. En az bir kısa cümle yazın.' : '',
  ].filter(Boolean);

  const submit = async () => {
    if (busy) return;
    const missing = missingMessage(problems);
    if (missing) {
      setError(missing);
      setReview(false);
      return;
    }
    setBusy(true);
    setError(null);
    let coverUrl: string | null = null;
    if (photo) {
      if (!user) {
        setBusy(false);
        setError('Fotoğraf yüklemek için giriş yapın.');
        return;
      }
      const uploaded = await uploadPostMedia(user.id, photo, 0);
      if (uploaded.error || !uploaded.url) {
        setBusy(false);
        setError(explainCanlarError(uploaded.error ?? 'Fotoğraf yüklenemedi. İsterseniz fotoğrafsız gönderebilirsiniz.'));
        return;
      }
      coverUrl = uploaded.url;
    }
    const result = await createCanlarCase({
      species,
      name,
      traits: '',
      summary,
      city,
      region: profile?.region_id ?? null,
      urgency,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      addressNote: address,
      coverUrl,
    });
    setBusy(false);
    if (result.error || !result.data) {
      setError(explainCanlarError(result.error ?? 'İhbar kaydedilemedi.'));
      return;
    }
    router.replace(`/vora-canlar/case/${result.data}` as never);
  };

  return (
    <CanlarScaffold title={urgency === 'normal' ? 'Yeni ihbar' : 'Acil ihbar'}>
      <Text secondary>Herkes yalnızca şehri görür. Açık adres yalnızca yetkililerin dosyasında kalır. Fotoğraf, yüklenebilirse kapağa yazılır.</Text>
      {review ? (
        <CanlarCard>
          <Text style={{ fontWeight: '800' }}>Göndermeden önce</Text>
          {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: 180, borderRadius: radius.lg }} contentFit="cover" /> : <Text secondary>Fotoğraf eklenmedi.</Text>}
          <Text>Tür: {SPECIES_OPTIONS.find((item) => item.id === species)?.label}</Text>
          <Text>Aciliyet: {URGENCY_OPTIONS.find((item) => item.id === urgency)?.label}</Text>
          <Text>Şehir: {city}</Text>
          {name.trim() ? <Text>Ad: {name}</Text> : null}
          <Text>{summary}</Text>
          <Text secondary>{coords ? 'Konum gizli alana yazılacak.' : 'Konum izni yoksa şehir ve adres notu yeterlidir.'}</Text>
          {address.trim() ? <Text secondary>Adres notu yetkililere özel kalır.</Text> : null}
        </CanlarCard>
      ) : (
        <>
          <Text variant="label">Hayvan türü</Text>
          <Chip choices={SPECIES_OPTIONS} value={species} onChange={setSpecies} />
          <Text variant="label">Aciliyet</Text>
          <Chip choices={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
          {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: 200, borderRadius: radius.lg }} contentFit="cover" accessibilityLabel="Seçilen hayvan fotoğrafı" /> : null}
          <CanlarButton label="Galeriden fotoğraf" icon="image-outline" onPress={() => void pickPhoto(false)} />
          <CanlarButton quiet label="Kamerayı aç" icon="camera-outline" onPress={() => void pickPhoto(true)} />
          <Field label="Ad, biliniyorsa" value={name} onChange={setName} />
          <Field label="Şehir" value={city} onChange={setCity} />
          <Field label="Ne oldu? Bir cümle yazın" value={summary} onChange={setSummary} multiline />
          <Field label="Yetkililere özel adres notu" value={address} onChange={setAddress} />
          <CanlarButton label={coords ? 'Konum eklendi' : 'Bulunduğum konumu ekle'} icon="location-outline" onPress={() => void attachLocation()} />
          {locNote ? <Text secondary>{locNote}</Text> : null}
        </>
      )}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {review ? (
        <>
          <CanlarButton quiet label="Düzenlemeye dön" icon="arrow-back" onPress={() => setReview(false)} />
          <CanlarButton label={busy ? 'Gönderiliyor' : 'İhbarı gönder'} icon="megaphone-outline" onPress={() => void submit()} />
        </>
      ) : (
        <CanlarButton
          label="Bilgileri kontrol et"
          icon="checkmark-circle-outline"
          onPress={() => {
            const missing = missingMessage(problems);
            if (missing) setError(missing);
            else {
              setError(null);
              setReview(true);
            }
          }}
        />
      )}
      <Text secondary>Durum notları, yardım bekleyenler sayfasının sağ üstündeki Durum butonundadır.</Text>
    </CanlarScaffold>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <CanlarField value={value} onChangeText={onChange} placeholder={label} multiline={multiline} />;
}

function Chip({ choices, value, onChange }: { choices: readonly { id: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {choices.map((choice) => {
        const active = value === choice.id;
        return (
          <Pressable
            key={choice.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(choice.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: active ? CANLAR_ACCENT : colors.border,
              backgroundColor: active ? `${CANLAR_ACCENT}22` : colors.surface,
            }}
          >
            <Text style={{ fontWeight: active ? '800' : '500', color: active ? CANLAR_ACCENT : colors.text }}>{choice.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
