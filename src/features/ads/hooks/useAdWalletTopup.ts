import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { startAdWalletTopup } from '@/features/ads/services/adBilling';

export function useAdWalletTopup() {
  const [pendingAmountCents, setPendingAmountCents] = useState<number | null>(null);

  const topup = useCallback(async (amountCents: number) => {
    setPendingAmountCents(amountCents);
    try {
      const { error } = await startAdWalletTopup(amountCents);
      if (error) {
        Alert.alert('Yükleme başarısız', error);
        return false;
      }
      return true;
    } finally {
      setPendingAmountCents(null);
    }
  }, []);

  const isLoading = pendingAmountCents !== null;

  const isPresetLoading = useCallback(
    (amountCents: number) => pendingAmountCents === amountCents,
    [pendingAmountCents],
  );

  return { topup, isLoading, isPresetLoading, pendingAmountCents };
}
