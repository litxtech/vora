import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  filterServiceProfessions,
  SERVICE_PROFESSION_OPTIONS,
  VORA_HIZMETLER_ACCENT,
  type ServiceProfessionOption,
} from '@/features/vora-hizmetler/constants';
import type { ServiceCategory } from '@/features/vora-hizmetler/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetProfessionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  multiSelect?: boolean;
  selectedProfessionId?: string | null;
  selectedCategories?: ServiceCategory[];
  maxSelections?: number;
  onSelect: (option: ServiceProfessionOption) => void;
  onSearchPress?: (query: string, category: ServiceCategory | null) => void;
  showSearchAction?: boolean;
};

export function HizmetProfessionSheet({
  visible,
  onClose,
  title = 'Meslekler',
  subtitle = 'Hizmet veya meslek seçin',
  multiSelect = false,
  selectedProfessionId = null,
  selectedCategories = [],
  maxSelections = 5,
  onSelect,
  onSearchPress,
  showSearchAction = false,
}: HizmetProfessionSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const surface = glassSurface[mode];
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const filtered = useMemo(() => filterServiceProfessions(query), [query]);

  const sheetHeight = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    const maxSheet = windowHeight * 0.78;
    if (keyboardHeight <= 0) return maxSheet;
    const aboveKeyboard = windowHeight - keyboardHeight - insets.top - spacing.sm;
    return Math.max(280, Math.min(maxSheet, aboveKeyboard));
  }, [keyboardHeight, insets.top]);

  const isSelected = (option: ServiceProfessionOption) => {
    if (multiSelect) return selectedCategories.includes(option.category);
    if (selectedProfessionId) return selectedProfessionId === option.id;
    return false;
  };

  const handleSelect = (option: ServiceProfessionOption) => {
    onSelect(option);
    if (!multiSelect) {
      Keyboard.dismiss();
      onClose();
    }
  };

  const handleSearch = () => {
    const match = filtered[0] ?? null;
    onSearchPress?.(query, match?.category ?? null);
    Keyboard.dismiss();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />

        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: colors.surfaceElevated,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          <View style={styles.fixedHeader}>
            <View style={[styles.handle, { backgroundColor: surface.handle }]} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitles}>
                <Text variant="label">{title}</Text>
                {subtitle ? (
                  <Text secondary variant="caption" numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: `${colors.textMuted}22` }]}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Meslek veya hizmet ara..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Text secondary variant="caption" style={styles.resultCount}>
              {filtered.length} meslek · {SERVICE_PROFESSION_OPTIONS.length} toplam
            </Text>
          </View>

          <FlatList
            style={styles.list}
            data={filtered}
            keyExtractor={(item) => item.id}
            numColumns={3}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={24} color={colors.textMuted} />
                <Text secondary variant="caption" style={{ textAlign: 'center' }}>
                  {query ? `"${query}" için sonuç bulunamadı` : 'Meslek bulunamadı'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = isSelected(item);
              const accent = item.color;
              const disabled =
                multiSelect &&
                !selected &&
                selectedCategories.length >= maxSelections &&
                !selectedCategories.includes(item.category);

              return (
                <Pressable
                  disabled={disabled}
                  onPress={() => handleSelect(item)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: selected ? `${accent}16` : colors.surfaceElevated,
                      borderColor: selected ? accent : colors.border,
                      opacity: disabled ? 0.45 : 1,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={accent}
                    />
                  </View>
                  <Text
                    variant="caption"
                    numberOfLines={2}
                    style={{
                      color: selected ? accent : colors.text,
                      fontWeight: selected ? '700' : '500',
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </Text>
                  {selected ? (
                    <View style={[styles.check, { backgroundColor: accent }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />

          <View style={styles.footer}>
            {showSearchAction && onSearchPress ? (
              <Pressable
                onPress={handleSearch}
                style={[styles.searchAction, { backgroundColor: VORA_HIZMETLER_ACCENT }]}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  Usta Ara
                </Text>
              </Pressable>
            ) : null}
            {multiSelect ? (
              <Pressable
                onPress={onClose}
                style={[styles.doneBtn, { backgroundColor: `${VORA_HIZMETLER_ACCENT}18`, borderColor: VORA_HIZMETLER_ACCENT }]}
              >
                <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT }}>
                  Tamam ({selectedCategories.length}/{maxSelections})
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  fixedHeader: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sheetTitles: { flex: 1, gap: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    fontSize: 15,
  },
  resultCount: {
    paddingHorizontal: spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  column: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    position: 'relative',
    minHeight: 88,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  searchAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
