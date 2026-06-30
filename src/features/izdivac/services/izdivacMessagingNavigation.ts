import { openChat, type OpenChatOptions } from '@/features/messaging/services/messagingNavigation';

export function openIzdivacChat(conversationId: string, options?: Omit<OpenChatOptions, 'from'>) {
  openChat(conversationId, { ...options, from: 'izdivac' });
}
