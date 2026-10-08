import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase';

export async function requireAdmin() {
  const supabase = await createSessionClient();
  if (!supabase) redirect('/admin/login');
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/admin/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/admin/login');
  return supabase;
}
