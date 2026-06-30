import { type Href, router } from 'expo-router';
import { prefetchMapDetail } from '@/features/map/services/mapDetailCache';
import { useMapStore } from '@/features/map/store/mapStore';
import type { MapMarker } from '@/features/map/types';

function detailHref(marker: MapMarker): Href {
  const paths: Partial<Record<MapMarker['layer'], string>> = {
    incidents: `/detail/incidents/${marker.sourceId}`,
    posts: `/detail/posts/${marker.sourceId}`,
    businesses: `/detail/businesses/${marker.sourceId}`,
    events: `/detail/events/${marker.sourceId}`,
    lost_found: `/detail/lost-found/${marker.sourceId}`,
    marketplace: `/detail/marketplace/${marker.sourceId}`,
    vora_needs: `/detail/vora-needs/${marker.sourceId}`,
    vora_hizmetler:
      marker.meta?.kind === 'provider'
        ? `/detail/vora-hizmetler/provider/${marker.sourceId}`
        : `/detail/vora-hizmetler/request/${marker.sourceId}`,
    jobs: `/detail/jobs/${marker.sourceId}`,
    hotels: `/detail/hotels/${marker.sourceId}`,
    staff: `/detail/staff/${marker.sourceId}`,
    job_seekers: `/detail/job-seekers/${marker.sourceId}`,
    traffic: `/detail/traffic/${marker.sourceId}`,
    tourism: `/detail/tourism/${marker.sourceId}`,
  };

  return (paths[marker.layer] ?? `/detail/posts/${marker.sourceId}`) as Href;
}

export function prefetchMapMarkerDetail(marker: MapMarker): void {
  prefetchMapDetail(marker.layer, marker.sourceId);
}

export function navigateToMapDetail(marker: MapMarker) {
  prefetchMapMarkerDetail(marker);
  router.push(detailHref(marker));
}

/** Bir koordinatı uygulama içi harita sekmesinde merkezler (dış harita uygulaması açmaz). */
export function focusMapOnCoordinate(latitude: number, longitude: number, zoom = 16) {
  const store = useMapStore.getState();
  store.selectMarker(null);
  store.focusOn(latitude, longitude, zoom);
  router.push('/(tabs)/map' as never);
}
