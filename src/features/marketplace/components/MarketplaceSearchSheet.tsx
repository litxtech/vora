import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { MarketplaceGridCard } from '@/features/marketplace/components/MarketplaceGridCard';
import {
  MARKETPLACE_ACCENT,
  categoryColor,
  categoryIcon,
  listingDetailPath,
} from '@/features/marketplace/constants';
import { searchMarketplaceListings } from '@/features/marketplace/services/listingData';
import {
  clearRecentMarketplaceSearches,
  fetchMarketplaceSearchSuggestions,
  saveRecentMarketplaceSearch,
  suggestionToSelection,
  type MarketplaceSearchSuggestion,
} from '@/features/marketplace/services/searchSuggestions';
import { radius, spacing } from '@/constants/theme';
import type { MarketplaceFilters, MarketplaceListing } from '@/features/marketplace/types';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  regionId: string | null;
  filters: MarketplaceFilters;
  onClose: () => void;
  onSearchApplied: (query: string, results: MarketplaceListing[]) => void;
  onToggleFavorite: (listing: MarketplaceListing) => void;
};

const KIND_ICONS: Record<MarketplaceSearchSuggestion['kind'], keyof typeof Ionicons.glyphMap> = {
  recent: 'time-outline',
  popular: 'trending-up-outline',
  category: 'grid-outline',
  subcategory: 'pricetag-outline',
  listing: 'image-outline',
};

export function MarketplaceSearchSheet({
  visible,
  regionId,
  filters,
  onClose,
  onSearchApplied,
  onToggleFavorite,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MarketplaceSearchSuggestion[]>([]);
  const [results, setResults] = useState<MarketplaceListing[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSuggestions = useCallback(
    async (value: string) => {
      if (!regionId) {
        setSuggestions([]);
        return;
      }
      setLoadingSuggestions(true);
      setSuggestions(await fetchMarketplaceSearchSuggestions(regionId, value));
      setLoadingSuggestions(false);
    },
    [regionId],
  );

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSuggestions([]);
      setResults([]);
      setShowResults(false);
      return;
    }
    loadSuggestions('');
  }, [visible, loadSuggestions]);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!showResults) loadSuggestions(query);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, visible, loadSuggestions, showResults]);

  const runSearch = useCallback(
    async (searchQuery: string, nextFilters: MarketplaceFilters = filters) => {
      if (!regionId || searchQuery.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }
      setSearching(true);
      setShowResults(true);
      const data = await searchMarketplaceListings(regionId, searchQuery, nextFilters);
      setResults(data);
      setSearching(false);
      await saveRecentMarketplaceSearch(searchQuery);
      onSearchApplied(searchQuery, data);
    },
    [regionId, filters, onSearchApplied],
  );

  const applySuggestion = async (suggestion: MarketplaceSearchSuggestion) => {
    if (suggestion.kind === 'listing' && suggestion.listingId) {
      onClose();
      router.push(listingDetailPath(suggestion.listingId) as never);
      return;
    }

    const selection = suggestionToSelection(suggestion, filters);
    setQuery(selection.query || suggestion.label);
    setShowResults(true);
    if (selection.query.trim().length >= 2) {
      await runSearch(selection.query, selection.filters);
    } else if (selection.filters.category && regionId) {
      setSearching(true);
      const data = await searchMarketplaceListings(regionId, selection.query, selection.filters);
      setResults(data);
      setSearching(false);
      onSearchApplied(selection.query || suggestion.label, data);
    }
  };

  const handleSubmit = () => {
    runSearch(query);
  };

  const handleClearRecent = async () => {
    await clearRecentMarketplaceSearches();
    loadSuggestions(query);
  };

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <GradientBackground style={styles.root}>
        <KeyboardAvoidingView style={styles.root} behavior="padding">
          <View style={[styles.wrap, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom }]}>
            <View style={styles.inputRow}>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={(text) => {
                    setShowResults(false);
                    setQuery(text);
                  }}
                  onSubmitEditing={handleSubmit}
                  placeholder="Ürün, kategori veya marka ara"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text }]}
                  autoFocus
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setQuery('');
                      setShowResults(false);
                      loadSuggestions('');
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={{ color: MARKETPLACE_ACCENT, fontWeight: '600' }}>Kapat</Text>
              </Pressable>
            </View>

            {!showResults ? (
              <View style={styles.suggestBlock}>
                <View style={styles.suggestHeader}>
                  <Text variant="label">{query.trim() ? 'Öneriler' : 'Ne aramak istersiniz?'}</Text>
                  {!query.trim() && suggestions.some((s) => s.kind === 'recent') ? (
                    <Pressable onPress={handleClearRecent}>
                      <Text variant="caption" style={{ color: colors.textMuted }}>
                        Geçmişi temizle
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {loadingSuggestions ? (
                  <ActivityIndicator color={MARKETPLACE_ACCENT} style={{ marginVertical: spacing.md }} />
                ) : (
                  <FlatList
                    style={styles.flexList}
                    data={suggestions}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    renderItem={({ item }) => (
                      <SuggestionRow item={item} onPress={() => applySuggestion(item)} />
                    )}
                    ListEmptyComponent={
                      query.trim().length >= 2 ? (
                        <Pressable style={styles.emptySuggest} onPress={handleSubmit}>
                          <Ionicons name="search" size={18} color={MARKETPLACE_ACCENT} />
                          <Text variant="caption">"{query.trim()}" için ara</Text>
                        </Pressable>
                      ) : (
                        <Text secondary variant="caption" style={styles.emptyText}>
                          Popüler aramalardan birini seçin veya yazmaya başlayın.
                        </Text>
                      )
                    }
                  />
                )}
              </View>
            ) : (
              <FlatList
                style={styles.flexList}
                data={results}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.column}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListHeaderComponent={
                  <View style={styles.resultsHeader}>
                    <Pressable onPress={() => setShowResults(false)} style={styles.backToSuggest}>
                      <Ionicons name="arrow-back" size={16} color={MARKETPLACE_ACCENT} />
                      <Text variant="caption" style={{ color: MARKETPLACE_ACCENT }}>
                        Önerilere dön
                      </Text>
                    </Pressable>
                    <Text secondary variant="caption">
                      {searching ? 'Aranıyor...' : `${results.length} sonuç`}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <MarketplaceGridCard listing={item} onToggleFavorite={() => onToggleFavorite(item)} />
                )}
                ListEmptyComponent={
                  !searching ? (
                    <View style={styles.emptyResults}>
                      <Text secondary>Sonuç bulunamadı.</Text>
                    </View>
                  ) : null
                }
                contentContainerStyle={styles.resultsList}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </GradientBackground>
    </Modal>
  );
}

function SuggestionRow({
  item,
  onPress,
}: {
  item: MarketplaceSearchSuggestion;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const isListing = item.kind === 'listing';
  const icon =
    item.kind === 'category' && item.category
      ? (categoryIcon(item.category) as keyof typeof Ionicons.glyphMap)
      : KIND_ICONS[item.kind];
  const accent = item.category ? categoryColor(item.category) : MARKETPLACE_ACCENT;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.suggestRow,
        {
          backgroundColor: pressed ? `${colors.surface}CC` : `${colors.surface}55`,
          borderColor: colors.border,
        },
      ]}
    >
      {isListing ? (
        item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.suggestThumb} />
        ) : (
          <View style={[styles.suggestThumb, styles.suggestThumbEmpty, { backgroundColor: `${accent}14` }]}>
            <Ionicons name="image-outline" size={18} color={accent} />
          </View>
        )
      ) : (
        <View style={[styles.suggestIcon, { backgroundColor: `${accent}16` }]}>
          <Ionicons name={icon} size={16} color={accent} />
        </View>
      )}
      <View style={styles.suggestText}>
        <Text variant="caption" style={styles.suggestLabel} numberOfLines={2}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text secondary variant="caption" numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.sm },
  flexList: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  suggestBlock: { flex: 1, minHeight: 0 },
  suggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  suggestThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  suggestThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestText: { flex: 1, gap: 1 },
  suggestLabel: { fontWeight: '600', fontSize: 14 },
  emptySuggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: { paddingVertical: spacing.md },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    width: '100%',
  },
  backToSuggest: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultsList: { paddingBottom: spacing.xxl, gap: spacing.sm },
  column: { gap: spacing.sm },
  emptyResults: { alignItems: 'center', paddingVertical: spacing.xxl },
});
