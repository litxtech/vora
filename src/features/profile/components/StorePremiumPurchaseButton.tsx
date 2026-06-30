import { View, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/theme';
import { StorePremiumRestoreButtonCore } from '@/features/profile/components/StorePremiumRestoreButton';
import {
  useStorePremiumPurchase,
  type StorePurchaseSuccess,
} from '@/features/profile/hooks/useStorePremiumPurchase';
import type { PremiumPlan } from '@/features/profile/services/premiumService';

type StorePremiumPurchaseButtonProps = {
  selectedPlan: PremiumPlan;
  disabled?: boolean;
  onSuccess: (result: StorePurchaseSuccess) => void | Promise<void>;
  onError: (message: string) => void;
  onPressStart?: () => void;
  onRestorePressStart?: () => void;
  onNothingToRestore?: () => void;
};

function storePurchaseButtonLabel(options: {
  loading: boolean;
  productsLoading: boolean;
  ready: boolean;
}): string {
  if (options.productsLoading || !options.ready) {
    return Platform.OS === 'ios'
      ? 'App Store ürünleri yükleniyor…'
      : 'Google Play ürünleri yükleniyor…';
  }
  if (options.loading) {
    return Platform.OS === 'ios'
      ? 'Apple ile satın alma işleniyor…'
      : 'Google Play işleniyor…';
  }
  return Platform.OS === 'ios' ? 'Apple ile Satın Al' : 'Google Play ile Satın Al';
}

export function StorePremiumPurchaseButton({
  selectedPlan,
  disabled = false,
  onSuccess,
  onError,
  onPressStart,
  onRestorePressStart,
  onNothingToRestore,
}: StorePremiumPurchaseButtonProps) {
  const {
    iapReady,
    iapProductsLoading,
    iapLoading,
    purchaseWithStore,
    restoreStorePurchases,
  } = useStorePremiumPurchase({
    onSuccess,
    onError,
  });

  const handlePress = async () => {
    onPressStart?.();
    const { error } = await purchaseWithStore(selectedPlan);
    if (error) onError(error);
  };

  const isIos = Platform.OS === 'ios';
  const purchaseBlocked = disabled || iapLoading || iapProductsLoading || !iapReady;

  return (
    <View style={styles.wrap}>
      <Button
        title={storePurchaseButtonLabel({
          loading: iapLoading,
          productsLoading: iapProductsLoading,
          ready: iapReady,
        })}
        onPress={handlePress}
        disabled={purchaseBlocked}
        style={
          isIos
            ? { backgroundColor: '#007AFF', borderColor: '#007AFF' }
            : { backgroundColor: '#01875F', borderColor: '#01875F' }
        }
      />
      <StorePremiumRestoreButtonCore
        disabled={disabled || iapProductsLoading || !iapReady}
        onPressStart={onRestorePressStart}
        onError={onError}
        onNothingToRestore={onNothingToRestore}
        restoreStorePurchases={restoreStorePurchases}
        iapLoading={iapLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
});
