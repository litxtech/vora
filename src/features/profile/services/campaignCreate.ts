import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function createBusinessCampaign(
  businessId: string,
  ownerId: string,
  input: { title: string; description: string; imageUrl?: string; endsAt?: string },
): Promise<{ error: string | null }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (!business) return { error: 'İşletme bulunamadı veya yetkiniz yok.' };

  const { error } = await supabase.from('business_campaigns').insert({
    business_id: businessId,
    title: input.title.trim(),
    description: input.description.trim(),
    image_url: input.imageUrl ?? null,
    ends_at: input.endsAt ?? null,
    status: 'published',
  });

  return { error: supabaseErrorMessage(error) };
}
