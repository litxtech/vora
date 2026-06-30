import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ChannelCard } from '@/features/channels/components/ChannelCard';
import { fetchSubscribedChannels } from '@/features/channels/services/channelData';
import type { Channel } from '@/features/channels/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';

export function ChannelsInbox() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setChannels([]);
      setLoading(false);
      return;
    }
    setChannels(await fetchSubscribedChannels(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const renderItem = useCallback(
    ({ item: channel }: { item: Channel }) => <ChannelCard channel={channel} />,
    [],
  );

  const keyExtractor = useCallback((item: Channel) => item.id, []);

  const listHeader = useCallback(
    () => (
      <Pressable
        style={[styles.browseBtn, { borderColor: colors.primary }]}
        onPress={() => router.push('/channels' as never)}
      >
        <Ionicons name="compass-outline" size={18} color={colors.primary} />
        <Text style={{ color: colors.primary }}>Tüm Kanalları Keşfet</Text>
      </Pressable>
    ),
    [colors.primary],
  );

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
  }

  if (channels.length === 0) {
    return (
      <View style={styles.wrap}>
        {listHeader()}
        <GlassCard style={styles.empty}>
          <Ionicons name="megaphone-outline" size={32} color={colors.textMuted} />
          <Text secondary>Takip ettiğiniz kanal yok.</Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.listFlex}
      data={channels}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      {...getAndroidFlatListPerfProps()}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
