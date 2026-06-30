import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchAdminUsers } from '@/features/admin/services/userManagement';
import type { AdminUserRow } from '@/features/admin/types';
import {
  HEYET_ACCENT,
  HEYET_STATUS_LABELS,
  HEYET_SUBJECT_LABELS,
} from '@/features/heyet/constants';
import { adminOpenGeneralHeyet, listAdminHeyetCases } from '@/features/heyet/services/heyetData';
import type { HeyetCaseListItem, HeyetStatus } from '@/features/heyet/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_FILTERS = [
  { id: 'all' as const, label: 'Tümü' },
  { id: 'open' as const, label: 'Açık' },
  { id: 'closed' as const, label: 'Kapalı' },
];

function formatParties(item: HeyetCaseListItem): string {
  const a = item.partyAUsername ? `@${item.partyAUsername}` : 'Taraf A';
  const b = item.partyBUsername ? `@${item.partyBUsername}` : 'Taraf B';
  return `${a} ↔ ${b}`;
}

export function AdminHeyetScreen() {
  const { colors } = useTheme();
  const [statusFilter, setStatusFilter] = useState<'all' | HeyetStatus>('open');
  const [items, setItems] = useState<HeyetCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [createVisible, setCreateVisible] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createQuery, setCreateQuery] = useState('');
  const [createResults, setCreateResults] = useState<AdminUserRow[]>([]);
  const [createSelected, setCreateSelected] = useState<AdminUserRow[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { items: next, error } = await listAdminHeyetCases(
      statusFilter === 'all' ? null : statusFilter,
    );
    if (error) Alert.alert('Hata', error);
    setItems(next);
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const trimmed = createQuery.trim();
    if (trimmed.length < 2) {
      setCreateResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await fetchAdminUsers(trimmed.replace(/^@/, ''), 12);
      const selectedIds = new Set(createSelected.map((u) => u.id));
      setCreateResults((data as unknown as AdminUserRow[]).filter((u) => !selectedIds.has(u.id)));
    }, 300);
    return () => clearTimeout(timer);
  }, [createQuery, createSelected]);

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      item.customTitle,
      item.partyAUsername,
      item.partyBUsername,
      HEYET_SUBJECT_LABELS[item.subjectType],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const toggleCreateUser = (user: AdminUserRow) => {
    setCreateSelected((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
    setCreateQuery('');
    setCreateResults([]);
  };

  const handleCreate = async () => {
    if (createSelected.length < 2) {
      Alert.alert('Taraflar', 'En az iki kullanıcı seçin.');
      return;
    }
    setCreating(true);
    const { conversationId, error } = await adminOpenGeneralHeyet(
      createTitle.trim() || 'Genel uyuşmazlık',
      createSelected.map((u) => u.id),
    );
    setCreating(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    setCreateVisible(false);
    setCreateTitle('');
    setCreateSelected([]);
    void load(true);
    if (conversationId) router.push(`/chat/${conversationId}` as never);
  };

  return (
    <AdminShell
      title="Heyet"
      subtitle="Uyuşmazlık oturumları — yolculuk, pazar, otel veya genel"
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      requireAdmin
    >
      <View style={styles.topActions}>
        <AdminActionChip
          label="Genel heyet aç"
          icon="add"
          tone="primary"
          onPress={() => setCreateVisible(true)}
        />
      </View>
      <GlassCard style={[styles.info, { borderColor: `${HEYET_ACCENT}33` }]}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color={HEYET_ACCENT} />
          <Text secondary variant="caption" style={styles.infoText}>
            Modül kartlarından (yolculuk, pazar, otel) veya buradan genel heyet açın. Tarafları
            sohbete alın, kararı modern kart olarak yayınlayın, dilereniz oturumu kapatın.
          </Text>
        </View>
      </GlassCard>

      <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Heyet ara…" />

      {loading ? (
        <AdminEmptyState loading />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          title="Heyet yok"
          message="Bu filtrede oturum bulunamadı. Genel heyet açabilirsiniz."
          icon="people-outline"
        />
      ) : (
        filtered.map((item) => {
          const subjectLabel =
            item.subjectType === 'general'
              ? item.customTitle ?? HEYET_SUBJECT_LABELS.general
              : HEYET_SUBJECT_LABELS[item.subjectType];
          const isClosed = item.status === 'closed';

          return (
            <GlassCard key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text variant="label" numberOfLines={1}>
                  {subjectLabel}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isClosed ? `${colors.danger}22` : `${colors.success}22` },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: isClosed ? colors.danger : colors.success, fontWeight: '700' }}
                  >
                    {HEYET_STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>
              <Text secondary variant="caption">
                {formatParties(item)}
              </Text>
              {item.decisionText ? (
                <Text secondary variant="caption" numberOfLines={2}>
                  Karar: {item.decisionText}
                </Text>
              ) : null}
              <AdminActionChip
                label="Sohbete git"
                icon="chatbubbles"
                tone="primary"
                onPress={() => router.push(`/chat/${item.conversationId}` as never)}
              />
            </GlassCard>
          );
        })
      )}

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text variant="label">Genel heyet aç</Text>
            <Text secondary variant="caption">
              Konu başlığı ve en az iki taraf seçin. İsterseniz sonra üye ekleyip çıkarabilirsiniz.
            </Text>
            <Input
              label="Konu başlığı"
              value={createTitle}
              onChangeText={setCreateTitle}
              placeholder="Örn. İade anlaşmazlığı"
            />

            {createSelected.length > 0 ? (
              <View style={styles.selectedWrap}>
                {createSelected.map((user) => (
                  <Pressable
                    key={user.id}
                    style={[styles.selectedChip, { borderColor: `${HEYET_ACCENT}44` }]}
                    onPress={() => toggleCreateUser(user)}
                  >
                    <Text variant="caption" style={{ color: HEYET_ACCENT }}>
                      @{user.username} ×
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <AdminSearchInput
              value={createQuery}
              onChangeText={setCreateQuery}
              placeholder="Taraf ara (@kullanici)…"
            />

            {createResults.map((user) => (
              <Pressable key={user.id} onPress={() => toggleCreateUser(user)}>
                <GlassCard style={styles.resultRow}>
                  <Text variant="label">@{user.username}</Text>
                  {user.full_name ? (
                    <Text secondary variant="caption">
                      {user.full_name}
                    </Text>
                  ) : null}
                </GlassCard>
              </Pressable>
            ))}

            <View style={styles.modalActions}>
              <Button title="Vazgeç" variant="outline" onPress={() => setCreateVisible(false)} fullWidth={false} />
              <Button
                title="Heyet aç"
                onPress={() => void handleCreate()}
                loading={creating}
                disabled={createSelected.length < 2}
                fullWidth={false}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  topActions: {
    marginBottom: spacing.sm,
  },
  info: {
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  card: {
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalSheet: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    maxHeight: '90%',
  },
  selectedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  selectedChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  resultRow: {
    gap: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
