import { memo } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { RichText } from '@/features/richtext';

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
  return (
    <RichText
      content={content}
      linkColor={linkColor}
      style={[styles.messageText, { color: textColor }, style]}
    />
  );
});

const styles = StyleSheet.create({
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
});
