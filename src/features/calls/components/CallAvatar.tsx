import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { isHiddenPublicAccount, sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { CALL_DESIGN } from '@/features/calls/constants';
import type { CallParticipant } from '../types';
import { displayName } from '../utils';

type CallAvatarProps = {
  participant?: CallParticipant | null;
  size?: number;
  showName?: boolean;
  subtitle?: string;
  glow?: boolean;
};

export const CallAvatar = memo(function CallAvatar({
  participant,
  size = 128,
  showName = true,
  subtitle,
  glow = false,
}: CallAvatarProps) {
  const hidden = isHiddenPublicAccount(participant?.account_status);
  const name = displayName(participant);
  const avatarUrl = sanitizeAvatarUrl(participant?.avatar_url, participant?.account_status);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const ringSize = size + CALL_DESIGN.heroAvatarRing * 2 + 10;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
          },
          glow && styles.ringGlow,
        ]}
      >
        {glow ? (
          <LinearGradient
            colors={['rgba(0,191,165,0.55)', 'rgba(30,136,229,0.45)', 'rgba(0,191,165,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
          />
        ) : null}
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {hidden ? (
            <Ionicons name="person-remove-outline" size={size * 0.42} color="#9AA8BC" />
          ) : avatarUrl ? (
            <OptimizedImage
              uri={avatarUrl}
              tier="avatar"
              layoutWidth={size}
              recyclingKey={avatarUrl}
              style={styles.image}
              transition={0}
            />
          ) : (
            <Text variant="h1" style={[styles.initials, { fontSize: size * 0.3, lineHeight: size * 0.34 }]}>
              {initials}
            </Text>
          )}
        </View>
      </View>

      {showName ? (
        <>
          <Text variant="h1" style={styles.name}>
            {name}
          </Text>
          {subtitle ? (
            <Text secondary style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ringGlow: {
    backgroundColor: 'transparent',
    padding: 3,
  },
  gradientRing: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  avatar: {
    overflow: 'hidden',
    backgroundColor: '#243044',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: '#F4F7FB',
    fontWeight: '700',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 17,
    textAlign: 'center',
  },
});
