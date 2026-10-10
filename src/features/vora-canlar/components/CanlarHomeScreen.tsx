import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { CanlarFeedCard } from '@/features/vora-canlar/components/CanlarFeedCard';
import { CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import { CanlarIconButton, leaveCanlarToApp } from '@/features/vora-canlar/components/canlarUi';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { useCanlarFeed } from '@/features/vora-canlar/hooks/useCanlarFeed';
import { buildCanlarExampleRows, buildCanlarHomeRows } from '@/features/vora-canlar/services/homeFeed';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarHomeScreen() {
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const { feed, loading, refreshing, error, load } = useCanlarFeed();
  const rows = buildCanlarHomeRows(feed);
  const examples = buildCanlarExampleRows();

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        void load({ silent: true });
      }, 12000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const openCreate = async (href: string, label: string) => {
    const allowed = await requireAuth(label);
    if (!allowed) return;
    router.push(href as never);
  };

  return (
    <CanlarScaffold
      title="Vora Canlar"
      refreshing={refreshing}
      onRefresh={() => void load({ pull: true })}
      headerActions={
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Uygulamaya dön"
            onPress={leaveCanlarToApp}
            hitSlop={6}
            style={({ pressed }) => [styles.leave, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          >
            <Ionicons name="apps-outline" size={15} color={CANLAR_ACCENT} />
            <Text style={styles.leaveLabel}>Uygulamaya dön</Text>
          </Pressable>
          <CanlarIconButton icon="notifications-outline" label="Bildirimler" onPress={() => router.push('/notifications' as never)} />
        </View>
      }
    >
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paylaş"
          onPress={() => void openCreate('/vora-canlar/post/create', 'Paylaşım')}
          style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="create-outline" size={18} color={CANLAR_ACCENT} />
          <Text style={styles.actionLabel}>Paylaş</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yardım et"
          onPress={() => router.push('/vora-canlar/help' as never)}
          style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="heart-outline" size={18} color={CANLAR_ACCENT} />
          <Text style={styles.actionLabel}>Yardım et</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yardımlarım"
          onPress={() => router.push('/vora-canlar/me' as never)}
          style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="list-outline" size={18} color={CANLAR_ACCENT} />
          <Text style={styles.actionLabel}>Yardımlarım</Text>
        </Pressable>
      </View>
      {loading && rows.length === 0 ? <ActivityIndicator color={CANLAR_ACCENT} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {rows.map((row) => (
        <CanlarFeedCard key={row.key} row={row} onChanged={() => void load({ silent: true })} />
      ))}
      <Text style={styles.examplesTitle}>Örnek paylaşımlar</Text>
      {examples.map((row) => (
        <CanlarFeedCard key={row.key} row={row} />
      ))}
    </CanlarScaffold>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 8,
    minHeight: 36,
  },
  leaveLabel: { color: CANLAR_ACCENT, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: { fontSize: 12, fontWeight: '800' },
  examplesTitle: { fontSize: 16, fontWeight: '800', marginTop: spacing.sm },
});
