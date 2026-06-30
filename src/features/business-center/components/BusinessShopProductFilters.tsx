import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { categoryLabel } from '@/features/marketplace/constants';
import type { MarketplaceCategory } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  categories: MarketplaceCategory[];
  categoryFilter: MarketplaceCategory | null;
  onCategoryChange: (category: MarketplaceCategory | null) => void;
  accent: string;
  showSearch: boolean;
};

function FilterChip({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active
          ? { backgroundColor: accent, borderColor: accent }
          : { backgroundColor: `${accent}12`, borderColor: `${accent}30` },
        pressed && { opacity: 0.86 },
      ]}
    >
      <Text variant="caption" style={{ fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BusinessShopProductFilters({
  query,
  onQueryChange,
  categories,
  categoryFilter,
  onCategoryChange,
  accent,
  showSearch,
}: Props) {
  const { colors } = useTheme();

  if (!showSearch && categories.length <= 1) return null;

  return (
    <View style={styles.wrap}>
      {showSearch ? (
        <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Vitrinde ara…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={onQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => onQueryChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="Tüm kategoriler"
            active={categoryFilter === null}
            accent={accent}
            onPress={() => onCategoryChange(null)}
          />
          {categories.map((category) => (
            <FilterChip
              key={category}
              label={categoryLabel(category)}
              active={categoryFilter === category}
              accent={accent}
              onPress={() => onCategoryChange(category)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
