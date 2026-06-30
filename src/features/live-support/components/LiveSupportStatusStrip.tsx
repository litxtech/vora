import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  LIVE_SUPPORT_ACCENT,
  LIVE_SUPPORT_SESSION_HINT,
  LIVE_SUPPORT_STATUS_LABELS,
} from '@/features/live-support/constants';
import type { LiveSupportThread } from '@/features/live-support/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function formatSessionCountdown(expiresAt: string): string {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return 'Süre doldu';
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  if (minutes > 0) return `${minutes} dk ${seconds} sn`;
  return `${seconds} sn`;
}

type LiveSupportStatusStripProps = {
  thread: LiveSupportThread | null;
  compact?: boolean;
};

export const LiveSupportStatusStrip = memo(function LiveSupportStatusStrip({
  thread,
  compact = false,
}: LiveSupportStatusStripProps) {
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!thread?.session_expires_at || thread.status === 'closed') {
      setCountdown(null);
      return;
    }

    const update = () => setCountdown(formatSessionCountdown(thread.session_expires_at!));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [thread?.session_expires_at, thread?.status]);

  const isActive = thread?.status === 'waiting_support' || thread?.status === 'open';

  return (
    <View
      style={[
        compact ? styles.stripCompact : styles.strip,
        compact
          ? { borderBottomColor: colors.border, backgroundColor: colors.background }
          : {
              backgroundColor: `${LIVE_SUPPORT_ACCENT}12`,
              borderColor: `${LIVE_SUPPORT_ACCENT}30`,
            },
      ]}
    >
      <View style={styles.stripTop}>
        <View style={styles.liveBadge}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isActive ? '#22C55E' : colors.textMuted },
            ]}
          />
          <Text variant="caption" style={{ color: LIVE_SUPPORT_ACCENT, fontWeight: '700' }}>
            {thread ? LIVE_SUPPORT_STATUS_LABELS[thread.status] : 'Canlı destek'}
          </Text>
        </View>

        {countdown ? (
          <View style={[styles.timerPill, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="time-outline" size={12} color={colors.warning} />
            <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
              {countdown}
            </Text>
          </View>
        ) : null}

        {thread && thread.user_unread_count > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
            <Text variant="caption" style={styles.unreadText}>
              {thread.user_unread_count}
            </Text>
          </View>
        ) : null}
      </View>

      {!compact ? (
        <Text secondary variant="caption" style={styles.hint}>
          {LIVE_SUPPORT_SESSION_HINT}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  strip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 2,
    marginBottom: spacing.xs,
  },
  stripCompact: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: 2,
  },
  stripTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  hint: { lineHeight: 15, fontSize: 11 },
});
