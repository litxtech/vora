import { createContext, useContext, type ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

type ChatKeyboardScrollContextValue = {
  offset: number;
  extraContentPadding: SharedValue<number>;
};

const ChatKeyboardScrollContext = createContext<ChatKeyboardScrollContextValue | null>(null);

export function ChatKeyboardScrollProvider({
  value,
  children,
}: {
  value: ChatKeyboardScrollContextValue;
  children: ReactNode;
}) {
  return (
    <ChatKeyboardScrollContext.Provider value={value}>{children}</ChatKeyboardScrollContext.Provider>
  );
}

export function useChatKeyboardScrollContext() {
  const ctx = useContext(ChatKeyboardScrollContext);
  if (!ctx) {
    throw new Error('useChatKeyboardScrollContext must be used within ChatKeyboardScrollProvider');
  }
  return ctx;
}
