import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/** Web'de yerel Stripe SDK yok. Ödeme ekranları Stripe.js ile açılır. */
export function AppStripeProvider({ children }: Props) {
  return children;
}
