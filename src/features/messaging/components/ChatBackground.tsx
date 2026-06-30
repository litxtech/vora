import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { getChatTheme } from '../theme/chatTheme';

/** Sohbet ekranı arka planı — hafif nokta deseni */
export function ChatBackground() {
  const { colors, isDark } = useTheme();
  const chat = getChatTheme(colors, isDark);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: chat.screenBg }]} pointerEvents="none">
      <View style={styles.pattern}>
        {Array.from({ length: 48 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: chat.wallpaperDot,
                opacity: i % 3 === 0 ? 1 : 0.55,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pattern: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 28,
    opacity: 0.9,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
