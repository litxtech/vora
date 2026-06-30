import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { CALL_DESIGN } from '@/features/calls/constants';
import type { CallParticipant } from '@/features/calls/types';
import { displayName } from '@/features/calls/utils';
import { CallAvatar } from './CallAvatar';
import { CallPulseRings } from './CallPulseRings';

type CallHeroStageProps = {
  participant?: CallParticipant | null;
  subtitle: string;
  pulseActive?: boolean;
  pulseColor?: string;
  compact?: boolean;
};

/** Gelen/giden/sesli arama merkez sahnesi — avatar, nabız halkaları, isim. */
export function CallHeroStage({
  participant,
  subtitle,
  pulseActive = false,
  pulseColor = CALL_DESIGN.pulse.outgoingColor,
  compact = false,
}: CallHeroStageProps) {
  const avatarSize = compact ? 108 : CALL_DESIGN.heroAvatarSize;
  const name = displayName(participant);

  return (
    <Animated.View entering={FadeIn.duration(320)} style={styles.stage}>
      <View style={styles.avatarStack}>
        {pulseActive ? (
          <View style={styles.pulseLayer}>
            <CallPulseRings size={avatarSize} color={pulseColor} active />
          </View>
        ) : null}
        <CallAvatar participant={participant} size={avatarSize} showName={false} glow={pulseActive} />
      </View>

      <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.meta}>
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  avatarStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  nameCompact: {
    fontSize: 24,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
});
