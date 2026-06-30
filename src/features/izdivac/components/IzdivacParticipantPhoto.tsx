import { useMemo } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';

/** width / height */
const PHOTO_ASPECT = 4 / 5;

type Props = {
  avatarUrl: string | null;
  coverUrl: string | null;
  displayName: string;
  accent: string;
};

export function IzdivacParticipantPhoto({ avatarUrl, coverUrl, displayName, accent }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const photoUrl = useMemo(() => {
    const avatar = avatarUrl?.trim() || null;
    const cover = coverUrl?.trim() || null;
    return avatar ?? cover;
  }, [avatarUrl, coverUrl]);
  const initial = displayName.trim().slice(0, 1).toUpperCase() || '?';

  const frameWidth = Math.max(120, (screenWidth - spacing.md * 2 - spacing.sm) / 2);
  const frameHeight = frameWidth / PHOTO_ASPECT;

  return (
    <View style={[styles.frame, { height: frameHeight }]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: `${accent}14` }]}>
          <Ionicons name="person-outline" size={28} color={accent} />
          <Text variant="caption" style={{ color: accent, fontWeight: '700', fontSize: 12 }}>
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
