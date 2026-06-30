import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import {
  CATEGORY_DEFS,
  CONDITION_OPTIONS,
  LISTING_TYPE_OPTIONS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_SORT_OPTIONS,
} from '@/features/marketplace/constants';
import type { MarketplaceCategory, MarketplaceFilters } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  filters: MarketplaceFilters;
  onClose: () => void;
  onApply: (filters: MarketplaceFilters) => void;
};

export function MarketplaceFilterSheet({ visible, filters, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<MarketplaceFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  if (!visible) return null;

  return (
    <Modal transparent animationType={resolveModalAnimationType('slide')} visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg, backgroundColor: colors.background }]}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text variant="label">Filtreler</Text>
          <Pressable onPress={() => onApply({ sort: 'favorites' })}>
            <Text style={{ color: colors.primary }}>Sıfırla</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ gap: spacing.md }}>
          <Text variant="caption">Fiyat aralığı (₺)</Text>
          <View style={styles.row}>
            <TextInput
              keyboardType="numeric"
              placeholder="Min"
              placeholderTextColor={colors.textMuted}
              value={draft.minPrice != null ? String(draft.minPrice) : ''}
              onChangeText={(v) => setDraft((d) => ({ ...d, minPrice: v ? Number(v) : null }))}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            />
            <Text secondary>—</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="Max"
              placeholderTextColor={colors.textMuted}
              value={draft.maxPrice != null ? String(draft.maxPrice) : ''}
              onChangeText={(v) => setDraft((d) => ({ ...d, maxPrice: v ? Number(v) : null }))}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <Text variant="caption">Satış tipi</Text>
          <View style={styles.chips}>
            {LISTING_TYPE_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() =>
                  setDraft((d) => ({ ...d, listingType: d.listingType === o.value ? null : o.value }))
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: draft.listingType === o.value ? colors.primary : `${colors.primary}15`,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text variant="caption">{o.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text variant="caption">Durum</Text>
          <View style={styles.chips}>
            {CONDITION_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() =>
                  setDraft((d) => ({ ...d, condition: d.condition === o.value ? null : o.value }))
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: draft.condition === o.value ? colors.accent : `${colors.accent}15`,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text variant="caption">{o.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text variant="caption">Kategori</Text>
          <ScrollView horizontal contentContainerStyle={styles.chips}>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    category: d.category === c.id ? null : c.id,
                    subcategory: null,
                  }))
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: draft.category === c.id ? c.color : `${c.color}18`,
                    borderColor: c.color,
                  },
                ]}
              >
                <Text variant="caption">{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {draft.category ? (
            <>
              <Text variant="caption">Alt kategori</Text>
              <View style={styles.chips}>
                {CATEGORY_DEFS[draft.category as MarketplaceCategory].subcategories.map((s) => (
                  <Pressable
                    key={s.slug}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        subcategory: d.subcategory === s.slug ? null : s.slug,
                      }))
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          draft.subcategory === s.slug ? colors.primary : `${colors.primary}15`,
                      },
                    ]}
                  >
                    <Text variant="caption">{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Text variant="caption">Sıralama</Text>
          <View style={styles.chips}>
            {MARKETPLACE_SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => setDraft((d) => ({ ...d, sort: o.id }))}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      (draft.sort ?? 'favorites') === o.id ? colors.primary : `${colors.primary}15`,
                  },
                ]}
              >
                <Text variant="caption">{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Button title="Uygula" onPress={() => onApply({ ...draft })} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    marginBottom: spacing.sm,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
