import {
  completeBusinessRegistration,
  uploadBusinessDocuments,
  type PendingBusinessRegistration,
} from '@/features/auth/services/registration';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type BusinessApplicationInput = Omit<PendingBusinessRegistration, 'documentUris'> & {
  documentUris: string[];
};

export async function fetchOwnBusinessApplicationStatus(ownerId: string) {
  return fetchBusinessAccountByOwner(ownerId);
}

export async function submitBusinessApplication(
  userId: string,
  input: BusinessApplicationInput,
): Promise<{ error: string | null }> {
  const existing = await fetchBusinessAccountByOwner(userId);
  if (existing) {
    if (existing.registrationStatus === 'rejected') {
      return { error: 'Reddedilen başvurunuz için destek merkezinden iletişime geçin.' };
    }
    return { error: 'Zaten bir işletme başvurunuz bulunuyor.' };
  }

  const pending: PendingBusinessRegistration = {
    businessName: input.businessName,
    category: input.category,
    address: input.address,
    district: input.district,
    phone: input.phone,
    taxNumber: input.taxNumber,
    description: input.description,
    website: input.website,
    regionId: input.regionId,
    documentUris: input.documentUris,
  };

  const { urls, error: uploadError } = await uploadBusinessDocuments(userId, pending.documentUris);
  if (uploadError) return { error: uploadError };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('businesses').insert({
    owner_id: userId,
    region_id: pending.regionId,
    name: pending.businessName.trim(),
    category: pending.category,
    description: pending.description.trim() || null,
    phone: pending.phone.trim(),
    address: pending.address.trim(),
    district: pending.district.trim(),
    tax_number: pending.taxNumber.trim() || null,
    email: user?.email ?? null,
    website: pending.website.trim() || null,
    document_urls: urls,
    registration_status: 'pending',
  });

  if (error) return { error: supabaseErrorMessage(error)! };
  return { error: null };
}

/** Kayıt akışından kalan tamamlama — geriye dönük uyumluluk. */
export { completeBusinessRegistration };
