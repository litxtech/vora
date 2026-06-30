import { useState } from 'react';
import { Alert } from 'react-native';
import { usePremiumOutgoingCall } from '@/features/calls/hooks/usePremiumOutgoingCall';
import { startIzdivacDirectChat } from '@/features/izdivac/services/izdivacEcosystem';
import { openIzdivacChat } from '@/features/izdivac/services/izdivacMessagingNavigation';
import { alertBlockError } from '@/features/moderation/utils/blockErrors';

export function useIzdivacContactActions() {
  const { initiateOutgoingCall, calling, gateVisible, gateCallType, closeGate } = usePremiumOutgoingCall();
  const [messaging, setMessaging] = useState(false);

  const sendMessage = async (userId: string) => {
    setMessaging(true);
    const { conversationId, error } = await startIzdivacDirectChat(userId);
    setMessaging(false);
    if (error) {
      Alert.alert('Mesaj gönderilemedi', alertBlockError(error));
      return;
    }
    if (conversationId) openIzdivacChat(conversationId, { userId });
  };

  const callAudio = (userId: string) => {
    void initiateOutgoingCall(userId, 'audio');
  };

  const callVideo = (userId: string) => {
    void initiateOutgoingCall(userId, 'video');
  };

  return {
    sendMessage,
    callAudio,
    callVideo,
    messaging,
    calling,
    gateVisible,
    gateCallType,
    closeGate,
  };
}
