import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { regionNameById } from '@/constants/regions';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import {
  fetchHotelMarketingSearchSuggestions,
  saveRecentHotelMarketingSearch,
  type HotelSearchSuggestion,
} from '@/features/hotel-marketing/services/hotelSearchSuggestions';
import type { AdminHotelSearchResult } from '@/features/hotel-marketing/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const KIND_ICONS: Record<HotelSearchSuggestion['kind'], keyof typeof Ionicons.glyphMap> = {
  recent: 'time-outline',
  popular: 'trending-up-outline',
  hotel: 'bed-outline',
  district: 'location-outline',
};

type Props = {
  query: string;
  onChangeQuery: (value: string) => void;
  selectedHotel: AdminHotelSearchResult | null;
  onSelectHotel: (hotel: AdminHotelSearchResult | null) => void;
};

export function AdminHotelSearchField({ query, onChangeQuery, selectedHotel, onSelectHotel }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<HotelSearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSuggestions = useCallback(async (value: string) => {
    setLoading(true);
    setSuggestions(await fetchHotelMarketingSearchSuggestions(value));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadSuggestions(query);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, loadSuggestions]);

  const handlePickSuggestion = async (item: HotelSearchSuggestion) => {
    if (item.hotel) {
      onSelectHotel(item.hotel);
      onChangeQuery(item.hotel.name);
      await saveRecentHotelMarketingSearch(item.hotel.name);
      setFocused(false);
      return;
    }
    onChangeQuery(item.searchQuery);
    await saveRecentHotelMarketingSearch(item.searchQuery);
    void loadSuggestions(item.searchQuery);
  };

  const showSuggestions = focused && !selectedHotel;

  return (
    <View style={styles.wrap}>
      <AdminSearchInput
        value={query}
        onChangeText={(text) => {
          onChangeQuery(text);
          if (selectedHotel && text !== selectedHotel.name) onSelectHotel(null);
        }}
        placeholder="Otel adı, ilçe veya bölge ara…"
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 180)}
      />

      {selectedHotel ? (
        <Pressable
          onPress={() => {
            onSelectHotel(null);
            onChangeQuery('');
          }}
          style={[styles.selectedCard, { borderColor: HOTEL_ACCENT, backgroundColor: `${HOTEL_ACCENT}10` }]}
        >
          {selectedHotel.coverUrl ? (
            <Image source={{ uri: selectedHotel.coverUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${HOTEL_ACCENT}18` }]}>
              <Ionicons name="bed-outline" size={20} color={HOTEL_ACCENT} />
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" numberOfLines={1}>{selectedHotel.name}</Text>
            <Text secondary variant="caption">
              {regionNameById(selectedHotel.regionId)}
              {selectedHotel.district ? ` · ${selectedHotel.district}` : ''}
            </Text>
          </View>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}

      {showSuggestions ? (
        <View style={[styles.suggestions, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={HOTEL_ACCENT} />
              <Text secondary variant="caption">Öneriler yükleniyor…</Text>
            </View>
          ) : suggestions.length === 0 ? (
            <Text secondary variant="caption" style={styles.emptyHint}>
              Sonuç yok — farklı bir anahtar kelime deneyin
            </Text>
          ) : (
            suggestions.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void handlePickSuggestion(item)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  { opacity: pressed ? 0.75 : 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: `${HOTEL_ACCENT}14` }]}>
                  <Ionicons name={KIND_ICONS[item.kind]} size={14} color={HOTEL_ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label" numberOfLines={1}>{item.label}</Text>
                  {item.subtitle ? (
                    <Text secondary variant="caption" numberOfLines={1}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.md },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  suggestions: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emptyHint: { padding: spacing.md },
});
