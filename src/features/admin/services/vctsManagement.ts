import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type ContentTrustRow = {
  id: string;
  post_id: string;
  trust_code: string;
  publisher_key: string;
  status: 'verified' | 'disputed' | 'tampered' | 'pending';
  content_type: string;
  created_at: string;
};

export async function fetchContentTrustRecords(): Promise<ContentTrustRow[]> {
  const { data, error } = await supabase.rpc('admin_list_content_trust_records', { p_limit: 50 });
  if (error || !data) return [];
  return data as ContentTrustRow[];
}

export async function setContentTrustStatus(
  recordId: string,
  status: 'verified' | 'disputed' | 'tampered' | 'pending',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_content_trust_status', {
    p_record_id: recordId,
    p_status: status,
  });
  return { error: supabaseErrorMessage(error) };
}
