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
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type SheetOption<T extends string> = {
  id: T;
  label: string;
  icon?: string;
  color?: string;
};

type MarketplaceOptionSheetProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  value: T | null;
  options: SheetOption<T>[];
  onSelect: (value: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
};

function normalizeSearch(text: string) {
  return text.trim().toLocaleLowerCase('tr-TR');
}

function filterOptions<T extends string>(options: SheetOption<T>[], query: string) {
  const q = normalizeSearch(query);
  if (!q) return options;
  return options.filter((o) => normalizeSearch(o.label).includes(q));
}

export function MarketplaceOptionSheet<T extends string>({
  visible,
  onClose,
  title,
  subtitle,
  value,
  options,
  onSelect,
  searchable = true,
  searchPlaceholder = 'Ara…',
}: MarketplaceOptionSheetProps<T>) {
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

  const filtered = useMemo(() => filterOptions(options, query), [options, query]);
  const selected = options.find((o) => o.id === value);
  const accent = selected?.color ?? MARKETPLACE_ACCENT;

  const sheetHeight = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    const maxSheet = windowHeight * 0.68;
    if (keyboardHeight <= 0) return maxSheet;
    const aboveKeyboard = windowHeight - keyboardHeight - insets.top - spacing.sm;
    return Math.max(220, Math.min(maxSheet, aboveKeyboard));
  }, [keyboardHeight, insets.top]);

  const handleSelect = (id: T) => {
    Keyboard.dismiss();
    onSelect(id);
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
              paddingBottom: insets.bottom,
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

            {searchable ? (
              <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.searchInput, { color: colors.text }]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {filtered.length > 0 ? (
              <Text secondary variant="caption" style={styles.resultCount}>
                {filtered.length} seçenek
              </Text>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={24} color={colors.textMuted} />
                <Text secondary variant="caption" style={{ textAlign: 'center' }}>
                  {query ? `"${query}" için sonuç bulunamadı` : 'Seçenek bulunamadı'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const active = value === item.id;
              const rowColor = item.color ?? accent;
              return (
                <Pressable
                  onPress={() => handleSelect(item.id)}
                  style={[
                    styles.row,
                    { borderBottomColor: colors.border },
                    active ? { backgroundColor: `${rowColor}14` } : undefined,
                  ]}
                >
                  {item.icon ? (
                    <View style={[styles.rowIcon, { backgroundColor: `${rowColor}18` }]}>
                      <Ionicons
                        name={item.icon as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={rowColor}
                      />
                    </View>
                  ) : (
                    <View style={[styles.rowIcon, { backgroundColor: `${colors.textMuted}18` }]}>
                      <Ionicons name="ellipse-outline" size={14} color={colors.textMuted} />
                    </View>
                  )}
                  <Text
                    variant="body"
                    numberOfLines={1}
                    style={[
                      styles.rowLabel,
                      active ? { color: rowColor, fontWeight: '600' } : { color: colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color={rowColor} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  )}
                </Pressable>
              );
            }}
          />
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
  listContent: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
});
