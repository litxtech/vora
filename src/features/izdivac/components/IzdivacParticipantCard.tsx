import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PremiumCallGateSheet } from '@/features/calls/components/PremiumCallGateSheet';
import { IzdivacBadgeChips } from '@/features/izdivac/components/IzdivacBadgeChips';
import { IzdivacParticipantPhoto } from '@/features/izdivac/components/IzdivacParticipantPhoto';
import { useIzdivacContactActions } from '@/features/izdivac/hooks/useIzdivacContactActions';
import type { IzdivacParticipant } from '@/features/izdivac/types';
import { izdivacDisplayName } from '@/features/izdivac/utils';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  participant: IzdivacParticipant;
  accent: string;
  onOpenProfile: (participant: IzdivacParticipant) => void;
};

export function IzdivacParticipantCard({ participant, accent, onOpenProfile }: Props) {
  const { colors, isDark } = useTheme();
  const {
    sendMessage,
    callAudio,
    callVideo,
    messaging,
    calling,
    gateVisible,
    gateCallType,
    closeGate,
  } = useIzdivacContactActions();

  const glassBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)';
  const displayName = izdivacDisplayName(participant);

  return (
    <>
      <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
        <Pressable
          onPress={() => onOpenProfile(participant)}
          accessibilityRole="button"
          accessibilityLabel={`${displayName} profilini aç`}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <IzdivacParticipantPhoto
            avatarUrl={participant.avatarUrl}
            coverUrl={participant.coverUrl}
            displayName={displayName}
            accent={accent}
          />

          <View style={styles.meta}>
            <Text variant="caption" style={styles.name} numberOfLines={2}>
              {displayName}
            </Text>
            {participant.specialBadges.length > 0 ? (
              <IzdivacBadgeChips badges={participant.specialBadges} iconOnly />
            ) : null}
            <View style={styles.ageRow}>
              <Text variant="caption" secondary style={styles.age}>
                {participant.ageYears != null && participant.ageYears > 0 ? `${participant.ageYears} yaş` : '—'}
              </Text>
              {participant.inLobby ? <View style={[styles.lobbyDot, { backgroundColor: accent }]} /> : null}
              {!participant.inLobby && participant.isOnline ? <View style={styles.onlineDot} /> : null}
            </View>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void sendMessage(participant.userId)}
            disabled={messaging}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Mesaj"
          >
            <Ionicons name="chatbubble-outline" size={16} color={accent} />
          </Pressable>
          <Pressable
            onPress={() => callAudio(participant.userId)}
            disabled={calling}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Sesli ara"
          >
            <Ionicons name="call-outline" size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => callVideo(participant.userId)}
            disabled={calling}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Görüntülü ara"
          >
            <Ionicons name="videocam-outline" size={16} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      <PremiumCallGateSheet visible={gateVisible} callType={gateCallType} onClose={closeGate} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
    gap: 0,
  },
  meta: {
    gap: 2,
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  age: { fontSize: 10, lineHeight: 12 },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: '#43A047',
  },
  lobbyDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-start',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
