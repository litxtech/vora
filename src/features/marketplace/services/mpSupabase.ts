import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type MarketplaceTable =
  | 'marketplace_listings'
  | 'marketplace_favorites'
  | 'marketplace_comments'
  | 'marketplace_reports'
  | 'marketplace_orders'
  | 'marketplace_order_events'
  | 'marketplace_order_documents'
  | 'marketplace_seller_payout_profiles'
  | 'marketplace_offers';

type MarketplaceRpc =
  | Extract<
      keyof Database['public']['Functions'],
      | 'set_marketplace_location'
      | 'increment_marketplace_view'
      | 'search_marketplace_listings'
      | 'admin_list_marketplace_listings'
      | 'admin_set_marketplace_listing_content_status'
      | 'fulfill_marketplace_order'
      | 'marketplace_seller_mark_shipped'
      | 'marketplace_buyer_confirm_receipt'
      | 'marketplace_buyer_open_dispute'
      | 'admin_marketplace_platform_approve'
      | 'admin_marketplace_mark_payout'
      | 'admin_marketplace_order_refunded'
      | 'get_admin_marketplace_summary'
      | 'admin_list_marketplace_orders'
      | 'admin_list_marketplace_payout_profiles'
      | 'admin_verify_marketplace_payout_profile'
      | 'marketplace_owner_set_listing_status'
    >
  | 'marketplace_submit_offer'
  | 'marketplace_respond_to_offer'
  | 'marketplace_withdraw_offer'
  | 'marketplace_listing_seller_labels';

export const mpSupabase = {
  from(table: MarketplaceTable) {
    return supabase.from(table as never);
  },
  rpc(fn: MarketplaceRpc, args?: Record<string, unknown>) {
    return supabase.rpc(fn, (args ?? {}) as never);
  },
};
