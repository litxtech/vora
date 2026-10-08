import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSessionClient } from '@/lib/supabase';

export type WebProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  region_id: string | null;
  avatar_url: string | null;
};

export async function currentUser(): Promise<User | null> {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function currentProfile(): Promise<{ user: User; profile: WebProfile | null } | null> {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, region_id, avatar_url')
    .eq('id', data.user.id)
    .maybeSingle();
  return { user: data.user, profile: (profile as WebProfile | null) ?? null };
}

export async function requireProfile(): Promise<{ user: User; profile: WebProfile | null }> {
  const session = await currentProfile();
  if (!session) redirect('/login');
  return session;
}
