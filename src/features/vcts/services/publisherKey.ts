import { supabase } from '@/lib/supabase/client';

export async function getPublisherKey(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('publisher_key')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data?.publisher_key) return null;
  return data.publisher_key as string;
}
