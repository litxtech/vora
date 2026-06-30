import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { usePremiumOutgoingCall } from '@/features/calls/hooks/usePremiumOutgoingCall';
import type { CallLogMetadata } from '../types';

type ChatCallLogProps = {
  metadata: CallLogMetadata;
  content: string;
  metaColor: string;
  primaryColor: string;
  peerUserId: string;
  isOutgoing: boolean;
};

function formatDurationLabel(durationSec: number): string {
  if (durationSec <= 0) return '';
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ChatCallLog({
  metadata,
  content,
  metaColor,
  primaryColor,
  peerUserId,
  isOutgoing,
}: ChatCallLogProps) {
  const { initiateOutgoingCall, calling } = usePremiumOutgoingCall();
  const isMissed = metadata.status === 'missed';
  const isVideo = metadata.callType === 'video';
  const iconName = isVideo ? 'videocam' : 'call';
  const iconColor = isMissed ? '#F87171' : primaryColor;
  const durationLabel =
    metadata.status === 'ended' && metadata.durationSec > 0
      ? formatDurationLabel(metadata.durationSec)
      : '';

  const directionLabel = isOutgoing ? 'Giden arama' : 'Gelen arama';

  const handleCallBack = () => {
    if (calling) return;
    void initiateOutgoingCall(peerUserId, metadata.callType);
  };

  return (
    <Pressable
      style={styles.wrap}
      onPress={handleCallBack}
      accessibilityRole="button"
      accessibilityLabel="Tekrar ara"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons
          name={isMissed ? 'call-outline' : iconName}
          size={18}
          color={iconColor}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{content}</Text>
        <Text variant="caption" style={{ color: metaColor }}>
          {directionLabel}
          {durationLabel ? ` · ${durationLabel}` : ''}
        </Text>
      </View>
      <Ionicons name="arrow-redo-outline" size={18} color={metaColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 220,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
});
