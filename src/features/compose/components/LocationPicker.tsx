import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { resolvePlaceCoordinates } from '@/features/map/services/resolvePlaceCoordinates';
import {
  fetchNearbyMapLocations,
  locationSourceLabel,
  searchMapLocations,
} from '@/features/map/services/locationSearch';
import type { MapCoordinate, MapLocationSource, MapLocationSuggestion } from '@/features/map/types';
import type { LocationGeoScope } from '@/features/map/utils/geoBounds';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type SelectedLocation = {
  label: string;
  subtitle?: string;
  latitude: number | null;
  longitude: number | null;
  source?: MapLocationSource;
  geocodeHint?: string;
  suggestionRegionId?: RegionId;
  mapboxId?: string;
  sessionToken?: string;
};

type LocationPickerProps = {
  regionId: RegionId;
  value: SelectedLocation | null;
  onChange: (location: SelectedLocation | null) => void;
  onTextChange?: (text: string) => void;
  compact?: boolean;
  /** Gönderi / story: dünya geneli. Harita / otel: bölge. */
  scope?: LocationGeoScope;
  hideSelectedChip?: boolean;
};

const SOURCE_ICONS: Record<MapLocationSource, keyof typeof Ionicons.glyphMap> = {
  business: 'storefront-outline',
  event: 'calendar-outline',
  tourism: 'compass-outline',
  marketplace: 'pricetag-outline',
  vora_needs: 'hand-left-outline',
  vora_hizmetler: 'construct-outline',
  district: 'map-outline',
  post_label: 'pin-outline',
  place: 'location-outline',
  gps: 'navigate-outline',
};

function toSelected(suggestion: MapLocationSuggestion): SelectedLocation {
  return {
    label: suggestion.label,
    subtitle: suggestion.subtitle,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    source: suggestion.source,
    geocodeHint: suggestion.geocodeHint,
    suggestionRegionId: suggestion.regionId,
    mapboxId: suggestion.mapboxId,
    sessionToken: suggestion.sessionToken,
  };
}

async function resolveSelectedCoordinates(
  selected: SelectedLocation,
  regionId: RegionId,
  proximity: MapCoordinate | null,
  scope: LocationGeoScope,
): Promise<SelectedLocation> {
  const coords = await resolvePlaceCoordinates({
    label: selected.label,
    regionId,
    suggestionRegionId: selected.suggestionRegionId,
    latitude: selected.latitude,
    longitude: selected.longitude,
    geocodeHint: selected.geocodeHint,
    mapboxId: selected.mapboxId,
    sessionToken: selected.sessionToken,
    source: selected.source,
    proximity: proximity ?? undefined,
    scope,
  });

  if (!coords) {
    return {
      ...selected,
      latitude: null,
      longitude: null,
    };
  }

  return {
    ...selected,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

export function LocationPicker({
  regionId,
  value,
  onChange,
  onTextChange,
  compact,
  scope = 'region',
  hideSelectedChip = false,
}: LocationPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(value?.label ?? '');
  const [suggestions, setSuggestions] = useState<MapLocationSuggestion[]>([]);
  const [nearby, setNearby] = useState<MapLocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [proximity, setProximity] = useState<MapCoordinate | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(`ks-${Date.now()}`);
  const nearbyLoadedRef = useRef(false);

  useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value?.label]);

  useEffect(() => {
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
      if (position) {
        setProximity({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    })();
  }, []);

  const loadNearby = useCallback(async (coords: MapCoordinate) => {
    if (nearbyLoadedRef.current) return;
    nearbyLoadedRef.current = true;
    try {
      const results = await fetchNearbyMapLocations(coords);
      setNearby(results);
    } catch {
      setNearby([]);
    }
  }, []);

  useEffect(() => {
    if (!proximity || scope !== 'world') return;
    void loadNearby(proximity);
  }, [proximity, scope, loadNearby]);

  const runSearch = useCallback(
    async (text: string) => {
      if (text.trim().length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const results = await searchMapLocations(text, regionId, {
          proximity: proximity ?? undefined,
          sessionToken: sessionTokenRef.current,
          scope,
        });
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [regionId, proximity, scope],
  );

  const handleChangeText = (text: string) => {
    setQuery(text);
    onTextChange?.(text);
    if (value && text.trim() !== value.label) {
      onChange(null);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(text);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelect = async (suggestion: MapLocationSuggestion) => {
    setResolvingId(suggestion.id);
    try {
      let selected = toSelected(suggestion);
      selected = await resolveSelectedCoordinates(selected, regionId, proximity, scope);
      onChange(selected);
      setQuery(selected.label);
      setSuggestions([]);
      setFocused(false);
      sessionTokenRef.current = `ks-${Date.now()}`;
    } finally {
      setResolvingId(null);
    }
  };

  const handleUseGps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    setLoading(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const selected: SelectedLocation = {
        label: 'Mevcut Konumum',
        subtitle: locationSourceLabel('gps'),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: 'gps',
      };
      const nextProximity = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setProximity(nextProximity);
      nearbyLoadedRef.current = false;
      if (scope === 'world') void loadNearby(nextProximity);
      onChange(selected);
      setQuery(selected.label);
      setSuggestions([]);
      setFocused(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setSuggestions([]);
  };

  const queryActive = query.trim().length >= 2;
  const listItems = queryActive ? suggestions : nearby;
  const showSuggestions =
    focused && (loading || listItems.length > 0 || queryActive || (scope === 'world' && !!proximity));

  const placeholder =
    scope === 'world'
      ? 'Dünya genelinde konum ara…'
      : 'Esnaf, market, otel, işletme veya adres ara…';

  return (
    <View style={styles.wrap}>
      {!compact ? <Text variant="label">Konum etiketi</Text> : null}
      <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => {
            setFocused(true);
            if (query.trim().length >= 2) void runSearch(query);
            else if (proximity && scope === 'world') void loadNearby(proximity);
          }}
          onBlur={() => {
            setTimeout(() => setFocused(false), 180);
          }}
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        {value ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {showSuggestions ? (
        <View style={[styles.suggestions, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          {loading && listItems.length === 0 ? (
            <View style={styles.suggestionLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="caption" secondary>
                {queryActive ? 'Konumlar aranıyor…' : 'Yakın konumlar yükleniyor…'}
              </Text>
            </View>
          ) : null}

          {!loading && listItems.length === 0 && queryActive ? (
            <Text variant="caption" secondary style={styles.emptyHint}>
              Sonuç bulunamadı. GPS kullanın veya farklı bir arama deneyin.
            </Text>
          ) : null}

          {!loading && !queryActive && listItems.length > 0 ? (
            <Text variant="caption" secondary style={styles.sectionHint}>
              Yakınındaki öneriler
            </Text>
          ) : null}

          {listItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.suggestionRow,
                { backgroundColor: pressed ? `${colors.primary}10` : 'transparent', opacity: resolvingId === item.id ? 0.6 : 1 },
              ]}
              onPress={() => void handleSelect(item)}
              disabled={resolvingId !== null}
            >
              <View style={[styles.suggestionIcon, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons name={SOURCE_ICONS[item.source] ?? 'location-outline'} size={16} color={colors.primary} />
              </View>
              <View style={styles.suggestionText}>
                <Text variant="caption" numberOfLines={1}>
                  {item.label}
                </Text>
                {item.subtitle ? (
                  <Text variant="caption" secondary numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {resolvingId === item.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : item.latitude != null || item.mapboxId ? (
                <Ionicons name="map-outline" size={14} color={colors.textMuted} />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {value && !hideSelectedChip ? (
        <View style={[styles.selectedChip, { backgroundColor: `${colors.accent}12`, borderColor: colors.accent }]}>
          <Ionicons
            name={value.source ? SOURCE_ICONS[value.source] ?? 'pin-outline' : 'pin-outline'}
            size={14}
            color={colors.accent}
          />
          <Text variant="caption" style={{ color: colors.accent, flex: 1 }} numberOfLines={1}>
            {value.label}
            {value.latitude != null ? ' · Haritada' : ' · Yalnızca etiket'}
          </Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.gpsBtn, compact && styles.gpsBtnCompact, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={handleUseGps}
      >
        <Ionicons name="navigate-outline" size={16} color={colors.primary} />
        <Text variant="caption" secondary>
          Mevcut konumumu kullan
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  gpsBtnCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    maxHeight: 360,
    zIndex: 20,
    elevation: 8,
  },
  suggestionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emptyHint: {
    padding: spacing.md,
  },
  sectionHint: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
});
