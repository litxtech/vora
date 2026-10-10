import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import {
  CanlarButton,
  CanlarField,
  CanlarScaffold,
} from '@/features/vora-canlar/components/CanlarScaffold';
import { CanlarCaseVisual, CanlarEmptyState } from '@/features/vora-canlar/components/canlarUi';
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

  const search = async (next?: {
    query?: string;
    city?: string;
    species?: string | null;
    urgency?: string | null;
    status?: string | null;
    treatment?: string | null;
  }) => {
    const filters = {
      query: (next?.query ?? query).trim() || null,
      city: (next?.city ?? city).trim() || null,
      species: next && 'species' in next ? next.species ?? null : species,
      urgency: next && 'urgency' in next ? next.urgency ?? null : urgency,
      status: next && 'status' in next ? next.status ?? null : status,
      treatment: next && 'treatment' in next ? next.treatment ?? null : treatment,
    };
    setError(null);
    const result = await searchCanlarCases({ ...filters, limit: 20, offset: 0 });
    if (result.error) setError(result.error);
    setRows(result.data ?? []);
  };

  useEffect(() => {
    void search();
  }, []);

  return (
    <CanlarScaffold title="Vaka ara">
      <Text secondary>Tam adres listelenmez. Filtreler sorguyu değiştirir. Mesafe sıralaması bu kayıtta yok.</Text>
      <CanlarField value={query} onChangeText={setQuery} placeholder="Ad veya açıklama" />
      <CanlarField value={city} onChangeText={setCity} placeholder="Şehir" />
      <FilterGroup label="Tür">
        <ChipRow options={SPECIES_OPTIONS} value={species} onChange={setSpecies} />
      </FilterGroup>
      <FilterGroup label="Aciliyet">
        <ChipRow options={URGENCY_OPTIONS} value={urgency} onChange={setUrgency} />
      </FilterGroup>
      <FilterGroup label="Kurtarma durumu">
        <ChipRow options={RESCUE_FILTERS.map((id) => ({ id, label: RESCUE_STATUS_LABELS[id] }))} value={status} onChange={setStatus} />
      </FilterGroup>
      <FilterGroup label="Tedavi">
        <ChipRow options={Object.entries(TREATMENT_LABELS).map(([id, label]) => ({ id, label }))} value={treatment} onChange={setTreatment} />
      </FilterGroup>
      <CanlarButton label="Filtrele" icon="search" onPress={() => void search()} />
      <CanlarButton
        quiet
        label="Filtreleri temizle"
        icon="refresh-outline"
        onPress={() => {
          setQuery('');
          setCity('');
          setSpecies(null);
          setUrgency(null);
          setStatus(null);
          setTreatment(null);
          void search({ query: '', city: '', species: null, urgency: null, status: null, treatment: null });
        }}
      />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {rows === null ? <CanlarEmptyState title="Kayıtlar yükleniyor" body="Arama sonuçları birazdan kart olarak gelir." /> : null}
      {rows?.length === 0 ? <CanlarEmptyState title="Sonuç yok" body="Bu ölçütlere uyan vaka yok. Filtreleri temizleyip yeniden arayın." /> : null}
      {rows?.map((row) => (
        <CanlarCaseVisual key={row.id} row={row} onPress={() => router.push(`/vora-canlar/case/${row.id}` as never)} />
      ))}
    </CanlarScaffold>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
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
