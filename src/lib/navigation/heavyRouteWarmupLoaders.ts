/** Ön-ısıtma — sırayla yüklenir, JS spike olmaz. Compose ayrı: CreateTabButton prefetchComposeRoute. */
export const HEAVY_ROUTE_WARMUP_LOADERS: Array<() => Promise<unknown> | unknown> = [
  () => import('@/features/messaging/components/ChatScreen'),
  () => import('@/features/compose/components/ComposeScreen'),
  () => import('@/features/feed/components/PostDetailScreen'),
  () => import('@/features/businesses/components/BusinessDetailScreen'),
  () => import('@/features/profile/components/ProfileScreen'),
  () => import('@/features/events/components/EventDetailScreen'),
  () => import('@/features/marketplace/components/MarketplaceDetailScreen'),
  () => import('@/features/incidents/components/IncidentThreadScreen'),
  () => import('@/features/map/components/MapDetailScreen'),
  () => import('@/features/personnel-center/components/JobDetailScreen'),
  () => import('@/features/lost-found/components/LostFoundDetailScreen'),
  () => import('@/features/rides/components/TripDetailScreen'),
];
