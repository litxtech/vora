import { Alert } from 'react-native';
import { submitJobApplication } from '@/features/personnel-center/services/applicationData';
import type { JobApplicationFormData, ListingType } from '@/features/personnel-center/types';
import { openChat } from '@/features/messaging/services/messagingNavigation';

export async function applyForJob(
  jobId: string,
  applicantId: string,
  form: JobApplicationFormData,
  options?: { attachProfile?: boolean },
): Promise<{ error: string | null; conversationId?: string }> {
  const result = await submitJobApplication('job', jobId, applicantId, form, options);
  return { error: result.error, conversationId: result.conversationId };
}

export async function applyForStaff(
  staffId: string,
  applicantId: string,
  form: JobApplicationFormData,
  options?: { attachProfile?: boolean },
): Promise<{ error: string | null; conversationId?: string }> {
  const result = await submitJobApplication('staff', staffId, applicantId, form, options);
  return { error: result.error, conversationId: result.conversationId };
}

export async function expressJobInterest(
  listingId: string,
  applicantId: string,
  listingType: ListingType = 'job',
  form: JobApplicationFormData,
  options?: { attachProfile?: boolean },
): Promise<{ error: string | null; conversationId?: string }> {
  if (listingId.startsWith('demo-')) return { error: null };
  const result = await submitJobApplication(listingType, listingId, applicantId, form, options);
  return { error: result.error, conversationId: result.conversationId };
}

export function showApplicationSuccessAlert(conversationId?: string) {
  Alert.alert('Başvuru gönderildi', 'İşveren başvurunuzu inceleyip size dönüş yapabilir.', [
    { text: 'Tamam' },
    ...(conversationId
      ? [{ text: 'Başvuru sohbeti', onPress: () => openChat(conversationId) }]
      : []),
  ]);
}
