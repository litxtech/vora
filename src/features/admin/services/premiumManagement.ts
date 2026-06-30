import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PremiumSubscriptionRow = {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  plan: string;
  status: string;
  payment_provider: string;
  apple_original_transaction_id: string | null;
  apple_product_id: string | null;
  starts_at: string;
  expires_at: string;
  created_at: string;
};

export async function fetchPremiumSubscriptions(): Promise<PremiumSubscriptionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_premium_subscriptions', { p_limit: 50 });
  if (error || !data) return [];
  return data as PremiumSubscriptionRow[];
}

export async function setUserPremium(
  userId: string,
  isPremium: boolean,
  days = 30,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_user_premium', {
    p_user_id: userId,
    p_is_premium: isPremium,
    p_days: days,
  });
  return { error: supabaseErrorMessage(error) };
}
