import type { PremiumPlan, PremiumPaymentProvider } from '@/features/profile/services/premiumService';

export type PremiumSupportTopic =
  | 'purchase'
  | 'billing'
  | 'renewal'
  | 'cancel'
  | 'features'
  | 'restore'
  | 'other';

export type PremiumSupportStatus =
  | 'open'
  | 'waiting_user'
  | 'waiting_support'
  | 'resolved'
  | 'closed';

export type PremiumSupportSubscriptionSnapshot = {
  is_premium?: boolean;
  plan?: PremiumPlan | null;
  payment_provider?: PremiumPaymentProvider | null;
  expires_at?: string | null;
};

export type PremiumSupportMessageType = 'text' | 'image';

export type PremiumSupportThread = {
  id: string;
  user_id: string;
  subject: string;
  topic: PremiumSupportTopic | null;
  status: PremiumSupportStatus;
  user_unread_count: number;
  support_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  subscription_snapshot: PremiumSupportSubscriptionSnapshot;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  session_expires_at?: string | null;
  username?: string;
  full_name?: string | null;
};

export type PremiumSupportMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  message_type?: PremiumSupportMessageType;
  media_url?: string | null;
  created_at: string;
  sender_username?: string;
  sender_full_name?: string | null;
  is_staff?: boolean;
};
