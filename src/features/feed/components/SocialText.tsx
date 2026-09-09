import { type StyleProp, type TextStyle } from 'react-native';
import { RichText } from '@/features/richtext';
import { useTheme } from '@/providers/ThemeProvider';

type SocialTextProps = {
  content: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  light?: boolean;
};

/** Caption / overlay metni: link, @mention ve #hashtag. */
export function SocialText({ content, style, numberOfLines, light }: SocialTextProps) {
  const { colors } = useTheme();
  const mentionColor = light ? '#90CAF9' : colors.primary;
  const hashtagColor = light ? '#80DEEA' : colors.accent;
  const linkColor = light ? '#90CAF9' : colors.primary;
  const baseColor = light ? '#fff' : undefined;

  return (
    <RichText
      content={content}
      style={[baseColor ? { color: baseColor } : undefined, style]}
      numberOfLines={numberOfLines}
      linkColor={linkColor}
      enableMentions
      enableHashtags
      mentionColor={mentionColor}
      hashtagColor={hashtagColor}
    />
  );
}
