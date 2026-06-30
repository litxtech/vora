import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  urls: string[];
};

function HotelVideoTile({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  return (
    <View style={styles.tile}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="cover" />
    </View>
  );
}

export function HotelVideoStrip({ urls }: Props) {
  const { colors } = useTheme();
  if (!urls.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="videocam-outline" size={16} color={HOTEL_ACCENT} />
        <Text variant="label">Otel videoları</Text>
      </View>
      <View style={styles.row}>
        {urls.map((url) => (
          <HotelVideoTile key={url} url={url} />
        ))}
      </View>
      <Text secondary variant="caption" style={{ color: colors.textMuted }}>
        Tanıtım videoları işletme tarafından yüklenmiştir.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { gap: spacing.sm },
  tile: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: '100%' },
});
