import { memo, useMemo } from 'react';
import { InteractionManager, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import { hashtagPath } from '@/features/hashtag/navigation';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';
import { showPhoneContactOptions } from '../services/phoneActions';
import { splitMessageText } from '../utils/textSegments';
import { formatUrlDisplay } from '../utils/urlDisplay';

type RichTextProps = {
  content: string;
  /** Normal metin rengi/stili */
  style?: StyleProp<TextStyle>;
  /** Link, mention ve telefon vurgu rengi */
  linkColor: string;
  numberOfLines?: number;
  enableMentions?: boolean;
  enableHashtags?: boolean;
  mentionColor?: string;
  hashtagColor?: string;
  /** Telefon numarasına dokununca (varsayılan: Ara / WhatsApp menüsü) */
  onPhonePress?: (display: string, raw: string) => void;
  /** Link / mention / hashtag navigasyonundan önce (ör. yorum sheet kapat) */
  onBeforeOpen?: () => void;
};

export const RichText = memo(function RichText({
  content,
  style,
  linkColor,
  numberOfLines,
  enableMentions = false,
  enableHashtags = false,
  mentionColor,
  hashtagColor,
  onPhonePress,
  onBeforeOpen,
}: RichTextProps) {
  const { colors } = useTheme();
  const segments = useMemo(
    () => splitMessageText(content, { mentions: enableMentions, hashtags: enableHashtags }),
    [content, enableMentions, enableHashtags],
  );

  const flatStyle = StyleSheet.flatten(style);
  const textColor =
    flatStyle && typeof flatStyle === 'object' && flatStyle.color != null
      ? flatStyle.color
      : colors.text;
  const baseStyle = [styles.base, { color: textColor }, style];

  if (segments.length === 1 && segments[0].kind === 'text') {
    return (
      <Text style={baseStyle} numberOfLines={numberOfLines}>
        {content}
      </Text>
    );
  }

  const mColor = mentionColor ?? linkColor;
  const hColor = hashtagColor ?? linkColor;
  const handlePhone = onPhonePress ?? showPhoneContactOptions;

  const navigateInApp = (route: string) => {
    onBeforeOpen?.();
    InteractionManager.runAfterInteractions(() => {
      router.push(route as never);
    });
  };

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => {
        switch (segment.kind) {
          case 'text':
            return (
              <Text key={`t-${index}`} style={{ color: textColor }}>
                {segment.value}
              </Text>
            );
          case 'url':
            return (
              <Text
                key={`u-${index}`}
                style={[styles.link, { color: linkColor }]}
                onPress={() => void openUrl(segment.value, { onBeforeNavigate: onBeforeOpen })}
                suppressHighlighting
              >
                {formatUrlDisplay(segment.display)}
              </Text>
            );
          case 'phone':
            return (
              <Text
                key={`p-${index}`}
                style={[styles.phone, { color: linkColor }]}
                onPress={() => handlePhone(segment.display, segment.value)}
                suppressHighlighting
              >
                {segment.display}
              </Text>
            );
          case 'mention':
            return (
              <Text
                key={`m-${index}`}
                style={[styles.token, { color: mColor }]}
                onPress={() => navigateInApp(`/u/${segment.value}`)}
                suppressHighlighting
              >
                {segment.display}
              </Text>
            );
          case 'hashtag':
            return (
              <Text
                key={`h-${index}`}
                style={[styles.token, { color: hColor }]}
                onPress={() => navigateInApp(hashtagPath(segment.value))}
                suppressHighlighting
              >
                {segment.display}
              </Text>
            );
          default:
            return null;
        }
      })}
    </Text>
  );
});

const styles = StyleSheet.create({
  base: {
    fontSize: 15,
    lineHeight: 20,
  },
  /** Modern link: alt çizgi yok, yumuşak ağırlık — kart zaten önizlemeyi taşır */
  link: {
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  phone: {
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  token: {
    fontWeight: '600',
  },
});
