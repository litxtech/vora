import { supabase } from '@/lib/supabase/client';

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalized)
    .maybeSingle();

  if (error) return false;
  return !data;
}
