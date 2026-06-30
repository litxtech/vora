import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { fetchAdminUsers } from '@/features/admin/services/userManagement';
import type { AdminUserRow } from '@/features/admin/types';
import { ROLE_LABELS } from '@/constants/roles';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminUserSearchPickerProps = {
  selectedUser: AdminUserRow | null;
  onSelectUser: (user: AdminUserRow | null) => void;
  placeholder?: string;
  hint?: string;
};

export function AdminUserSearchPicker({
  selectedUser,
  onSelectUser,
  placeholder = 'Kullanıcı adı, ad veya soyad yazın…',
  hint = '@kullanici, ad soyad veya kullanıcı adının bir kısmı ile arayın.',
}: AdminUserSearchPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await fetchAdminUsers(trimmed.replace(/^@/, ''), 12);
    setResults(data as unknown as AdminUserRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      void searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedUser, searchUsers]);

  const handleSelect = (user: AdminUserRow) => {
    onSelectUser(user);
    setQuery('');
    setResults([]);
  };

  const handleClear = () => {
    onSelectUser(null);
    setQuery('');
    setResults([]);
  };

  if (selectedUser) {
    return (
      <View style={styles.wrap}>
        <Text variant="caption">Seçili kullanıcı</Text>
        <GlassCard style={[styles.selectedCard, { borderColor: colors.primary }]}>
          <View style={styles.selectedRow}>
            <View style={styles.selectedCopy}>
              <Text variant="label">@{selectedUser.username}</Text>
              {selectedUser.full_name ? (
                <Text secondary variant="caption">
                  {selectedUser.full_name}
                </Text>
              ) : null}
              <Text variant="caption" muted>
                {ROLE_LABELS[selectedUser.role]} · {selectedUser.account_status}
              </Text>
            </View>
            <Pressable onPress={handleClear} hitSlop={8} accessibilityLabel="Seçimi temizle">
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <AdminSearchInput value={query} onChangeText={setQuery} placeholder={placeholder} />
      <Text variant="caption" muted>
        {hint}
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" secondary>
            Aranıyor…
          </Text>
        </View>
      ) : null}

      {!loading && query.trim().length >= 2 && results.length === 0 ? (
        <Text variant="caption" style={{ color: colors.warning }}>
          Eşleşen kullanıcı bulunamadı.
        </Text>
      ) : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((user) => (
            <Pressable key={user.id} onPress={() => handleSelect(user)}>
              <GlassCard style={styles.resultRow}>
                <Text variant="label">@{user.username}</Text>
                {user.full_name ? (
                  <Text secondary variant="caption">
                    {user.full_name}
                  </Text>
                ) : null}
                <Text variant="caption" muted>
                  Güven {user.trust_score} · {user.account_status}
                </Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  hint: {
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  results: {
    gap: spacing.xs,
  },
  resultRow: {
    gap: 2,
  },
  selectedCard: {
    borderWidth: 1,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectedCopy: {
    flex: 1,
    gap: 2,
  },
});
