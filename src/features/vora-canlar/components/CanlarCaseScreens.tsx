import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CanlarButton, CanlarCard, CanlarEmpty, CanlarField, CanlarScaffold, CanlarStatusPill } from '@/features/vora-canlar/components/CanlarScaffold';
import {
  CANLAR_ACCENT,
  RESCUE_STATUS_LABELS,
  SPECIES_OPTIONS,
  TREATMENT_LABELS,
  URGENCY_OPTIONS,
} from '@/features/vora-canlar/constants';
import { appendCaseEvent, createCanlarCase, followCanlarCase, loadCaseDetail } from '@/features/vora-canlar/services/api';
import { radius, spacing } from '@/constants/theme';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const { user } = useAuth();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('verifying');

  const load = async () => {
    if (!id) return;
    const result = await loadCaseDetail(id);
    if (result.error) setError(result.error);
    setDetail(result.data);
  };

  useEffect(() => {
    void load();
  }, [id]);

  const record = (detail?.case ?? null) as Record<string, unknown> | null;
  const events = (detail?.events ?? []) as { id: string; to_status: string; note: string | null; created_at: string }[];
  const canUpdate = Boolean(user);

  return (
    <CanlarScaffold title="Kurtarma dosyası">
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!record ? <CanlarEmpty label="Dosya bulunamadı veya yükleniyor." /> : null}
      {record ? (
        <CanlarCard>
          <Text style={{ fontWeight: '800', fontSize: 22 }}>{String(record.name || record.public_code)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <CanlarStatusPill label={RESCUE_STATUS_LABELS[String(record.status)] ?? String(record.status)} />
            {record.treatment_status ? (
              <CanlarStatusPill label={TREATMENT_LABELS[String(record.treatment_status)] ?? String(record.treatment_status)} />
            ) : null}
          </View>
          <Text secondary>{String(record.city_label)}</Text>
          <Text>{String(record.summary ?? '')}</Text>
          <Text secondary>Durum ayrı bir etiket olarak gösterilir. Ölüm, başarı veya iptal bir ilerleme yüzdesine çevrilmez.</Text>
          {record.reporter_label ? <Text secondary>İhbar sahibi: {String(record.reporter_label)}</Text> : <Text secondary>İhbar sahibi adı gizli.</Text>}
          {detail?.location ? <Text secondary>Ayrıntılı konum yalnızca yetkili kişilere açıktır.</Text> : null}
        </CanlarCard>
      ) : null}
      <Text style={{ fontWeight: '700' }}>Geçmiş</Text>
      {events.length === 0 ? <CanlarEmpty label="Henüz durum geçmişi yok." /> : events.map((event) => (
        <CanlarCard key={event.id}>
          <CanlarStatusPill label={RESCUE_STATUS_LABELS[event.to_status] ?? event.to_status} />
          {event.note ? <Text>{event.note}</Text> : null}
          <Text secondary>{new Date(event.created_at).toLocaleString('tr-TR')}</Text>
        </CanlarCard>
      ))}
      <CanlarButton
        label="Takip et veya bırak"
        icon="heart-outline"
        onPress={async () => {
          const allowed = await requireAuth('Takip');
          if (!allowed || !id) return;
          const result = await followCanlarCase(id);
          if (result.error) setError(result.error);
        }}
      />
      {canUpdate && id ? (
        <CanlarCard>
          <Text style={{ fontWeight: '800' }}>Yetkili güncelleme</Text>
          <CanlarField value={note} onChangeText={setNote} placeholder="Açıklama" />
          <CanlarField value={status} onChangeText={setStatus} placeholder="Durum kodu" />
          <CanlarButton
            label="Durumu kaydet"
            icon="checkmark"
            onPress={async () => {
              const result = await appendCaseEvent({ caseId: id, status, treatment: null, note, isPublic: true });
              if (result.error) setError(result.error);
              else void load();
            }}
          />
        </CanlarCard>
      ) : null}
    </CanlarScaffold>
  );
}

export function CanlarCaseCreateScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [species, setSpecies] = useState('cat');
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [city, setCity] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <CanlarScaffold title="Yeni ihbar">
      <Text style={{ color: colors.textSecondary }}>
        Açık adres yalnızca kurtarma dosyasının gizli alanına yazılır. Herkese şehir görünür.
      </Text>
      <Chip choices={SPECIES_OPTIONS} value={species} onChange={setSpecies} />
      <Chip choices={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
      <Field label="Ad (varsa)" value={name} onChange={setName} />
      <Field label="Şehir" value={city} onChange={setCity} />
      <Field label="Ne oldu?" value={summary} onChange={setSummary} multiline />
      <Field label="Yetkililere özel adres notu" value={address} onChange={setAddress} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CanlarButton
        label="İhbarı gönder"
        icon="megaphone-outline"
        onPress={async () => {
          const result = await createCanlarCase({
            species,
            name,
            traits: '',
            summary,
            city,
            region: profile?.region_id ?? null,
            urgency,
            latitude: null,
            longitude: null,
            addressNote: address,
          });
          if (result.error || !result.data) {
            setError(result.error ?? 'İhbar kaydedilemedi.');
            return;
          }
          router.replace(`/vora-canlar/case/${result.data}` as never);
        }}
      />
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
