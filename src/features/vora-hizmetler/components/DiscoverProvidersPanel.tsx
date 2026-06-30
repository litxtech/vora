import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HizmetProfessionPickerTrigger } from '@/features/vora-hizmetler/components/HizmetProfessionPickerTrigger';
import { HizmetProfessionSheet } from '@/features/vora-hizmetler/components/HizmetProfessionSheet';
import { ProviderDiscoverCard } from '@/features/vora-hizmetler/components/ProviderDiscoverCard';
import {
  serviceCategoryLabel,
  VORA_HIZMETLER_ACCENT,
  type ServiceProfessionOption,
} from '@/features/vora-hizmetler/constants';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import { useProviderDiscover } from '@/features/vora-hizmetler/hooks/useProviderDiscover';
import type { ServiceCategory } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SEARCH_DEBOUNCE_MS = 400;

type DiscoverProvidersPanelProps = {
  regionId: string | null;
};

export function DiscoverProvidersPanel({ regionId }: DiscoverProvidersPanelProps) {
  const { colors } = useTheme();
  const showSearch = useFeatureVisible(VORA_HIZMETLER_FEATURE.discoverSearch);
  const showFilter = useFeatureVisible(VORA_HIZMETLER_FEATURE.discoverFilter);
  const searchInputRef = useRef<TextInputType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState<ServiceProfessionOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [professionSheetOpen, setProfessionSheetOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const { providers, loading, searching } = useProviderDiscover({
    regionId,
    category: selectedCategory,
    query: debouncedQuery,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const flushSearch = useCallback(() => {
    setDebouncedQuery(searchQuery.trim());
    searchInputRef.current?.focus();
  }, [searchQuery]);

  const handleProfessionSelect = useCallback((option: ServiceProfessionOption) => {
    setSelectedProfession((prev) => {
      const next = prev?.id === option.id ? null : option;
      setSelectedCategory(next ? option.category : null);
      if (next) {
        setSearchQuery(option.label);
        setDebouncedQuery(option.label);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedProfession(null);
    setSelectedCategory(null);
    setSearchQuery('');
    setDebouncedQuery('');
    searchInputRef.current?.focus();
  }, []);

  const showInitialLoader = loading && providers.length === 0;

  return (
    <>
      <View style={[styles.roleHint, { backgroundColor: `${VORA_HIZMETLER_ACCENT}10`, borderColor: `${VORA_HIZMETLER_ACCENT}30` }]}>
        <Ionicons name="compass-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
        <Text variant="caption" style={styles.roleHintText}>
          Usta arıyorsanız buradan meslek veya isimle arayın. Profilde tüm iş geçmişi ve yorumları görürsünüz.
        </Text>
      </View>

      {showSearch ? (
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceElevated, borderColor: searchFocused ? VORA_HIZMETLER_ACCENT : colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={flushSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Usta veya meslek ara (ör. elektrikçi, boyacı…)"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          blurOnSubmit={false}
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.searchInput, { color: colors.text }]}
        />
        {searching ? (
          <ActivityIndicator size="small" color={VORA_HIZMETLER_ACCENT} style={styles.searchSpinner} />
        ) : null}
        {searchQuery.length > 0 ? (
          <Pressable onPress={clearFilters} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={flushSearch}
          style={[styles.searchBtn, { backgroundColor: VORA_HIZMETLER_ACCENT }]}
        >
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
            Ara
          </Text>
        </Pressable>
      </View>
      ) : null}

      {showFilter ? (
      <View style={styles.filterRow}>
        <HizmetProfessionPickerTrigger
          label={selectedProfession?.label ?? 'Meslek filtresi'}
          hint={selectedProfession ? serviceCategoryLabel(selectedProfession.category) : 'Tüm meslekler'}
          active={!!selectedProfession}
          onPress={() => setProfessionSheetOpen(true)}
        />
      </View>
      ) : null}

      {(showSearch || showFilter) && (selectedProfession || debouncedQuery) ? (
        <Pressable onPress={clearFilters} style={[styles.clearChip, { borderColor: VORA_HIZMETLER_ACCENT }]}>
          <Ionicons name="close" size={14} color={VORA_HIZMETLER_ACCENT} />
          <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700' }}>
            Filtreleri temizle
          </Text>
        </Pressable>
      ) : null}

      <Text variant="label" style={styles.sectionTitle}>
        {(showSearch && debouncedQuery) || (showFilter && selectedCategory) ? 'Arama Sonuçları' : 'Öne Çıkan Ustalar'}
        {providers.length ? ` (${providers.length})` : ''}
      </Text>

      {showInitialLoader ? (
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
      ) : providers.length > 0 ? (
        <View style={styles.results}>
          {providers.map((item) => (
            <ProviderDiscoverCard key={item.id} provider={item} />
          ))}
        </View>
      ) : (
        <Text secondary variant="body" style={styles.empty}>
          {(showSearch && debouncedQuery) || (showFilter && selectedCategory)
            ? 'Aramanıza uygun usta bulunamadı. Filtreleri genişletmeyi deneyin.'
            : 'Henüz kayıtlı usta yok. İlk usta siz olun — Ben Ustayım sekmesinden profil oluşturun.'}
        </Text>
      )}

      <HizmetProfessionSheet
        visible={professionSheetOpen}
        onClose={() => setProfessionSheetOpen(false)}
        title="Meslek Filtresi"
        subtitle="Keşfette gösterilecek ustaları daraltın"
        selectedProfessionId={selectedProfession?.id ?? null}
        onSelect={handleProfessionSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  roleHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  roleHintText: {
    flex: 1,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  searchSpinner: {
    marginRight: 2,
  },
  searchBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  filterRow: {
    marginBottom: spacing.sm,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  results: {
    gap: spacing.xs,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
