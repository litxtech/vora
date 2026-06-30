import { supabase } from '@/lib/supabase/client';

export type ProfileContactFields = {
  address: string | null;
  iban: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
};

export async function fetchOwnProfileContactFields(): Promise<ProfileContactFields | null> {
  const { data, error } = await supabase.rpc('get_own_profile_contact_fields');
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      address: null,
      iban: null,
      bank_name: null,
      bank_account_name: null,
    };
  }

  return row as ProfileContactFields;
}

export async function fetchAdminUserContactFields(
  userId: string,
): Promise<ProfileContactFields | null> {
  const { data, error } = await supabase.rpc('admin_get_user_contact_fields', {
    p_user_id: userId,
  });
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      address: null,
      iban: null,
      bank_name: null,
      bank_account_name: null,
    };
  }

  return row as ProfileContactFields;
}
