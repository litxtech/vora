import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchFavoriteIds(userId: string): Promise<Set<string>> {
  const { data } = await mpSupabase
    .from('marketplace_favorites')
    .select('listing_id')
    .eq('user_id', userId);

  return new Set(((data as { listing_id: string }[] | null) ?? []).map((r) => r.listing_id));
}

export async function toggleMarketplaceFavorite(
  userId: string,
  listingId: string,
  isFavorite: boolean,
): Promise<{ error: string | null }> {
  if (isFavorite) {
    const { error } = await mpSupabase
      .from('marketplace_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);
    return { error: supabaseErrorMessage(error) };
  }

  const { error } = await mpSupabase.from('marketplace_favorites').insert({
    user_id: userId,
    listing_id: listingId,
  });

  return { error: supabaseErrorMessage(error) };
}
