import { Platform, StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import { isHiddenPublicAccount, sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import type { CallParticipant } from '@/features/calls/types';
import { displayName } from '@/features/calls/utils';

type IncomingCallStageProps = {
  participant?: CallParticipant | null;
  subtitle: string;
};

/** Gelen arama — üstte sade avatar, isim ve durum metni. */
export function IncomingCallStage({ participant, subtitle }: IncomingCallStageProps) {
  const name = displayName(participant);
  const hidden = isHiddenPublicAccount(participant?.account_status);
  const avatarUrl = sanitizeAvatarUrl(participant?.avatar_url, participant?.account_status);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.wrap}>
      <View style={styles.avatar}>
        {hidden ? (
          <Ionicons name="person-outline" size={52} color="#9AA8BC" />
        ) : avatarUrl ? (
          <OptimizedImage
            uri={avatarUrl}
            tier="avatar"
            layoutWidth={120}
            recyclingKey={avatarUrl}
            style={styles.avatarImage}
            transition={0}
          />
        ) : (
          <RNText
            style={styles.initials}
            {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
          >
            {initials}
          </RNText>
        )}
      </View>
      <Text variant="h2" style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#243044',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: '#F4F7FB',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    textAlign: 'center',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
