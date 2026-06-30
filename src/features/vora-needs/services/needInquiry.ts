import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { sendMessage } from '@/features/messaging/services/messageData';
import type { SharedCardMetadata } from '@/features/messaging/types';
import {
  voraNeedCategoryLabel,
  VORA_NEED_VISIBILITY_LABELS,
} from '@/features/vora-needs/constants';
import { supabase } from '@/lib/supabase/client';

type NeedInquiryRow = {
  author_id: string;
  title: string;
  image_url: string | null;
  category: string;
  visibility: string;
};

export async function startVoraNeedInquiry(
  needId: string,
  responderId: string,
  message: string,
): Promise<{ error: string | null; conversationId?: string }> {
  const { data: need } = await supabase
    .from('vora_needs')
    .select('author_id, title, image_url, category, visibility')
    .eq('id', needId)
    .maybeSingle();

  const row = need as NeedInquiryRow | null;
  if (!row?.author_id) return { error: 'İlan bulunamadı.' };
  if (row.author_id === responderId) return { error: 'Kendi ilanınıza mesaj gönderemezsiniz.' };

  const { conversationId, error: convError } = await getOrCreateDirectConversation(row.author_id);
  if (convError || !conversationId) return { error: convError ?? 'Sohbet oluşturulamadı.' };

  const body = message.trim() || 'Merhaba, ilanınızla ilgileniyorum.';
  const preview = `${voraNeedCategoryLabel(row.category)} · ${VORA_NEED_VISIBILITY_LABELS[row.visibility as keyof typeof VORA_NEED_VISIBILITY_LABELS] ?? row.visibility}`;

  const metadata: SharedCardMetadata = {
    cardType: 'vora_need',
    targetId: needId,
    title: row.title,
    preview,
    imageUrl: row.image_url,
  };

  const { error: msgError } = await sendMessage(conversationId, responderId, body, {
    messageType: 'shared_vora_need',
    metadata,
  });
  if (msgError) return { error: msgError, conversationId };

  return { error: null, conversationId };
}
