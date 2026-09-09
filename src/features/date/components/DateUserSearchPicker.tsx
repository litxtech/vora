import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';
import { DATE_ACCENT } from '@/features/date/constants';
import type { DateUserSnippet } from '@/features/date/services/dateProfiles';
import { searchDateUsers } from '@/features/date/services/dateProfiles';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type DateUserSearchPickerProps = {
  label: string;
  hint?: string;
  placeholder?: string;
  selected: DateUserSnippet[];
  onChangeSelected: (users: DateUserSnippet[]) => void;
  excludeUserIds?: string[];
  maxSelected?: number;
  quickPicks?: DateUserSnippet[];
  quickPicksLabel?: string;
};

function displayName(user: DateUserSnippet): string {
  return user.fullName?.trim() || user.username;
}

export function DateUserSearchPicker({
  label,
  hint = 'Kullanıcı adı veya ad soyad ile arayın.',
  placeholder = '@kullanici veya ad soyad',
  selected,
  onChangeSelected,
  excludeUserIds = [],
  maxSelected,
  quickPicks = [],
  quickPicksLabel = 'Arkadaşlarından hızlı seç',
}: DateUserSearchPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DateUserSnippet[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim().replace(/^@/, '');
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const blocked = new Set([...excludeUserIds, ...selected.map((user) => user.id)]);

    setLoading(true);
    try {
      const found = await searchDateUsers(trimmed);
      setResults(found.filter((user) => !blocked.has(user.id)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [excludeUserIds, selected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const canAddMore = maxSelected == null || selected.length < maxSelected;

  const addUser = (user: DateUserSnippet) => {
    if (!canAddMore || selected.some((item) => item.id === user.id)) return;
    onChangeSelected([...selected, user]);
    setQuery('');
    setResults([]);
  };

  const removeUser = (userId: string) => {
    onChangeSelected(selected.filter((item) => item.id !== userId));
  };

  const blockedIds = new Set([...excludeUserIds, ...selected.map((user) => user.id)]);
  const visibleQuickPicks = quickPicks.filter(
    (user) => !blockedIds.has(user.id),
  );

  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      {hint ? (
        <Text secondary variant="caption" style={styles.hint}>
          {hint}
        </Text>
      ) : null}

      {selected.length > 0 ? (
        <View style={styles.selectedRow}>
          {selected.map((user) => (
            <View
              key={user.id}
              style={[styles.selectedChip, { borderColor: DATE_ACCENT, backgroundColor: `${DATE_ACCENT}10` }]}
            >
              <ProfileTabIcon
                avatarUrl={user.avatarUrl}
                username={user.username}
                color={DATE_ACCENT}
                size={32}
              />
              <Text variant="caption" numberOfLines={1} style={styles.selectedName}>
                {displayName(user)}
              </Text>
              <Pressable
                onPress={() => removeUser(user.id)}
                hitSlop={8}
                accessibilityLabel={`${displayName(user)} kaldır`}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {canAddMore ? (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />

          {loading ? (
            <ActivityIndicator color={DATE_ACCENT} style={styles.loader} />
          ) : results.length > 0 ? (
            <View style={[styles.results, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {results.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => addUser(user)}
                  style={[styles.resultRow, { borderBottomColor: colors.border }]}
                >
                  <ProfileTabIcon
                    avatarUrl={user.avatarUrl}
                    username={user.username}
                    color={DATE_ACCENT}
                    size={36}
                  />
                  <View style={styles.resultCopy}>
                    <Text variant="label" numberOfLines={1}>
                      {displayName(user)}
                    </Text>
                    <Text secondary variant="caption">
                      @{user.username}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={DATE_ACCENT} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {canAddMore && visibleQuickPicks.length > 0 ? (
        <View style={styles.quickBlock}>
          <Text secondary variant="caption" style={styles.quickLabel}>
            {quickPicksLabel}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {visibleQuickPicks.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => addUser(user)}
                style={[styles.quickChip, { borderColor: colors.border }]}
              >
                <ProfileTabIcon
                  avatarUrl={user.avatarUrl}
                  username={user.username}
                  color={DATE_ACCENT}
                  size={36}
                />
                <Text variant="caption" numberOfLines={1} style={{ maxWidth: 72, textAlign: 'center' }}>
                  {displayName(user)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hint: { lineHeight: 18 },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  selectedName: {
    maxWidth: 96,
    fontWeight: '600',
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  loader: {
    alignSelf: 'flex-start',
  },
  results: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickBlock: { gap: spacing.xs },
  quickLabel: { fontWeight: '600' },
  quickScroll: { flexGrow: 0 },
  quickChip: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    width: 96,
  },
});
