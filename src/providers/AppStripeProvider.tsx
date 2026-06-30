import type { ComponentType, ReactNode } from 'react';
import Constants from 'expo-constants';
import { isStripeNativeAvailable } from '@/lib/payments/stripeNativeAvailability';

function resolveStripePublishableKey(): string | null {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = typeof extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'string'
    ? extra.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.trim()
    : '';
  const fromEnv = typeof process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'string'
    ? process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.trim()
    : '';
  return fromExtra || fromEnv || null;
}

const publishableKey = resolveStripePublishableKey();

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
    <StripeProvider publishableKey={publishableKey} urlScheme="vora">
      {children}
    </StripeProvider>
  );
}
