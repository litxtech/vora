import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { CallParticipant } from '../types';
import { displayName } from '../utils';

type CallAvatarProps = {
  participant?: CallParticipant | null;
  size?: number;
  showName?: boolean;
  subtitle?: string;
};

export function CallAvatar({
  participant,
  size = 128,
  showName = true,
  subtitle,
}: CallAvatarProps) {
  const name = displayName(participant);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.ring,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
          },
        ]}
      >
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
          {participant?.avatar_url ? (
            <Image source={{ uri: participant.avatar_url }} style={styles.image} />
          ) : (
            <Text variant="h1" style={styles.initials}>
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
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    overflow: 'hidden',
    backgroundColor: '#243044',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: '#F4F7FB',
    fontSize: 42,
    lineHeight: 48,
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
