import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type BusinessFilter = 'pending' | 'approved' | 'rejected' | 'all';

export type BusinessApprovalRow = {
  id: string;
  name: string;
  category: string;
  owner_id: string;
  region_id: string;
  registration_status: string;
  is_verified: boolean;
  document_urls: string[];
  created_at: string;
  address: string | null;
  district: string | null;
  phone: string | null;
  tax_number: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  owner: { username: string; full_name: string | null } | null;
};

export async function fetchBusinesses(filter: BusinessFilter = 'all', search = '') {
  let query = supabase
    .from('businesses')
    .select(`
      id, name, category, owner_id, region_id, registration_status,
      is_verified, document_urls, created_at,
      address, district, phone, tax_number, email, website, description,
      owner:profiles!businesses_owner_id_fkey(username, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter !== 'all') {
    query = query.eq('registration_status', filter);
  }

  const q = search.trim();
  if (q.length >= 2) {
    query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
  }

  const { data, error } = await query;
  const rows = (data ?? []).map((row) => {
    const ownerRaw = row.owner as
      | { username: string; full_name: string | null }
      | { username: string; full_name: string | null }[]
      | null;
    const owner = Array.isArray(ownerRaw) ? ownerRaw[0] ?? null : ownerRaw;
    return { ...row, owner } as BusinessApprovalRow;
  });
  return { data: rows, error: supabaseErrorMessage(error) };
}

/** @deprecated use fetchBusinesses */
export async function fetchPendingBusinesses() {
  return fetchBusinesses('pending');
}

export async function approveBusiness(businessId: string) {
  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();

  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from('businesses')
    .update({ registration_status: 'approved', is_verified: true })
    .eq('id', businessId);

  if (error) return { error: supabaseErrorMessage(error)! };

  await supabase.from('user_badges').upsert(
    { user_id: business.owner_id, badge_type: 'business' },
    { onConflict: 'user_id,badge_type', ignoreDuplicates: true },
  );

  return { error: null };
}

export async function rejectBusiness(businessId: string) {
  const { error } = await supabase
    .from('businesses')
    .update({ registration_status: 'rejected' })
    .eq('id', businessId);
  return { error: supabaseErrorMessage(error) };
}

export async function setBusinessPremium(businessId: string, isPremium: boolean) {
  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();

  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', business.owner_id);

  return { error: supabaseErrorMessage(error) };
}
