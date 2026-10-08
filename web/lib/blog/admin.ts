import { createSessionClient } from '@/lib/supabase';

export async function adminContext() {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from('profiles').select('role, full_name, username').eq('id', data.user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return null;
  return { supabase, userId: data.user.id, role: profile.role as string, name: profile.full_name || profile.username || 'Vora' };
}
