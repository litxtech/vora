import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import {
  CanlarCampaignVisual,
  CanlarCaseVisual,
  CanlarEmptyState,
  CanlarGlassCard,
  CanlarPostVisual,
  CanlarSearchField,
} from '@/features/vora-canlar/components/canlarUi';
import { CANLAR_ACCENT, SPECIES_OPTIONS } from '@/features/vora-canlar/constants';
import { searchCanlarCases, type CanlarCampaignCard, type CanlarCaseCard, type CanlarPostCard } from '@/features/vora-canlar/services/api';
import { useCanlarFeed } from '@/features/vora-canlar/hooks/useCanlarFeed';
import { readCanlarSearch, writeCanlarSearch } from '@/features/vora-canlar/services/sessionCache';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function matchesBand(row: CanlarCaseCard, band: string) {
  const status = row.status ?? '';
  const treatment = row.treatment_status ?? '';
  const urgency = row.urgency ?? '';
  if (band === 'urgent') return (urgency === 'urgent' || urgency === 'critical') && !['completed', 'lost', 'cancelled', 'duplicate'].includes(status);
  if (band === 'new') return ['new_report', 'awaiting_review', 'verifying'].includes(status);
  if (band === 'rescued') return status === 'rescued';
  if (band === 'treatment') return ['treatment', 'vet_assessment'].includes(status) || ['ongoing', 'assessment'].includes(treatment);
  if (band === 'recovery') return status === 'recovery' || treatment === 'recovery';
  if (band === 'healed') return status === 'completed' || treatment === 'completed';
  if (band === 'lost') return status === 'lost' || treatment === 'lost';
  if (band === 'rehome') return status === 'rehomed';
  return true;
}

const BANDS = [
  { id: 'all', label: 'Tümü' },
  { id: 'urgent', label: 'Acil' },
  { id: 'new', label: 'Yeni' },
  { id: 'rescued', label: 'Kurtarılan' },
  { id: 'treatment', label: 'Tedavi' },
  { id: 'recovery', label: 'İyileşme' },
  { id: 'healed', label: 'İyileşen' },
  { id: 'lost', label: 'Kaybedilen' },
  { id: 'rehome', label: 'Yuva' },
  { id: 'campaigns', label: 'Kampanya' },
  { id: 'completed', label: 'Tamamlanan' },
  { id: 'stories', label: 'Hikâye' },
];

type WindowItem =
  | { key: string; kind: 'case'; row: CanlarCaseCard }
  | { key: string; kind: 'campaign'; row: CanlarCampaignCard }
  | { key: string; kind: 'post'; row: CanlarPostCard };

export function CanlarExploreScreen() {
  const params = useLocalSearchParams<{ band?: string; q?: string }>();
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const initial = BANDS.some((item) => item.id === params.band) ? String(params.band) : 'all';
  const [band, setBand] = useState(initial);
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [species, setSpecies] = useState<string | null>(null);
  const [sort, setSort] = useState<'new' | 'urgent'>('new');
  const searchKey = `${band}|${query.trim()}|${species ?? ''}|${sort}`;
  const [rows, setRows] = useState<CanlarCaseCard[] | null>(() => readCanlarSearch(searchKey));
  const [trackedKey, setTrackedKey] = useState(searchKey);
  const { feed, refreshing, error: feedError } = useCanlarFeed();
  const [error, setError] = useState<string | null>(null);
  const [docked, setDocked] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [gridWidth, setGridWidth] = useState(0);

  if (trackedKey !== searchKey) {
    setTrackedKey(searchKey);
    setRows(readCanlarSearch(searchKey));
  }

  const load = useCallback(async () => {
    if (band === 'campaigns' || band === 'completed' || band === 'stories') {
      setRows([]);
      return;
    }
    const result = await searchCanlarCases({
      query: query.trim() || null,
      species,
      band: band === 'all' ? null : band,
      sort: sort === 'urgent' ? 'urgent' : null,
      limit: 20,
      offset: 0,
    });
    if (result.error) setError(result.error);
    else setError(null);
    const next = (result.data ?? []).filter((row) => band === 'all' || matchesBand(row, band));
    writeCanlarSearch(searchKey, next);
    setRows(next);
  }, [band, query, species, sort, searchKey]);

  useEffect(() => {
    if (typeof params.band === 'string' && BANDS.some((item) => item.id === params.band)) {
      setBand(params.band);
    }
  }, [params.band]);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const next = value > 56;
      setDocked((current) => (current === next ? current : next));
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const caseBands = band !== 'campaigns' && band !== 'completed' && band !== 'stories';
  const bandLabel = BANDS.find((item) => item.id === band)?.label ?? 'Tümü';
  const speciesLabel = SPECIES_OPTIONS.find((item) => item.id === species)?.label;
  const dockLabel = [bandLabel, speciesLabel, sort === 'urgent' ? 'Acil önce' : null].filter(Boolean).join(' · ');
  const chipOpacity = scrollY.interpolate({
    inputRange: [12, 64],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const chipShift = scrollY.interpolate({
    inputRange: [12, 64],
    outputRange: [10, 0],
    extrapolate: 'clamp',
  });
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true });
  const measured = gridWidth > 0 ? gridWidth : Math.max(0, screenWidth - spacing.md * 2);
  const columnWidth = measured > 0 ? (measured - 10) / 2 : undefined;

  const windows: WindowItem[] = [];
  if (caseBands) {
    for (const row of rows ?? []) windows.push({ key: `case-${row.id}`, kind: 'case', row });
  }
  if (band === 'all' || band === 'campaigns') {
    for (const row of feed.campaigns) windows.push({ key: `campaign-${row.id}`, kind: 'campaign', row });
  }
  if (band === 'completed') {
    for (const row of feed.completed_campaigns) windows.push({ key: `done-${row.id}`, kind: 'campaign', row });
    for (const row of feed.delivered_aid) {
      windows.push({
        key: `aid-${row.id}`,
        kind: 'case',
        row: {
          id: row.case_id ?? '',
          name: row.name || 'Teslim edilen destek',
          city_label: row.city_label ?? undefined,
          cover_url: row.cover_url,
          summary: row.quantity_note ?? 'Teslim edildi',
          status: 'completed',
          created_at: row.created_at,
        },
      });
    }
  }
  if (band === 'all' || band === 'stories') {
    for (const row of feed.posts) windows.push({ key: `post-${row.id}`, kind: 'post', row });
  }

  const showCaseEmpty = caseBands && rows?.length === 0 && windows.length === 0;
  const showCompletedEmpty = band === 'completed' && feed.completed_campaigns.length === 0 && feed.delivered_aid.length === 0;

  return (
    <CanlarScaffold
      title="Keşfet"
      refreshing={refreshing}
      onRefresh={() => void load()}
      scrollRef={scrollRef}
      onScroll={onScroll}
      headerAccessory={
        <View pointerEvents={docked ? 'auto' : 'none'} style={{ width: docked ? undefined : 0, overflow: 'hidden' }}>
          <Animated.View style={{ opacity: chipOpacity, transform: [{ translateY: chipShift }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filtre ${dockLabel}. Filtreleri aç`}
              onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
              style={[styles.headerChip, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.08)', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)' }]}
            >
              <Text numberOfLines={1} style={styles.headerChipText}>{dockLabel}</Text>
            </Pressable>
          </Animated.View>
        </View>
      }
    >
      <View style={styles.page}>
        <CanlarGlassCard>
          <View style={styles.dock}>
            <CanlarSearchField quiet value={query} onChangeText={setQuery} placeholder="Ad, şehir veya açıklama" onSubmit={() => void load()} />
            <FilterRail
              items={BANDS}
              value={band}
              onChange={setBand}
            />
            <View style={styles.dockRow}>
              <View style={styles.speciesSlot}>
                <FilterRail
                  items={[{ id: 'any', label: 'Tür' }, ...SPECIES_OPTIONS.map((item) => ({ id: item.id, label: item.label }))]}
                  value={species ?? 'any'}
                  onChange={(id) => setSpecies(id === 'any' ? null : id)}
                />
              </View>
              <View style={[styles.segment, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)' }]}>
                <Segment label="Yeni" selected={sort === 'new'} onPress={() => setSort('new')} />
                <Segment label="Acil" selected={sort === 'urgent'} onPress={() => setSort('urgent')} />
              </View>
            </View>
          </View>
        </CanlarGlassCard>
        {rows === null ? <ActivityIndicator color={CANLAR_ACCENT} /> : null}
        {error || feedError ? <Text style={{ color: colors.danger }}>{error || feedError}</Text> : null}
        {band === 'lost' ? (
          <Text secondary>Kaybedilen canlar ayrı gösterilir. Bu liste süren tedaviyi veya başarısız bir yüzdeyi birleştirmez.</Text>
        ) : null}
        {showCaseEmpty ? <CanlarEmptyState title="Bu filtrede kayıt yok" body="Başka bir kategori veya arama deneyin." /> : null}
        {showCompletedEmpty ? (
          <CanlarEmptyState title="Tamamlanan yardım yok" body="Sonuçlanan kampanyalar ve teslim edilen destekler burada durur." />
        ) : null}
        <View style={styles.mosaic} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
          {windows.map((item) => (
            <View key={item.key} style={columnWidth ? { width: columnWidth } : styles.cellFallback}>
              <WindowTile item={item} />
            </View>
          ))}
        </View>
      </View>
    </CanlarScaffold>
  );
}

function WindowTile({ item }: { item: WindowItem }) {
  if (item.kind === 'case') {
    return (
      <CanlarCaseVisual
        tile
        row={item.row}
        onPress={() => {
          if (!item.row.id) return;
          router.push(`/vora-canlar/case/${item.row.id}` as never);
        }}
      />
    );
  }
  if (item.kind === 'campaign') {
    return (
      <CanlarCampaignVisual
        tile
        row={item.row}
        onPress={() => router.push(`/vora-canlar/campaign/${item.row.id}` as never)}
      />
    );
  }
  return (
    <CanlarPostVisual
      tile
      post={item.row}
      onPress={() => router.push(`/vora-canlar/post/${item.row.id}` as never)}
    />
  );
}

function FilterRail({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? CANLAR_ACCENT : 'transparent',
                borderColor: selected ? CANLAR_ACCENT : isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.1)',
              },
            ]}
          >
            <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.segmentBtn, selected ? { backgroundColor: CANLAR_ACCENT } : null]}
    >
      <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '800', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  dock: { padding: 10, gap: 8 },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speciesSlot: { flex: 1, minWidth: 0 },
  rail: { gap: 6, paddingRight: 4 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 2 },
  segmentBtn: { borderRadius: 999, paddingHorizontal: 10, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  mosaic: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cellFallback: { width: '48%' },
  headerChip: {
    maxWidth: 148,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 26,
    justifyContent: 'center',
  },
  headerChipText: { color: CANLAR_ACCENT, fontSize: 12, fontWeight: '800' },
});
