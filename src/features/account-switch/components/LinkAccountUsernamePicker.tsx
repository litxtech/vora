import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { searchLinkableSiblingAccounts } from '@/features/account-switch/services/siblingAccountSearch';
import type { LinkableSiblingProfile } from '@/features/account-switch/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  label: string;
  placeholder?: string;
  accountType: 'personal' | 'business';
  excludeUserId?: string;
  value: string;
  onChangeText: (value: string) => void;
};

const AVATAR_SIZE = 40;

function displayName(profile: LinkableSiblingProfile): string {
  return profile.fullName?.trim() || profile.username;
}

export function LinkAccountUsernamePicker({
  label,
  placeholder = 'kullanici_adi',
  accountType,
  excludeUserId,
  value,
  onChangeText,
}: Props) {
  const { colors } = useTheme();
  const [results, setResults] = useState<LinkableSiblingProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LinkableSiblingProfile | null>(null);

  const runSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim().replace(/^@/, '');
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const found = await searchLinkableSiblingAccounts(trimmed, accountType, { excludeUserId });
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [accountType, excludeUserId],
  );

  useEffect(() => {
    if (selected) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      void runSearch(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, selected, runSearch]);

  const handleChange = (next: string) => {
    if (selected && next !== selected.username) {
      setSelected(null);
    }
    onChangeText(next);
  };

  const handleSelect = (profile: LinkableSiblingProfile) => {
    setSelected(profile);
    onChangeText(profile.username);
    setResults([]);
  };

  const handleClear = () => {
    setSelected(null);
    onChangeText('');
    setResults([]);
  };

  if (selected) {
    return (
      <View style={styles.wrap}>
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
        <View style={[styles.selectedCard, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
          {selected.avatarUrl ? (
            <Image source={{ uri: selected.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons
                name={accountType === 'business' ? 'storefront-outline' : 'person-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
          )}
          <View style={styles.selectedCopy}>
            <View style={styles.nameRow}>
              <Text variant="label" numberOfLines={1}>
                {displayName(selected)}
              </Text>
              {selected.isVerified ? (
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
              ) : null}
            </View>
            <Text secondary variant="caption">
              @{selected.username}
            </Text>
          </View>
          <Pressable onPress={handleClear} hitSlop={8} accessibilityLabel="Seçimi temizle">
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  }

  const trimmed = value.trim().replace(/^@/, '');
  const showEmpty = !loading && trimmed.length >= 2 && results.length === 0;

  return (
    <View style={styles.wrap}>
      <Input
        label={label}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" secondary>
            Aranıyor…
          </Text>
        </View>
      ) : null}

      {showEmpty ? (
        <Text variant="caption" style={{ color: colors.warning }}>
          Eşleşen {accountType === 'business' ? 'işletme' : 'bireysel'} hesap bulunamadı.
        </Text>
      ) : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((profile) => (
            <Pressable
              key={profile.id}
              onPress={() => handleSelect(profile)}
              style={({ pressed }) => [
                styles.resultRow,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons
                    name={accountType === 'business' ? 'storefront-outline' : 'person-outline'}
                    size={18}
                    color={colors.primary}
                  />
                </View>
              )}
              <View style={styles.resultCopy}>
                <View style={styles.nameRow}>
                  <Text variant="label" numberOfLines={1}>
                    {displayName(profile)}
                  </Text>
                  {profile.isVerified ? (
                    <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  ) : null}
                </View>
                <Text secondary variant="caption">
                  @{profile.username}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    marginBottom: spacing.xs,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  results: {
    gap: spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  selectedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
