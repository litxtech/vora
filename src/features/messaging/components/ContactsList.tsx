import { Alert, View } from 'react-native';
import { PhoneBookList, usePhoneBook, type PhoneBookContact } from '@/features/contact-discovery';
import { PremiumCallGateSheet } from '@/features/calls/components/PremiumCallGateSheet';
import { usePremiumOutgoingCall } from '@/features/calls/hooks/usePremiumOutgoingCall';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { getOrCreateDirectConversation } from '../services/conversationData';
import { openChat, prefetchChatNavigation } from '../services/messagingNavigation';

export function ContactsList() {
  const book = usePhoneBook();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { initiateOutgoingCall, gateVisible, gateCallType, closeGate } = usePremiumOutgoingCall();

  const openContact = async (contact: PhoneBookContact) => {
    if (!contact.match) return;
    prefetchChatNavigation();
    if (!(await requireAuth('Mesaj'))) return;
    const { conversationId, error } = await getOrCreateDirectConversation(contact.match.userId);
    if (error) {
      Alert.alert('Sohbet başlatılamadı', error);
      return;
    }
    if (conversationId) openChat(conversationId, { userId: user?.id });
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <PhoneBookList
        phase={book.phase}
        contacts={book.contacts}
        notice={book.notice}
        refreshing={book.refreshing}
        showTitle
        onRequestAccess={() => void book.requestAccess()}
        onOpenSettings={book.openSettings}
        onRefresh={() => void book.refresh()}
        onOpenContact={(contact) => void openContact(contact)}
        onCallContact={(contact) => {
          if (!contact.match) return;
          void initiateOutgoingCall(contact.match.userId, 'audio');
        }}
      />
      <PremiumCallGateSheet visible={gateVisible} callType={gateCallType} onClose={closeGate} />
    </View>
  );
}
