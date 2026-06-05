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
    jobs: `/detail/jobs/${marker.sourceId}${demoQuery}`,
    staff: `/detail/staff/${marker.sourceId}${demoQuery}`,
    job_seekers: `/detail/job-seekers/${marker.sourceId}${demoQuery}`,
    emergency_pois: `/detail/emergency-pois/${marker.sourceId}${demoQuery}`,
  } as const;

  return paths[marker.layer] as Href;
}

export function navigateToMapDetail(marker: MapMarker) {
  if (marker.layer === 'incidents' && !marker.isDemo) {
    router.push(`/detail/incidents/${marker.sourceId}` as Href);
    return;
  }
  router.push(detailHref(marker));
}
