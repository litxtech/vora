import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { hashtagPath } from '@/features/hashtag/navigation';
import { useTheme } from '@/providers/ThemeProvider';

type SocialTextProps = {
  content: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  light?: boolean;
};

const TOKEN_PATTERN = /(@[a-z0-9_.-]+|#[\p{L}\p{N}_]+)/giu;

export function SocialText({ content, style, numberOfLines, light }: SocialTextProps) {
  const { colors } = useTheme();
  const parts = content.split(TOKEN_PATTERN);
  const mentionColor = light ? '#90CAF9' : colors.primary;
  const hashtagColor = light ? '#80DEEA' : colors.accent;
  const baseColor = light ? '#fff' : undefined;

  return (
    <Text style={[baseColor ? { color: baseColor } : undefined, style]} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Text
              key={`${index}-${part}`}
              style={[styles.token, { color: mentionColor }]}
              onPress={() => router.push(`/u/${username}` as never)}
            >
              {part}
            </Text>
          );
        }
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <Text
              key={`${index}-${part}`}
              style={[styles.token, { color: hashtagColor }]}
              onPress={() => router.push(hashtagPath(tag))}
            >
              {part}
            </Text>
          );
        }
        return <Text key={`${index}-text`}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  token: { fontWeight: '600' },
});
