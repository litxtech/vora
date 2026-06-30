import { Alert } from 'react-native';
import { openUrl } from '@/lib/linking/openUrl';
import { router } from 'expo-router';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { listingDetailPath } from '@/features/personnel-center/constants';
import { sharePersonnelListingInChat } from '@/features/personnel-center/services/personnelShareData';
import type { ListingType } from '@/features/personnel-center/types';

export function openListingDetail(type: ListingType, id: string) {
  router.push(listingDetailPath(type, id) as never);
}

export function openSeekerDetail(id: string) {
  router.push(`/detail/job-seekers/${id}` as never);
}

export function openUserProfile(userId: string) {
  router.push(`/user/${userId}` as never);
}

export function openEmployerApplication(applicationId: string) {
  router.push(`/personnel-center/application/${applicationId}` as never);
}

export async function callListingPhone(phone: string | null | undefined) {
  if (!phone?.trim()) {
    Alert.alert('Telefon', 'Bu ilan için telefon numarası bulunamadı.');
    return;
  }
  await openUrl(`tel:${phone.replace(/\s/g, '')}`);
}

export async function messageListingOwner(
  listingType: ListingType,
  listingId: string,
  ownerId: string,
  senderId: string,
): Promise<void> {
  const result = await sharePersonnelListingInChat(
    listingType,
    listingId,
    ownerId,
    senderId,
    'Merhaba, ilanınız hakkında bilgi almak istiyorum.',
  );
  if (result.error) {
    Alert.alert('Mesaj', result.error);
    return;
  }
  if (result.conversationId) openChat(result.conversationId);
}

export async function messageUser(
  ownerId: string,
  options?: { onRequireAuth?: () => boolean | Promise<boolean> },
): Promise<void> {
  if (options?.onRequireAuth && !(await options.onRequireAuth())) return;

  const { conversationId, error } = await getOrCreateDirectConversation(ownerId);
  if (error) {
    Alert.alert('Mesaj', error);
    return;
  }
  if (conversationId) openChat(conversationId);
}

export function matchesListingSearch(
  listing: {
    title: string;
    description: string;
    businessName: string | null;
    district: string | null;
    locationLabel: string | null;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    listing.title,
    listing.description,
    listing.businessName,
    listing.district,
    listing.locationLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function matchesSeekerSearch(
  seeker: {
    title: string;
    occupation: string;
    description: string | null;
    displayName: string | null;
    district: string | null;
    skills: string[];
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    seeker.title,
    seeker.occupation,
    seeker.description,
    seeker.displayName,
    seeker.district,
    ...seeker.skills,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
