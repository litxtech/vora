import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ErrorCode,
  getAvailablePurchases,
  useIAP,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
} from 'expo-iap';
import {
  PREMIUM_PRODUCT_IDS,
  planFromProductId,
  productIdForPlan,
  verifyApplePremiumPurchase,
  verifyGooglePremiumPurchase,
  type StoreVerifyResult,
} from '@/features/profile/services/premiumIap';
import {
  formatStorePurchaseError,
  storeProductsNotReadyMessage,
  storePurchaseIncompleteMessage,
} from '@/features/profile/services/storePurchaseErrors';
import type { PremiumPlan } from '@/features/profile/services/premiumService';

export type StorePurchaseSuccess = {
  plan: PremiumPlan;
  expiresAt?: string;
};

const STORE_PURCHASE_WAIT_MS = 12_000;
const PRODUCT_LOAD_ATTEMPTS = 4;
const PRODUCT_LOAD_POLL_MS = 250;
const PRODUCT_LOAD_RETRY_MS = 700;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGooglePurchase(purchase: Purchase): purchase is Purchase & {
  purchaseToken?: string | null;
} {
  return purchase.store === 'google';
}

function androidOfferToken(subscriptions: ProductSubscription[], productId: string): string | null {
  const match = subscriptions.find((item) => item.id === productId);
  if (!match) return null;

  const fromOffers = match.subscriptionOffers?.[0]?.offerToken;
  if (fromOffers) return fromOffers;

  const legacy = match.subscriptionOfferDetailsAndroid?.[0]?.offerToken;
  return legacy ?? null;
}

function isPremiumProductId(productId: string): boolean {
  return PREMIUM_PRODUCT_IDS.includes(productId);
}

function hasLoadedPremiumProducts(subscriptions: ProductSubscription[]): boolean {
  return PREMIUM_PRODUCT_IDS.every((productId) =>
    subscriptions.some((subscription) => subscription.id === productId),
  );
}

function purchaseTransactionKey(purchase: Purchase): string {
  return purchase.transactionId ?? purchase.id;
}

function findLatestPremiumPurchase(purchases: Purchase[]): Purchase | null {
  const premiumPurchases = purchases.filter((purchase) =>
    isPremiumProductId(purchase.productId),
  );
  if (premiumPurchases.length === 0) return null;

  return premiumPurchases.sort((a, b) => b.transactionDate - a.transactionDate)[0] ?? null;
}

async function verifyStorePurchase(purchase: Purchase): Promise<StoreVerifyResult> {
  if (Platform.OS === 'ios') {
    const transactionId = purchase.transactionId ?? purchase.id;

    return verifyApplePremiumPurchase({
      transactionId,
      purchaseToken: purchase.purchaseToken ?? null,
      productId: purchase.productId,
      sandbox: purchase.environmentIOS === 'Sandbox',
    });
  }

  if (Platform.OS === 'android' && isGooglePurchase(purchase)) {
    const purchaseToken = purchase.purchaseToken;
    if (!purchaseToken) {
      return { error: 'Google Play satın alma jetonu alınamadı.' };
    }

    return verifyGooglePremiumPurchase({
      purchaseToken,
      productId: purchase.productId,
    });
  }

  return { error: 'Bu platform için satın alma doğrulanamadı.' };
}

function toPurchaseSuccess(
  purchase: Purchase,
  verified: StoreVerifyResult,
): StorePurchaseSuccess | null {
  const plan = verified.plan ?? planFromProductId(purchase.productId);
  if (!plan) return null;
  return { plan, expiresAt: verified.expiresAt };
}

export function useStorePremiumPurchase(options?: {
  onSuccess?: (result: StorePurchaseSuccess) => void | Promise<void>;
  onError?: (message: string) => void;
}) {
  const [iapReady, setIapReady] = useState(false);
  const [iapProductsLoading, setIapProductsLoading] = useState(false);
  const [iapLoading, setIapLoading] = useState(false);
  const verifyingRef = useRef(false);
  const processedTransactionIdsRef = useRef(new Set<string>());
  const purchaseWaiterRef = useRef<((processed: boolean) => void) | null>(null);
  const subscriptionsRef = useRef<ProductSubscription[]>([]);
  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);
  const finishTransactionRef = useRef<
    (args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>
  >(() => Promise.resolve());
  const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
    onErrorRef.current = options?.onError;
  }, [options?.onError, options?.onSuccess]);

  const signalPurchaseProcessed = useCallback((processed: boolean) => {
    const resolve = purchaseWaiterRef.current;
    if (!resolve) return;
    purchaseWaiterRef.current = null;
    resolve(processed);
  }, []);

  const waitForStorePurchaseResult = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (purchaseWaiterRef.current) {
          purchaseWaiterRef.current = null;
          resolve(false);
        }
      }, STORE_PURCHASE_WAIT_MS);

      purchaseWaiterRef.current = (processed) => {
        clearTimeout(timeout);
        resolve(processed);
      };
    });
  }, []);

  const processPurchase = useCallback(
    async (purchase: Purchase): Promise<boolean> => {
      if (!enabled) return false;

      const transactionKey = purchaseTransactionKey(purchase);
      if (processedTransactionIdsRef.current.has(transactionKey) || verifyingRef.current) {
        return false;
      }

      verifyingRef.current = true;
      processedTransactionIdsRef.current.add(transactionKey);
      setIapLoading(true);

      try {
        const verified = await verifyStorePurchase(purchase);
        if (verified.error) {
          processedTransactionIdsRef.current.delete(transactionKey);
          signalPurchaseProcessed(false);
          onErrorRef.current?.(formatStorePurchaseError(verified.error));
          return false;
        }

        const successPayload = toPurchaseSuccess(purchase, verified);
        if (!successPayload) {
          processedTransactionIdsRef.current.delete(transactionKey);
          signalPurchaseProcessed(false);
          onErrorRef.current?.('Premium paket bilgisi alınamadı.');
          return false;
        }

        await finishTransactionRef.current({ purchase, isConsumable: false });
        await onSuccessRef.current?.(successPayload);
        signalPurchaseProcessed(true);
        return true;
      } catch (error) {
        processedTransactionIdsRef.current.delete(transactionKey);
        signalPurchaseProcessed(false);
        const message =
          error instanceof Error ? error.message : 'Satın alma doğrulanamadı.';
        onErrorRef.current?.(formatStorePurchaseError(message));
        return false;
      } finally {
        verifyingRef.current = false;
        setIapLoading(false);
      }
    },
    [enabled, signalPurchaseProcessed],
  );

  const processLatestPremiumPurchase = useCallback(async (): Promise<boolean> => {
    const purchases = await getAvailablePurchases();
    const latest = findLatestPremiumPurchase(purchases);
    if (!latest) return false;
    return processPurchase(latest);
  }, [processPurchase]);

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
  } = useIAP({
    purchaseUpdatedListenerOptions: { dedupeTransactionIOS: false },
    onPurchaseSuccess: (purchase) => {
      if (!enabled || !isPremiumProductId(purchase.productId)) return;
      void processPurchase(purchase);
    },
    onPurchaseError: (error: PurchaseError) => {
      signalPurchaseProcessed(false);
      setIapLoading(false);
      if (error.code === ErrorCode.UserCancelled) {
        onErrorRef.current?.('');
        return;
      }
      onErrorRef.current?.(
        formatStorePurchaseError(error.message || 'Satın alma başarısız.'),
      );
    },
  });

  useEffect(() => {
    subscriptionsRef.current = subscriptions;
    if (hasLoadedPremiumProducts(subscriptions)) {
      setIapReady(true);
    }
  }, [subscriptions]);

  useEffect(() => {
    finishTransactionRef.current = finishTransaction;
  }, [finishTransaction]);

  const loadPremiumProducts = useCallback(async (): Promise<boolean> => {
    if (!enabled || !connected) return false;

    setIapProductsLoading(true);
    setIapReady(false);

    try {
      for (let attempt = 0; attempt < PRODUCT_LOAD_ATTEMPTS; attempt += 1) {
        try {
          await fetchProducts({ skus: PREMIUM_PRODUCT_IDS, type: 'subs' });
        } catch {
          // Sonraki denemede tekrar fetch edilir.
        }

        for (let poll = 0; poll < 12; poll += 1) {
          if (hasLoadedPremiumProducts(subscriptionsRef.current)) {
            setIapReady(true);
            return true;
          }
          await delay(PRODUCT_LOAD_POLL_MS);
        }

        if (attempt < PRODUCT_LOAD_ATTEMPTS - 1) {
          await delay(PRODUCT_LOAD_RETRY_MS);
        }
      }

      const ready = hasLoadedPremiumProducts(subscriptionsRef.current);
      setIapReady(ready);
      return ready;
    } finally {
      setIapProductsLoading(false);
    }
  }, [connected, enabled, fetchProducts]);

  useEffect(() => {
    if (!enabled || !connected) {
      setIapReady(false);
      setIapProductsLoading(false);
      return;
    }

    void loadPremiumProducts();
  }, [connected, enabled, loadPremiumProducts]);

  const ensureProductsReady = useCallback(
    async (productId: string): Promise<{ ready: boolean; error: string | null }> => {
      if (hasLoadedPremiumProducts(subscriptionsRef.current)) {
        return { ready: true, error: null };
      }

      const loaded = await loadPremiumProducts();
      if (!loaded) {
        return { ready: false, error: storeProductsNotReadyMessage() };
      }

      const productLoaded = subscriptionsRef.current.some((item) => item.id === productId);
      if (!productLoaded) {
        return {
          ready: false,
          error:
            Platform.OS === 'ios'
              ? 'Seçilen Premium paketi App Store\'da bulunamadı. Lütfen daha sonra tekrar deneyin.'
              : 'Seçilen Premium paketi Google Play\'de bulunamadı. Lütfen daha sonra tekrar deneyin.',
        };
      }

      return { ready: true, error: null };
    },
    [loadPremiumProducts],
  );

  const purchaseWithStore = useCallback(
    async (plan: PremiumPlan): Promise<{ error: string | null }> => {
      if (!enabled) {
        return { error: 'Uygulama içi satın alma yalnızca mobil uygulamada kullanılabilir.' };
      }
      if (!connected) {
        return {
          error:
            Platform.OS === 'ios'
              ? 'App Store bağlantısı kurulamadı. Lütfen tekrar deneyin.'
              : 'Google Play bağlantısı kurulamadı. Lütfen tekrar deneyin.',
        };
      }

      const productId = productIdForPlan(plan);
      const productCheck = await ensureProductsReady(productId);
      if (!productCheck.ready) {
        return { error: productCheck.error };
      }

      setIapLoading(true);

      try {
        const resultPromise = waitForStorePurchaseResult();

        if (Platform.OS === 'ios') {
          await requestPurchase({
            type: 'subs',
            request: {
              apple: { sku: productId },
              ios: { sku: productId },
            },
          });
        } else {
          const offerToken = androidOfferToken(subscriptionsRef.current, productId);
          if (!offerToken) {
            setIapLoading(false);
            return {
              error:
                'Google Play abonelik teklifi yüklenemedi. Lütfen birkaç saniye bekleyip tekrar deneyin.',
            };
          }

          await requestPurchase({
            type: 'subs',
            request: {
              google: {
                skus: [productId],
                subscriptionOffers: [{ sku: productId, offerToken }],
              },
            },
          });
        }

        const processed = await resultPromise;
        if (!processed) {
          const fallback = await processLatestPremiumPurchase();
          if (!fallback) {
            setIapLoading(false);
            return { error: storePurchaseIncompleteMessage() };
          }
        }

        return { error: null };
      } catch (error) {
        signalPurchaseProcessed(false);
        const message = error instanceof Error ? error.message : 'Satın alma başlatılamadı.';
        setIapLoading(false);
        return { error: formatStorePurchaseError(message) };
      }
    },
    [
      connected,
      enabled,
      ensureProductsReady,
      processLatestPremiumPurchase,
      requestPurchase,
      signalPurchaseProcessed,
      waitForStorePurchaseResult,
    ],
  );

  const restoreStorePurchases = useCallback(async (): Promise<{
    error: string | null;
    found: boolean;
  }> => {
    if (!enabled) {
      return {
        error: 'Uygulama içi satın alma yalnızca mobil uygulamada kullanılabilir.',
        found: false,
      };
    }
    if (!connected) {
      return {
        error:
          Platform.OS === 'ios'
            ? 'App Store bağlantısı kurulamadı. Lütfen tekrar deneyin.'
            : 'Google Play bağlantısı kurulamadı. Lütfen tekrar deneyin.',
        found: false,
      };
    }
    if (verifyingRef.current) {
      return { error: null, found: false };
    }

    setIapLoading(true);

    try {
      await restorePurchases();
      const purchases = await getAvailablePurchases();
      const premiumPurchases = purchases.filter((purchase) =>
        isPremiumProductId(purchase.productId),
      );

      if (premiumPurchases.length === 0) {
        return { error: null, found: false };
      }

      for (const purchase of premiumPurchases) {
        const ok = await processPurchase(purchase);
        if (ok) {
          return { error: null, found: true };
        }
      }

      return { error: formatStorePurchaseError('Satın alma doğrulanamadı.'), found: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Satın alımlar geri yüklenemedi.';
      return { error: formatStorePurchaseError(message), found: false };
    } finally {
      setIapLoading(false);
    }
  }, [connected, enabled, processPurchase, restorePurchases]);

  return {
    enabled,
    iapReady,
    iapProductsLoading,
    iapLoading,
    subscriptions,
    purchaseWithStore,
    restoreStorePurchases,
    reloadStoreProducts: loadPremiumProducts,
  };
}
