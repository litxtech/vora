import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { buildPolicyConsents } from '@/constants/legal';
import type { GenderId } from '@/constants/registration';
import { sendSignupVerification } from '@/features/auth/services/emailVerification';
import { mapAuthEmailError } from '@/features/auth/services/validation';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PersonalSignupInput = {
  firstName: string;
  lastName: string;
  username: string;
  birthDate?: string | null;
  gender?: GenderId | null;
  email: string;
  password: string;
};

export type PendingBusinessRegistration = {
  businessName: string;
  category: string;
  address: string;
  district: string;
  phone: string;
  taxNumber: string;
  description: string;
  website: string;
  regionId: string;
  documentUris: string[];
};

const PENDING_BUSINESS_KEY = 'auth:pending_business_registration';

function isExistingUserSignupError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user already') ||
    lower.includes('email address is already')
  );
}

export type SignupFlowResult = {
  success: boolean;
  redirectToVerify: boolean;
  error: string | null;
};

type SignupResponse = {
  data: { user: User | null; session: Session | null };
  error: AuthError | null;
};

export async function resolveSignupFlow(
  email: string,
  result: SignupResponse,
): Promise<SignupFlowResult> {
  const trimmedEmail = email.trim();

  if (!result.error) {
    if (result.data.user) {
      return { success: true, redirectToVerify: true, error: null };
    }
    return { success: false, redirectToVerify: false, error: 'Kayıt tamamlanamadı.' };
  }

  if (isExistingUserSignupError(result.error.message)) {
    const { error: resendError } = await sendSignupVerification(trimmedEmail);
    if (!resendError) {
      return { success: true, redirectToVerify: true, error: null };
    }
    return {
      success: false,
      redirectToVerify: false,
      error: 'Bu e-posta zaten kayıtlı. Giriş yapın veya şifrenizi sıfırlayın.',
    };
  }

  return { success: false, redirectToVerify: false, error: mapAuthEmailError(result.error.message) };
}

export async function signUpPersonal(input: PersonalSignupInput) {
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;

  return supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        username: input.username.trim().toLowerCase(),
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        full_name: fullName,
        birth_date: input.birthDate ?? null,
        ...(input.gender ? { gender: input.gender } : {}),
        account_type: 'personal',
        policy_consents: buildPolicyConsents(),
      },
    },
  });
}

export async function signUpBusinessOwner(
  input: PersonalSignupInput,
  business: Omit<PendingBusinessRegistration, 'documentUris'>,
  documentUris: string[],
) {
  await AsyncStorage.setItem(
    PENDING_BUSINESS_KEY,
    JSON.stringify({ ...business, documentUris } satisfies PendingBusinessRegistration),
  );

  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;

  return supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        username: input.username.trim().toLowerCase(),
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        full_name: fullName,
        birth_date: input.birthDate ?? null,
        ...(input.gender ? { gender: input.gender } : {}),
        account_type: 'business',
        policy_consents: buildPolicyConsents(),
      },
    },
  });
}

export async function getPendingBusinessRegistration(): Promise<PendingBusinessRegistration | null> {
  const raw = await AsyncStorage.getItem(PENDING_BUSINESS_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as PendingBusinessRegistration;
}

export async function clearPendingBusinessRegistration(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_BUSINESS_KEY);
}

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export async function uploadBusinessDocuments(
  userId: string,
  uris: string[],
): Promise<{ urls: string[]; error: string | null }> {
  const urls: string[] = [];

  for (let i = 0; i < uris.length; i += 1) {
    const uri = uris[i];
    const arrayBuffer = await readLocalFileBytes(uri);
    const contentType = guessContentType(uri);
    const ext = contentType === 'application/pdf' ? 'pdf' : contentType.split('/')[1] ?? 'jpg';
    const path = `${userId}/${Date.now()}_${i}.${ext}`;

    const { error } = await supabase.storage.from('business-documents').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) return { urls: [], error: supabaseErrorMessage(error)! };

    const { data } = supabase.storage.from('business-documents').getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return { urls, error: null };
}

export async function completeBusinessRegistration(
  userId: string,
  pending: PendingBusinessRegistration,
): Promise<{ error: string | null }> {
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

  await clearPendingBusinessRegistration();
  return { error: null };
}
