import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ChannelCard } from '@/features/channels/components/ChannelCard';
import { CHANNEL_TYPES } from '@/features/channels/constants';
import { fetchChannels, fetchSubscribedChannels } from '@/features/channels/services/channelData';
import type { Channel, ChannelType } from '@/features/channels/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Tab = 'subscribed' | 'discover';

export function ChannelsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<Tab>('subscribed');
  const [typeFilter, setTypeFilter] = useState<ChannelType | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (tab === 'subscribed' && user) {
      setChannels(await fetchSubscribedChannels(user.id));
    } else {
      setChannels(
        await fetchChannels(user?.id ?? null, typeFilter, profile?.region_id ?? null),
      );
    }
  }, [tab, user, typeFilter, profile?.region_id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!(await requireAuth('Kanal oluşturma'))) return;
    router.push('/channels/create' as never);
  };

  return (
    <GradientBackground>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        ListHeaderComponent={
          <>
            <AuthHeader
              title="Kanallar"
              subtitle="Tek yönlü yayın — Telegram mantığıyla haber ve duyurular"
            />
            <View style={styles.actions}>
              <Button title="Kanal Oluştur" onPress={handleCreate} fullWidth={false} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
              {(['subscribed', 'discover'] as Tab[]).map((t) => {
                const active = tab === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? `${colors.primary}22` : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text variant="caption" style={{ color: active ? colors.primary : colors.text }}>
                      {t === 'subscribed' ? 'Takip Ettiklerim' : 'Keşfet'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {tab === 'discover' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                <Pressable
                  onPress={() => setTypeFilter(null)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: typeFilter === null ? `${colors.primary}22` : colors.surface,
                      borderColor: typeFilter === null ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text variant="caption">Tümü</Text>
                </Pressable>
                {CHANNEL_TYPES.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setTypeFilter(t.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: typeFilter === t.id ? `${t.color}22` : colors.surface,
                        borderColor: typeFilter === t.id ? t.color : colors.border,
                      },
                    ]}
                  >
                    <Text variant="caption">{t.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </>
        }
        renderItem={({ item }) => <ChannelCard channel={item} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <GlassCard style={styles.empty}>
              <Text secondary>
                {tab === 'subscribed'
                  ? 'Henüz kanal takip etmiyorsunuz.'
                  : 'Kanal bulunamadı.'}
              </Text>
            </GlassCard>
          )
        }
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
  },
  actions: {
    marginBottom: spacing.sm,
  },
  tabBar: {
    marginBottom: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  filterBar: {
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
