import { ChatScreen } from '@/features/messaging/components/ChatScreen';
import { ChatMediaViewerProvider } from '@/features/messaging/context/ChatMediaViewerContext';

export default function ChatRoute() {
  return (
    <ChatMediaViewerProvider>
      <ChatScreen />
    </ChatMediaViewerProvider>
  );
}
