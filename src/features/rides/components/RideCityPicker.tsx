import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { filterRideCities, rideCityName, RIDES_ACCENT } from '@/features/rides/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type RideCityPickerProps = {
  visible: boolean;
  title: string;
  selectedId?: string | null;
  /** Çoklu seçim (ara duraklar) */
  multi?: boolean;
  selectedIds?: string[];
  excludeIds?: string[];
  onClose: () => void;
  onSelect: (cityId: string) => void;
  onToggle?: (cityId: string) => void;
};

export function RideCityPicker({
  visible,
  title,
  selectedId,
  multi = false,
  selectedIds = [],
  excludeIds = [],
  onClose,
  onSelect,
  onToggle,
}: RideCityPickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const cities = useMemo(() => filterRideCities(query, excludeIds), [query, excludeIds]);

  const isSelected = (id: string) =>
    multi ? selectedIds.includes(id) : selectedId === id;

  const handlePress = (id: string) => {
    if (multi) {
      onToggle?.(id);
    } else {
      onSelect(id);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <View style={[styles.inner, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={8} style={[styles.backBtn, { backgroundColor: `${colors.textMuted}18` }]}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <Text variant="h3" style={styles.headerTitle}>
                {title}
              </Text>
              <Pressable onPress={onClose} hitSlop={8} style={[styles.closeBtn, { backgroundColor: `${colors.textMuted}18` }]}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Şehir ara…"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                autoCapitalize="words"
                autoFocus
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {query.length > 0 ? (
              <Text variant="caption" secondary style={styles.resultHint}>
                {cities.length} şehir bulundu
              </Text>
            ) : null}

            <FlatList
              data={cities}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator
              ListEmptyComponent={
                <Text secondary variant="caption" style={styles.empty}>
                  Eşleşen şehir bulunamadı.
                </Text>
              }
              renderItem={({ item }) => {
                const active = isSelected(item.id);
                return (
                  <Pressable
                    onPress={() => handlePress(item.id)}
                    style={[
                      styles.option,
                      { borderColor: colors.border },
                      active && { backgroundColor: `${RIDES_ACCENT}18`, borderColor: `${RIDES_ACCENT}44` },
                    ]}
                  >
                    <Ionicons name="location-outline" size={16} color={active ? RIDES_ACCENT : colors.textMuted} />
                    <Text style={[styles.optionText, active && { color: RIDES_ACCENT, fontWeight: '700' }]}>
                      {item.name}
                    </Text>
                    {active ? (
                      <Ionicons name={multi ? 'checkbox' : 'checkmark-circle'} size={20} color={RIDES_ACCENT} />
                    ) : null}
                  </Pressable>
                );
              }}
            />

            {multi ? (
              <Pressable
                onPress={onClose}
                style={[styles.doneBtn, { backgroundColor: RIDES_ACCENT, marginBottom: spacing.sm }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {selectedIds.length > 0 ? `${selectedIds.length} durak seçildi · Tamam` : 'Tamam'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type RideCityFieldProps = {
  label: string;
  value: string | null;
  displayText?: string;
  placeholder?: string;
  onPress: () => void;
};

export function RideCityField({ label, value, displayText, placeholder = 'Şehir seç', onPress }: RideCityFieldProps) {
  const { colors } = useTheme();
  const shown = displayText ?? (value ? rideCityName(value) : null);

  return (
    <View style={styles.fieldWrap}>
      <Text variant="label" secondary>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        style={[styles.fieldBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Ionicons name="location-outline" size={18} color={RIDES_ACCENT} />
        <Text variant="caption" style={{ flex: 1, fontWeight: shown ? '600' : '400' }} numberOfLines={2}>
          {shown ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  resultHint: { marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.lg, gap: spacing.xs },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionText: { flex: 1, fontSize: 15 },
  doneBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  fieldWrap: { gap: spacing.xs, marginBottom: spacing.sm },
  fieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
});
