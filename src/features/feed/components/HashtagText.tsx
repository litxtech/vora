import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { hashtagPath } from '@/features/hashtag/navigation';
import { useTheme } from '@/providers/ThemeProvider';

type HashtagTextProps = {
  content: string;
};

export function HashtagText({ content }: HashtagTextProps) {
  const { colors } = useTheme();
  const parts = content.split(/(#[\p{L}\p{N}_]+)/gu);

  return (
    <Text>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <Text
              key={i}
              style={[styles.tag, { color: colors.primary }]}
              onPress={() => router.push(hashtagPath(tag))}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: { fontWeight: '600' },
});
