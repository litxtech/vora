import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { initiateCall } from '@/features/calls/services/callService';
import { ensureCallPermissions } from '@/features/calls/services/callPermissions';
import type { CallType } from '@/features/calls/types';
import { PREMIUM_CALL_REQUIRED_MESSAGE } from '@/features/calls/constants';
import { callErrorMessage } from '@/features/calls/utils';
import { canCallUser } from '@/features/messaging/services/messagingPrefs';
import { hasPremiumEntitlement, subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { useCallNavigation } from '@/providers/CallProvider';
import { useAuth } from '@/providers/AuthProvider';

function isPremiumRequiredError(error: unknown): boolean {
  const message = callErrorMessage(error, '');
  return message.includes(PREMIUM_CALL_REQUIRED_MESSAGE) || message.includes('Premium abonelik');
}

export function usePremiumOutgoingCall() {
  const { user, profile } = useAuth();
  const { startOutgoingCall } = useCallNavigation();
  const [gateVisible, setGateVisible] = useState(false);
  const [gateCallType, setGateCallType] = useState<CallType>('audio');
  const [calling, setCalling] = useState(false);

  const openGate = useCallback((callType: CallType) => {
    setGateCallType(callType);
    setGateVisible(true);
  }, []);

  const closeGate = useCallback(() => {
    setGateVisible(false);
  }, []);

  const initiateOutgoingCall = useCallback(
    async (calleeId: string, callType: CallType) => {
      if (!user?.id) return;

      if (subscriptionsCommerceEnabled() && !hasPremiumEntitlement(profile?.is_premium)) {
        openGate(callType);
        return;
      }

      setCalling(true);
      try {
        const permissions = await ensureCallPermissions(callType);
        if (!permissions.granted) {
          Alert.alert('İzin gerekli', permissions.message ?? 'Arama için gerekli izinler verilmedi.');
          return;
        }

        const allowed = await canCallUser(calleeId, user.id);
        if (!allowed) {
          Alert.alert('Arama yapılamıyor', 'Bu kullanıcı arama almıyor.');
          return;
        }

        const session = await initiateCall(calleeId, callType, user.id);
        startOutgoingCall(session);
      } catch (error) {
        if (subscriptionsCommerceEnabled() && isPremiumRequiredError(error)) {
          openGate(callType);
          return;
        }
        Alert.alert('Arama başlatılamadı', callErrorMessage(error));
      } finally {
        setCalling(false);
      }
    },
    [user?.id, profile?.is_premium, openGate, startOutgoingCall],
  );

  return {
    initiateOutgoingCall,
    calling,
    gateVisible,
    gateCallType,
    closeGate,
  };
}
