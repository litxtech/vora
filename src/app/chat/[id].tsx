import { ChatMediaViewerProvider } from '@/features/messaging/context/ChatMediaViewerContext';
import { ChatRouteScreen } from '@/lib/navigation/lazyRouteScreens';

export default function ChatRoute() {
  return (
    <ChatMediaViewerProvider>
      <ChatRouteScreen />
    </ChatMediaViewerProvider>
  );
}
