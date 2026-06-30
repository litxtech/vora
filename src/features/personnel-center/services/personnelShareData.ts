import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { sendMessage } from '@/features/messaging/services/messageData';
import type { MessageType, SharedCardMetadata } from '@/features/messaging/types';
import {
  JOB_TYPE_OPTIONS,
  SALARY_TYPE_OPTIONS,
  jobTypeLabel,
} from '@/features/personnel-center/constants';
import type { ListingType } from '@/features/personnel-center/types';
import { supabase } from '@/lib/supabase/client';

type JobShareRow = {
  title: string;
  job_type: string;
  salary_range: string | null;
  salary_type: string;
  workplace_media_urls: string[] | null;
};

type StaffShareRow = {
  title: string;
  job_type: string;
  salary_range: string | null;
  positions_count: number | null;
};

function formatJobPreview(row: JobShareRow): string {
  if (row.salary_type === 'negotiable') return 'Görüşülecek';
  if (row.salary_range?.trim()) return row.salary_range.trim();
  const label = SALARY_TYPE_OPTIONS.find((o) => o.value === row.salary_type)?.label;
  return label ?? jobTypeLabel(row.job_type);
}

function formatStaffPreview(row: StaffShareRow): string {
  const count = row.positions_count ?? 1;
  return `${count} kişi · ${jobTypeLabel(row.job_type)}`;
}

export function personnelShareMessageType(listingType: ListingType): MessageType {
  return listingType === 'job' ? 'shared_job_listing' : 'shared_staff_listing';
}

export function personnelShareCardType(listingType: ListingType): SharedCardMetadata['cardType'] {
  return listingType === 'job' ? 'job_listing' : 'staff_listing';
}

export async function buildPersonnelShareMetadata(
  listingType: ListingType,
  listingId: string,
): Promise<SharedCardMetadata | null> {
  if (listingType === 'job') {
    const { data } = await supabase
      .from('job_listings')
      .select('title, job_type, salary_range, salary_type, workplace_media_urls')
      .eq('id', listingId)
      .maybeSingle();

    const row = data as JobShareRow | null;
    if (!row) return null;

    return {
      cardType: 'job_listing',
      targetId: listingId,
      title: row.title,
      preview: formatJobPreview(row),
      imageUrl: row.workplace_media_urls?.[0] ?? null,
    };
  }

  const { data } = await supabase
    .from('staff_requests')
    .select('title, job_type, salary_range, positions_count')
    .eq('id', listingId)
    .maybeSingle();

  const row = data as StaffShareRow | null;
  if (!row) return null;

  return {
    cardType: 'staff_listing',
    targetId: listingId,
    title: row.title,
    preview: formatStaffPreview(row),
    imageUrl: null,
  };
}

export async function sendPersonnelListingCard(
  conversationId: string,
  senderId: string,
  listingType: ListingType,
  listingId: string,
  body: string,
): Promise<{ error: string | null }> {
  const metadata = await buildPersonnelShareMetadata(listingType, listingId);
  if (!metadata) return { error: 'İlan bulunamadı.' };

  const { error } = await sendMessage(conversationId, senderId, body.trim(), {
    messageType: personnelShareMessageType(listingType),
    metadata,
  });

  return { error };
}

export async function sharePersonnelListingInChat(
  listingType: ListingType,
  listingId: string,
  employerId: string,
  senderId: string,
  message: string,
): Promise<{ error: string | null; conversationId?: string }> {
  const { conversationId, error: convError } = await getOrCreateDirectConversation(employerId);
  if (convError || !conversationId) return { error: convError ?? 'Sohbet oluşturulamadı.' };

  const prefix = listingType === 'job' ? 'İş ilanı' : 'Personel talebi';
  const body = message.trim() || `Merhaba, ${prefix.toLowerCase()} hakkında bilgi almak istiyorum.`;
  const result = await sendPersonnelListingCard(conversationId, senderId, listingType, listingId, body);
  if (result.error) return { error: result.error, conversationId };

  return { error: null, conversationId };
}
