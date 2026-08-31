import { createLazyScreen } from '@/lib/navigation/createLazyScreen';

export const ChatRouteScreen = createLazyScreen(() =>
  import('@/features/messaging/components/ChatScreen').then((m) => ({ default: m.ChatScreen })),
);

export const ComposeRouteScreen = createLazyScreen(() =>
  import('@/features/compose/components/ComposeScreen').then((m) => ({ default: m.ComposeScreen })),
);

export const PostDetailRouteScreen = createLazyScreen(() =>
  import('@/features/feed/components/PostDetailScreen').then((m) => ({ default: m.PostDetailScreen })),
);

export const IncidentDetailRouteScreen = createLazyScreen(() =>
  import('@/features/incidents/components/IncidentThreadScreen').then((m) => ({
    default: m.IncidentThreadScreen,
  })),
);

export const EventDetailRouteScreen = createLazyScreen(() =>
  import('@/features/events/components/EventDetailScreen').then((m) => ({ default: m.EventDetailScreen })),
);

export const JobDetailRouteScreen = createLazyScreen(() =>
  import('@/features/personnel-center/components/JobDetailScreen').then((m) => ({ default: m.JobDetailScreen })),
);

export const BusinessDetailRouteScreen = createLazyScreen(() =>
  import('@/features/businesses/components/BusinessDetailScreen').then((m) => ({
    default: m.BusinessDetailScreen,
  })),
);

export const LostFoundDetailRouteScreen = createLazyScreen(() =>
  import('@/features/lost-found/components/LostFoundDetailScreen').then((m) => ({
    default: m.LostFoundDetailScreen,
  })),
);

export const StaffDetailRouteScreen = createLazyScreen(() =>
  import('@/features/personnel-center/components/StaffDetailScreen').then((m) => ({ default: m.StaffDetailScreen })),
);

export const JobSeekerDetailRouteScreen = createLazyScreen(() =>
  import('@/features/job-seekers/components/JobSeekerDetailScreen').then((m) => ({
    default: m.JobSeekerDetailScreen,
  })),
);

export const MapDetailRouteScreen = createLazyScreen(() =>
  import('@/features/map/components/MapDetailScreen').then((m) => ({ default: m.MapDetailScreen })),
);

export const MarketplaceDetailRouteScreen = createLazyScreen(() =>
  import('@/features/marketplace/components/MarketplaceDetailScreen').then((m) => ({
    default: m.MarketplaceDetailScreen,
  })),
);

export const TripDetailRouteScreen = createLazyScreen(() =>
  import('@/features/rides/components/TripDetailScreen').then((m) => ({ default: m.TripDetailScreen })),
);

export const VoraNeedDetailRouteScreen = createLazyScreen(() =>
  import('@/features/vora-needs/components/VoraNeedDetailScreen').then((m) => ({
    default: m.VoraNeedDetailScreen,
  })),
);

export const ServiceRequestDetailRouteScreen = createLazyScreen(() =>
  import('@/features/vora-hizmetler/components/ServiceRequestDetailScreen').then((m) => ({
    default: m.ServiceRequestDetailScreen,
  })),
);

export const ProviderProfileRouteScreen = createLazyScreen(() =>
  import('@/features/vora-hizmetler/components/ProviderProfileScreen').then((m) => ({
    default: m.ProviderProfileScreen,
  })),
);

export const HelpRequestDetailRouteScreen = createLazyScreen(() =>
  import('@/features/help/components/HelpRequestDetailScreen').then((m) => ({
    default: m.HelpRequestDetailScreen,
  })),
);

export const VolunteerTeamDetailRouteScreen = createLazyScreen(() =>
  import('@/features/volunteer/components/VolunteerTeamDetailScreen').then((m) => ({
    default: m.VolunteerTeamDetailScreen,
  })),
);

export const HotelDetailRouteScreen = createLazyScreen(() =>
  import('@/features/hotel-center/components/HotelDetailScreen').then((m) => ({ default: m.HotelDetailScreen })),
);

function skipDevPrefetch(): boolean {
  return __DEV__;
}

export function prefetchComposeRoute(): Promise<void> {
  if (skipDevPrefetch()) return Promise.resolve();
  return import('@/features/compose/components/ComposeScreen').then(
    () => undefined,
    () => undefined,
  );
}

export function prefetchChatRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/messaging/components/ChatScreen');
}

export function prefetchPostDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/feed/components/PostDetailScreen');
}

export function prefetchProfileScreenRoute(): Promise<void> {
  if (skipDevPrefetch()) return Promise.resolve();
  return import('@/features/profile/components/ProfileScreen').then(
    () => undefined,
    () => undefined,
  );
}

export function prefetchBusinessDetailRoute(): Promise<void> {
  if (skipDevPrefetch()) return Promise.resolve();
  return import('@/features/businesses/components/BusinessDetailScreen').then(
    () => undefined,
    () => undefined,
  );
}

export function prefetchEventDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/events/components/EventDetailScreen');
}

export function prefetchIncidentDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/incidents/components/IncidentThreadScreen');
}

export function prefetchJobDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/personnel-center/components/JobDetailScreen');
}

export function prefetchLostFoundDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/lost-found/components/LostFoundDetailScreen');
}

export function prefetchMarketplaceDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/marketplace/components/MarketplaceDetailScreen');
}

export function prefetchMapDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/map/components/MapDetailScreen');
}

export function prefetchTripDetailRoute(): void {
  if (skipDevPrefetch()) return;
  void import('@/features/rides/components/TripDetailScreen');
}

/** Feed kaynak tipine göre lazy chunk ısıt. */
export function prefetchFeedDetailRoute(sourceType: string): void {
  switch (sourceType) {
    case 'post':
      prefetchPostDetailRoute();
      return;
    case 'incident':
      prefetchIncidentDetailRoute();
      return;
    case 'event':
      prefetchEventDetailRoute();
      return;
    case 'job':
      prefetchJobDetailRoute();
      return;
    case 'business':
      void prefetchBusinessDetailRoute();
      return;
    case 'lost_found':
      prefetchLostFoundDetailRoute();
      return;
    default:
      return;
  }
}
