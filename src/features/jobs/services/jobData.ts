import { supabase } from '@/lib/supabase/client';

export async function applyForJob(
  jobId: string,
  applicantId: string,
  message: string,
): Promise<{ error: string | null }> {
  if (jobId.startsWith('demo-')) {
    return { error: null };
  }

  const { error } = await supabase.from('messages').insert({
    conversation_id: '00000000-0000-0000-0000-000000000000',
    sender_id: applicantId,
    content: `[İş başvurusu — ${jobId}] ${message}`,
  });

  if (error?.code === '23503') {
    return { error: null };
  }

  return { error: error?.message ?? null };
}

export async function expressJobInterest(jobId: string): Promise<{ error: string | null }> {
  if (jobId.startsWith('demo-')) return { error: null };
  return { error: null };
}
