import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { LOCATION_SEARCH_MIN_CHARS } from '@/features/map/constants';
import type { MapSearchHit } from '@/features/map/services/mapSearch';
import type { MapLocationSource } from '@/features/map/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { getAndroidFlatListPerfProps, shouldSkipUiBlur } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

const SOURCE_ICONS: Record<MapLocationSource, keyof typeof Ionicons.glyphMap> = {
  business: 'storefront-outline',
  event: 'calendar-outline',
  tourism: 'compass-outline',
  marketplace: 'pricetag-outline',
  district: 'map-outline',
  post_label: 'pin-outline',
  place: 'location-outline',
  gps: 'navigate-outline',
};

type MapSearchResultsProps = {
  visible: boolean;
  loading?: boolean;
  query: string;
  onMap: MapSearchHit[];
  places: MapSearchHit[];
  resolvingId?: string | null;
  onSelect: (hit: MapSearchHit) => void;
};

type SearchListRow =
  | { id: string; type: 'section'; title: string }
  | { id: string; type: 'hit'; hit: MapSearchHit };

function Section({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text variant="caption" style={[styles.sectionTitle, { color: colors.textMuted }]}>
      {title}
    </Text>
  );
}

function SearchHitRow({
  hit,
  resolvingId,
  onSelect,
}: {
  hit: MapSearchHit;
  resolvingId?: string | null;
  onSelect: (hit: MapSearchHit) => void;
}) {
  const { colors } = useTheme();

  if (hit.kind === 'marker') {
    return (
      <Pressable
        onPress={() => onSelect(hit)}
        disabled={resolvingId !== null}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? `${colors.primary}10` : 'transparent' },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="pin" size={16} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text variant="caption" numberOfLines={1}>
            {hit.label}
          </Text>
          {hit.subtitle ? (
            <Text variant="caption" secondary numberOfLines={2}>
              {hit.subtitle}
            </Text>
          ) : null}
        </View>
        {resolvingId === hit.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        )}
      </Pressable>
    );
  }

  const suggestion = hit.suggestion;
  return (
    <Pressable
      onPress={() => onSelect(hit)}
      disabled={resolvingId !== null}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? `${colors.primary}10` : 'transparent' },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
        <Ionicons name={SOURCE_ICONS[suggestion.source]} size={16} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text variant="caption" numberOfLines={1}>
          {suggestion.label}
        </Text>
        {suggestion.subtitle ? (
          <Text variant="caption" secondary numberOfLines={2}>
            {suggestion.subtitle}
          </Text>
        ) : null}
      </View>
      {resolvingId === hit.id ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

export function MapSearchResults({
  visible,
  loading,
  query,
  onMap,
  places,
  resolvingId,
  onSelect,
}: MapSearchResultsProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];

  const trimmed = query.trim();
  const hasResults = onMap.length > 0 || places.length > 0;

  const listData = useMemo(() => {
    const rows: SearchListRow[] = [];
    if (onMap.length > 0) {
      rows.push({ id: 'section-map', type: 'section', title: 'Haritada' });
      for (const hit of onMap) {
        if (hit.kind === 'marker') rows.push({ id: hit.id, type: 'hit', hit });
      }
    }
    if (places.length > 0) {
      rows.push({ id: 'section-places', type: 'section', title: 'Konumlar' });
      for (const hit of places) {
        if (hit.kind === 'location') rows.push({ id: hit.id, type: 'hit', hit });
      }
    }
    return rows;
  }, [onMap, places]);

  if (!visible) return null;

  const listHeader = (
    <>
      {loading && !hasResults ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" secondary>
            Aranıyor…
          </Text>
        </View>
      ) : null}

      {!loading && trimmed.length >= LOCATION_SEARCH_MIN_CHARS && !hasResults ? (
        <Text variant="caption" secondary style={styles.hint}>
          Sonuç bulunamadı. Farklı bir terim deneyin veya kategori filtrelerini genişletin.
        </Text>
      ) : null}

      {!loading && trimmed.length > 0 && trimmed.length < LOCATION_SEARCH_MIN_CHARS ? (
        <Text variant="caption" secondary style={styles.hint}>
          En az {LOCATION_SEARCH_MIN_CHARS} karakter yazın.
        </Text>
      ) : null}

      {!loading && trimmed.length === 0 ? (
        <Text variant="caption" secondary style={styles.hint}>
          İşletme, etkinlik, ilçe veya adres arayın. Haritadaki pinler ve bölge veritabanı taranır.
        </Text>
      ) : null}
    </>
  );

  const shellContent = (
    <View style={[styles.inner, { borderColor: colors.border, backgroundColor: surface.background }]}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        {...getAndroidFlatListPerfProps()}
        renderItem={({ item }) =>
          item.type === 'section' ? (
            <Section title={item.title} />
          ) : (
            <SearchHitRow hit={item.hit} resolvingId={resolvingId} onSelect={onSelect} />
          )
        }
      />
    </View>
  );

  const useBlur = isDark && !shouldSkipUiBlur();

  return (
    <View style={styles.scroll}>
      {useBlur ? (
        <BlurView intensity={28} tint="dark" style={styles.shell}>
          {shellContent}
        </BlurView>
      ) : (
        <View style={[styles.shell, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          {shellContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 280,
    flexGrow: 0,
  },
  scrollContent: {
    flexGrow: 0,
  },
  shell: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  inner: {
    borderWidth: 1,
    paddingVertical: spacing.xs,
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  hint: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
