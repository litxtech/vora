import { type StyleProp, type TextStyle } from 'react-native';
import { RichText } from '@/features/richtext';
import { useTheme } from '@/providers/ThemeProvider';

type HashtagTextProps = {
  content: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** Gönderi gövdesi: tıklanabilir link, #hashtag ve @mention. */
export function HashtagText({ content, style, numberOfLines }: HashtagTextProps) {
  const { colors } = useTheme();

  return (
    <RichText
      content={content}
      style={style}
      numberOfLines={numberOfLines}
      linkColor={colors.primary}
      enableMentions
      enableHashtags
      mentionColor={colors.primary}
      hashtagColor={colors.primary}
    />
  );
}
