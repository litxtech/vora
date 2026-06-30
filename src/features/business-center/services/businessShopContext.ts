import {
  fetchBusinessCampaigns,
  fetchBusinessEvents,
  fetchBusinessJobs,
  incrementBusinessViewCount,
} from '@/features/businesses/services/businessDetailData';
import type {
  BusinessCampaignPreview,
  BusinessEventPreview,
  BusinessJobPreview,
} from '@/features/businesses/types';

export type BusinessShopContext = {
  campaigns: BusinessCampaignPreview[];
  events: BusinessEventPreview[];
  jobs: BusinessJobPreview[];
};

export async function fetchBusinessShopContext(
  businessId: string,
  ownerId: string,
): Promise<BusinessShopContext> {
  const [campaigns, events, jobs] = await Promise.all([
    fetchBusinessCampaigns(businessId),
    fetchBusinessEvents(ownerId),
    fetchBusinessJobs(businessId),
  ]);

  return { campaigns, events, jobs };
}

export async function trackBusinessShopView(businessId: string, isOwner: boolean): Promise<void> {
  if (isOwner) return;
  await incrementBusinessViewCount(businessId);
}
