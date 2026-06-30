import { type Href, router } from 'expo-router';
import { listingDetailPath } from '@/features/marketplace/constants';
import { listingDetailPath as personnelListingPath } from '@/features/personnel-center/constants';
import { voraNeedDetailPath } from '@/features/vora-needs/constants';
import { openReelsAtReel } from '@/features/reels/services/reelsNavigation';
import { resolveReelShareHints } from '../services/reelShareHints';
import type { ChatMessage, SharedCardMetadata } from '../types';

function resolveCardType(message: ChatMessage): SharedCardMetadata['cardType'] | null {
  if (message.metadata?.cardType) return message.metadata.cardType;

  switch (message.messageType) {
    case 'shared_post':
      return 'post';
    case 'shared_reel':
      return 'reel';
    case 'shared_profile':
      return 'profile';
    case 'shared_marketplace_listing':
      return 'marketplace_listing';
    case 'shared_job_listing':
      return 'job_listing';
    case 'shared_staff_listing':
      return 'staff_listing';
    case 'shared_vora_need':
      return 'vora_need';
    default:
      return null;
  }
}

export function navigateToSharedCard(message: ChatMessage, viewerId: string | null = null) {
  const targetId = message.metadata?.targetId;
  if (!targetId) return;

  const cardType = resolveCardType(message);
  const meta = message.metadata;

  switch (cardType) {
    case 'post':
      router.push(`/detail/posts/${targetId}` as Href);
      break;
    case 'reel':
      openReelsAtReel(targetId, resolveReelShareHints(targetId, meta));
      break;
    case 'profile':
      if (meta?.username) router.push(`/u/${meta.username}` as Href);
      else router.push(`/user/${targetId}` as Href);
      break;
    case 'marketplace_listing':
      router.push(listingDetailPath(targetId) as Href);
      break;
    case 'job_listing':
      router.push(personnelListingPath('job', targetId) as Href);
      break;
    case 'staff_listing':
      router.push(personnelListingPath('staff', targetId) as Href);
      break;
    case 'vora_need':
      router.push(voraNeedDetailPath(targetId) as Href);
      break;
  }
}
