import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import type { CallParticipant } from '@/features/calls/types';
import { useAuth } from '@/providers/AuthProvider';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';
import { fetchCallHistory } from '../services/conversationData';
import type { CallHistoryItem } from '../types';
import { formatCallDuration, formatMessageTime } from '../utils';

const STATUS_LABELS: Record<string, string> = {
  ringing: 'Çalıyor',
  accepted: 'Cevaplandı',
  declined: 'Reddedildi',
  ended: 'Tamamlandı',
  missed: 'Cevapsız',
  cancelled: 'İptal',
};

export function CallHistoryList() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    fetchCallHistory(user.id)
      .then((rows) =>
        rows.map((row) => {
          const isOutgoing = row.caller_id === user.id;
          const other = (isOutgoing ? row.callee : row.caller) as CallParticipant;
          return {
            id: row.id,
            callType: row.call_type,
            status: row.status,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            createdAt: row.created_at,
            otherUser: other,
            isOutgoing,
          };
        }),
      )
      .then(setCalls)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const renderItem = useCallback(
    ({ item: call }: { item: CallHistoryItem }) => (
      <View
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <CallAvatar participant={call.otherUser} size={44} showName={false} />
        <View style={styles.info}>
          <Text variant="label">
            {call.otherUser.full_name?.trim() || call.otherUser.username}
          </Text>
          <Text variant="caption" secondary>
            {call.isOutgoing ? 'Giden' : 'Gelen'} · {STATUS_LABELS[call.status] ?? call.status} ·{' '}
            {formatCallDuration(call.startedAt, call.endedAt)}
          </Text>
          <Text variant="caption" muted>
            {formatMessageTime(call.createdAt)}
          </Text>
        </View>
        <Ionicons
          name={call.callType === 'video' ? 'videocam' : 'call'}
          size={20}
          color={call.status === 'missed' ? colors.danger : colors.primary}
        />
      </View>
    ),
    [colors.border, colors.danger, colors.primary, colors.surface],
  );

  const keyExtractor = useCallback((item: CallHistoryItem) => item.id, []);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  if (calls.length === 0) {
    return (
      <Text secondary style={styles.empty}>
        Henüz arama geçmişi yok.
      </Text>
    );
  }

  return (
    <FlatList
      style={styles.listFlex}
      data={calls}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      {...getAndroidFlatListPerfProps()}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
});
