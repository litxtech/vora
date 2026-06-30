import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { channelDetailPath, channelTypeMeta } from '@/features/channels/constants';
import type { Channel } from '@/features/channels/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ChannelCardProps = {
  channel: Channel;
};

export const ChannelCard = memo(function ChannelCard({ channel }: ChannelCardProps) {
  const { colors } = useTheme();
  const meta = channelTypeMeta(channel.channelType);

  return (
    <Pressable onPress={() => router.push(channelDetailPath(channel.id) as never)}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: `${meta.color}22` }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text variant="label" numberOfLines={1}>
                {channel.name}
              </Text>
              {channel.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              ) : null}
            </View>
            <Text variant="caption" secondary>
              {meta.label} · {channel.subscriberCount} takipçi
            </Text>
          </View>
          {channel.isSubscribed ? (
            <Ionicons name="notifications" size={18} color={colors.primary} />
          ) : null}
        </View>
        {channel.description ? (
          <Text secondary variant="caption" numberOfLines={2}>
            {channel.description}
          </Text>
        ) : null}
      </GlassCard>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
