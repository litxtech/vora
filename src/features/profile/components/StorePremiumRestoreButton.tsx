import { Button } from '@/components/ui/Button';
import {
  useStorePremiumPurchase,
  type StorePurchaseSuccess,
} from '@/features/profile/hooks/useStorePremiumPurchase';

type StorePremiumRestoreButtonCoreProps = {
  disabled?: boolean;
  onPressStart?: () => void;
  onError: (message: string) => void;
  onNothingToRestore?: () => void;
  restoreStorePurchases: ReturnType<
    typeof useStorePremiumPurchase
  >['restoreStorePurchases'];
  iapLoading: boolean;
};

function restoreButtonLabel(loading: boolean): string {
  if (loading) {
    return 'Satın alımlar geri yükleniyor…';
  }
  return 'Satın Alımları Geri Yükle';
}

export function StorePremiumRestoreButtonCore({
  disabled = false,
  onPressStart,
  onError,
  onNothingToRestore,
  restoreStorePurchases,
  iapLoading,
}: StorePremiumRestoreButtonCoreProps) {
  const handlePress = async () => {
    onPressStart?.();
    const { error, found } = await restoreStorePurchases();
    if (error) {
      onError(error);
      return;
    }
    if (!found) {
      onNothingToRestore?.();
    }
  };

  return (
    <Button
      title={restoreButtonLabel(iapLoading)}
      variant="outline"
      onPress={handlePress}
      disabled={disabled || iapLoading}
    />
  );
}

type StorePremiumRestoreButtonProps = Omit<
  StorePremiumRestoreButtonCoreProps,
  'restoreStorePurchases' | 'iapLoading'
> & {
  onSuccess: (result: StorePurchaseSuccess) => void | Promise<void>;
};

export function StorePremiumRestoreButton({
  onSuccess,
  onError,
  ...rest
}: StorePremiumRestoreButtonProps) {
  const { iapReady, iapProductsLoading, iapLoading, restoreStorePurchases } =
    useStorePremiumPurchase({
      onSuccess,
      onError,
    });

  return (
    <StorePremiumRestoreButtonCore
      {...rest}
      onError={onError}
      restoreStorePurchases={restoreStorePurchases}
      iapLoading={iapLoading}
      disabled={rest.disabled || iapProductsLoading || !iapReady}
    />
  );
}
