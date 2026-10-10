import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchAdminContactOwners,
  fetchAdminOwnerContactBook,
  type AdminContactOwner,
  type AdminOwnerContact,
} from '@/features/contact-discovery/services/discoveryApi';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function ownerTitle(owner: AdminContactOwner): string {
  return owner.fullName?.trim() || owner.username;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminContactBooksScreen() {
  const { colors } = useTheme();
  const [owners, setOwners] = useState<AdminContactOwner[]>([]);
  const [selected, setSelected] = useState<AdminContactOwner | null>(null);
  const [entries, setEntries] = useState<AdminOwnerContact[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOwners = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const result = await fetchAdminContactOwners();
    setError(result.error);
    setOwners(result.owners);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadEntries = useCallback(async (owner: AdminContactOwner) => {
    setLoading(true);
    const result = await fetchAdminOwnerContactBook(owner.ownerId);
    setError(result.error);
    setEntries(result.entries);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const visibleOwners = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    if (!needle) return owners;
    return owners.filter((owner) =>
      `${owner.fullName ?? ''} ${owner.username}`.toLocaleLowerCase('tr').includes(needle),
    );
  }, [owners, query]);

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    if (!needle) return entries;
    return entries.filter((entry) =>
      `${entry.displayName ?? ''} ${entry.rawPhone} ${entry.e164 ?? ''}`.toLocaleLowerCase('tr').includes(needle),
    );
  }, [entries, query]);

  const openOwner = (owner: AdminContactOwner) => {
    setQuery('');
    setSelected(owner);
    void loadEntries(owner);
  };

  return (
    <AdminShell
      title={selected ? ownerTitle(selected) : 'Rehberler'}
      subtitle={
        selected
          ? `@${selected.username} · ${selected.entryCount} kişi`
          : 'İzin veren kullanıcının kendi telefon rehberi'
      }
      refreshing={refreshing}
      onRefresh={() => {
        if (selected) void loadEntries(selected);
        else void loadOwners(true);
      }}
      onBack={
        selected
          ? () => {
              setSelected(null);
              setEntries([]);
              setQuery('');
              setError(null);
            }
          : undefined
      }
    >
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={selected ? 'Bu rehberde ara' : 'Kullanıcı ara'}
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <AdminEmptyState loading />
      ) : error ? (
        <AdminEmptyState title="Liste alınamadı" message={error} icon="call-outline" />
      ) : selected ? (
        <>
          <GlassCard style={styles.ownerBanner}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{ownerTitle(selected).charAt(0).toLocaleUpperCase('tr')}</Text>
            </View>
            <View style={styles.copy}>
              <Text variant="label">{ownerTitle(selected)}</Text>
              <Text secondary variant="caption">
                Bu rehber @{selected.username} kullanıcısına ait
                {selected.updatedAt ? ` · ${formatWhen(selected.updatedAt)}` : ''}
              </Text>
            </View>
          </GlassCard>
          {visibleEntries.length === 0 ? (
            <AdminEmptyState title="Kişi yok" message="Bu kullanıcının rehberinde kayıt bulunamadı." icon="people-outline" />
          ) : (
            visibleEntries.map((entry) => (
              <GlassCard key={entry.id} style={styles.card}>
                <Text variant="label">{entry.displayName?.trim() || 'İsimsiz'}</Text>
                <Text secondary variant="caption">
                  {entry.rawPhone}
                  {entry.e164 && entry.e164 !== entry.rawPhone ? ` · ${entry.e164}` : ''}
                </Text>
              </GlassCard>
            ))
          )}
        </>
      ) : visibleOwners.length === 0 ? (
        <AdminEmptyState
          title="Rehber yok"
          message="Kullanıcı Mesajlar > Kişiler bölümünden izin verdiğinde rehberi burada, kendi adının altında görünür."
          icon="people-outline"
        />
      ) : (
        visibleOwners.map((owner) => (
          <Pressable key={owner.ownerId} accessibilityRole="button" onPress={() => openOwner(owner)}>
            <GlassCard style={styles.ownerRow}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {ownerTitle(owner).charAt(0).toLocaleUpperCase('tr')}
                </Text>
              </View>
              <View style={styles.copy}>
                <Text variant="label">{ownerTitle(owner)}</Text>
                <Text secondary variant="caption">
                  @{owner.username} · {owner.entryCount} kişi
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </GlassCard>
          </Pressable>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ownerBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  copy: { flex: 1, gap: 2 },
  card: { gap: spacing.xs },
});
