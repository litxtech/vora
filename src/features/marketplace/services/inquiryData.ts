import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { sendMessage } from '@/features/messaging/services/messageData';
import type { SharedCardMetadata } from '@/features/messaging/types';
import { formatMarketplacePrice } from '@/features/marketplace/constants';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import { supabaseErrorMessage } from '@/lib/errors';

type ListingInquiryRow = {
  author_id: string;
  title: string;
  cover_url: string | null;
  media_urls: string[] | null;
  price: number | null;
  listing_type: string;
  currency: string;
};

export async function startMarketplaceInquiry(
  listingId: string,
  buyerId: string,
  message: string,
): Promise<{ error: string | null; conversationId?: string }> {
  const { data: listing } = await mpSupabase
    .from('marketplace_listings')
    .select('author_id, title, cover_url, media_urls, price, listing_type, currency')
    .eq('id', listingId)
    .maybeSingle();

  const row = listing as ListingInquiryRow | null;
  if (!row?.author_id) return { error: 'İlan bulunamadı.' };
  if (row.author_id === buyerId) return { error: 'Kendi ilanınıza mesaj gönderemezsiniz.' };

  const { conversationId, error: convError } = await getOrCreateDirectConversation(row.author_id);
  if (convError || !conversationId) return { error: convError ?? 'Sohbet oluşturulamadı.' };

  const body = message.trim() || 'Merhaba, ilanınız hâlâ geçerli mi?';
  const imageUrl = row.cover_url ?? row.media_urls?.[0] ?? null;
  const priceLabel = formatMarketplacePrice(
    row.price,
    row.listing_type as 'sale' | 'negotiable' | 'trade' | 'free',
    row.currency,
  );

  const metadata: SharedCardMetadata = {
    cardType: 'marketplace_listing',
    targetId: listingId,
    title: row.title,
    preview: priceLabel,
    imageUrl,
  };

  const { error: msgError } = await sendMessage(conversationId, buyerId, body, {
    messageType: 'shared_marketplace_listing',
    metadata,
  });
  if (msgError) return { error: msgError, conversationId };

  return { error: null, conversationId };
}

export async function reportMarketplaceListing(
  listingId: string,
  reporterId: string,
  reason: string,
  details?: string,
): Promise<{ error: string | null }> {
  const { error } = await mpSupabase.from('marketplace_reports').insert({
    listing_id: listingId,
    reporter_id: reporterId,
    reason,
    details: details?.trim() || null,
  });

  if (error?.code === '23505') return { error: 'Bu ilanı zaten raporladınız.' };
  return { error: supabaseErrorMessage(error) };
}
