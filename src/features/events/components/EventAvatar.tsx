import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_CENTER_DEF } from '@/features/events/constants';
import { useTheme } from '@/providers/ThemeProvider';

type EventAvatarProps = {
  coverUrl: string | null;
  size?: number;
  live?: boolean;
  accentColor?: string;
};

export function EventAvatar({
  coverUrl,
  size = 48,
  live = false,
  accentColor = EVENT_CENTER_DEF.accent,
}: EventAvatarProps) {
  const { colors } = useTheme();
  const radius = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: live ? '#FF2D55' : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ width: size, height: size, borderRadius: radius }} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: `${accentColor}14` }]}>
            <Ionicons name="calendar" size={size * 0.4} color={accentColor} />
          </View>
        )}
      </View>
      {live ? (
        <View style={[styles.liveDot, { borderColor: colors.background, backgroundColor: '#FF2D55' }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  avatar: {
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
