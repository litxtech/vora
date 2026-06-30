import type { ComponentType, ReactNode } from 'react';
import { env } from '@/config/env';
import { APP_SCHEME } from '@/constants/app';
import { isStripeNativeAvailable } from '@/lib/payments/stripeNativeAvailability';

const publishableKey = env.stripe.publishableKey || null;

type StripeProviderProps = {
  publishableKey: string;
  urlScheme: string;
  children: ReactNode;
};

let cachedStripeProvider: ComponentType<StripeProviderProps> | null | undefined;

function resolveStripeProvider(): ComponentType<StripeProviderProps> | null {
  if (cachedStripeProvider !== undefined) return cachedStripeProvider;
  if (!isStripeNativeAvailable()) {
    cachedStripeProvider = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stripe = require('@stripe/stripe-react-native') as { StripeProvider?: ComponentType<StripeProviderProps> };
    cachedStripeProvider = stripe?.StripeProvider ?? null;
  } catch {
    cachedStripeProvider = null;
  }

  return cachedStripeProvider;
}

type Props = {
  children: ReactNode;
};

export function AppStripeProvider({ children }: Props) {
  const StripeProvider = publishableKey ? resolveStripeProvider() : null;
  if (!publishableKey || !StripeProvider) return children;

  return (
    <StripeProvider publishableKey={publishableKey} urlScheme={APP_SCHEME}>
      {children}
    </StripeProvider>
  );
}
