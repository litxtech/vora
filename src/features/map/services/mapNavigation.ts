import { type Href, router } from 'expo-router';
import type { MapMarker } from '@/features/map/types';

function detailHref(marker: MapMarker): Href {
  const demoQuery = marker.isDemo ? '?demo=1' : '';
  const paths = {
    incidents: `/detail/incidents/${marker.sourceId}${demoQuery}`,
    posts: `/detail/posts/${marker.sourceId}${demoQuery}`,
    businesses: `/detail/businesses/${marker.sourceId}${demoQuery}`,
    events: `/detail/events/${marker.sourceId}${demoQuery}`,
    lost_found: `/detail/lost-found/${marker.sourceId}${demoQuery}`,
  } as const;

  return paths[marker.layer] as Href;
}

export function navigateToMapDetail(marker: MapMarker) {
  router.push(detailHref(marker));
}
