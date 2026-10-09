import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import {
  CanlarButton,
  CanlarCard,
  CanlarEmpty,
  CanlarField,
  CanlarScaffold,
  CanlarStatusPill,
} from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_ACCENT, RESCUE_STATUS_LABELS, SPECIES_OPTIONS, TREATMENT_LABELS, URGENCY_OPTIONS } from '@/features/vora-canlar/constants';
import { searchCanlarCases, type CanlarCaseCard } from '@/features/vora-canlar/services/api';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const RESCUE_FILTERS = ['new_report', 'verifying', 'treatment', 'rescued', 'completed', 'lost'] as const;

export function CanlarSearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [species, setSpecies] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [treatment, setTreatment] = useState<string | null>(null);
  const [rows, setRows] = useState<CanlarCaseCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setError(null);
    const result = await searchCanlarCases({
      query: query.trim() || null,
      city: city.trim() || null,
      species,
      urgency,
      status,
      treatment,
      limit: 20,
      offset: 0,
    });
    if (result.error) setError(result.error);
    setRows(result.data ?? []);
  };

  return (
    <CanlarScaffold title="Arama ve filtre">
      <Text style={{ color: colors.textSecondary }}>
        Tam adres ve ihbar sahibi konumu listelenmez. Şehir ve durum yeterlidir.
      </Text>
      <CanlarField value={query} onChangeText={setQuery} placeholder="Ad veya açıklama" />
      <CanlarField value={city} onChangeText={setCity} placeholder="Şehir" />
      <ChipRow options={SPECIES_OPTIONS} value={species} onChange={setSpecies} />
      <ChipRow options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
      <ChipRow options={RESCUE_FILTERS.map((id) => ({ id, label: RESCUE_STATUS_LABELS[id] }))} value={status} onChange={setStatus} />
      <ChipRow options={Object.entries(TREATMENT_LABELS).map(([id, label]) => ({ id, label }))} value={treatment} onChange={setTreatment} />
      <CanlarButton label="Filtrele" icon="search" onPress={() => void search()} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {rows === null ? <CanlarEmpty label="Filtre seçip arayın." /> : null}
      {rows?.length === 0 ? <CanlarEmpty label="Bu filtrelere uyan kayıt yok." /> : null}
      {rows?.map((row) => (
        <Pressable key={row.id} onPress={() => router.push(`/vora-canlar/case/${row.id}` as never)}>
          <CanlarCard>
            <Text style={{ fontWeight: '800' }}>{row.name || row.public_code}</Text>
            <CanlarStatusPill label={RESCUE_STATUS_LABELS[row.status ?? ''] ?? row.status ?? 'Kayıt'} />
            <Text secondary>{row.city_label}</Text>
          </CanlarCard>
        </Pressable>
      ))}
    </CanlarScaffold>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: readonly { id: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(active ? null : option.id)}
            style={{
              borderWidth: 1,
              borderColor: active ? CANLAR_ACCENT : colors.border,
              backgroundColor: active ? `${CANLAR_ACCENT}22` : colors.surface,
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontWeight: active ? '800' : '500', color: active ? CANLAR_ACCENT : colors.text }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
