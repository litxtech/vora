import { memo, useMemo } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { openUrl } from '@/lib/linking/openUrl';
import { showPhoneContactOptions } from '../services/phoneContactActions';
import { splitMessageText } from '../utils/messageTextSegments';

type ChatMessageTextProps = {
  content: string;
  textColor: string;
  linkColor: string;
  style?: TextStyle;
};

export const ChatMessageText = memo(function ChatMessageText({
  content,
  textColor,
  linkColor,
  style,
}: ChatMessageTextProps) {
  const segments = useMemo(() => splitMessageText(content), [content]);

  if (segments.length === 1 && segments[0].kind === 'text') {
    return (
      <Text style={[styles.messageText, { color: textColor }, style]}>{content}</Text>
    );
  }

  return (
    <Text style={[styles.messageText, { color: textColor }, style]}>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <Text key={`t-${index}`}>{segment.value}</Text>;
        }

        if (segment.kind === 'url') {
          return (
            <Text
              key={`u-${index}`}
              style={[styles.link, { color: linkColor }]}
              onPress={() => void openUrl(segment.value)}
              suppressHighlighting
            >
              {segment.display}
            </Text>
          );
        }

        return (
          <Text
            key={`p-${index}`}
            style={[styles.link, { color: linkColor }]}
            onPress={() => showPhoneContactOptions(segment.display, segment.value)}
            suppressHighlighting
          >
            {segment.display}
          </Text>
        );
      })}
    </Text>
  );
});

const styles = StyleSheet.create({
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
