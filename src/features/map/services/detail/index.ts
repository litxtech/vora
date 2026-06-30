import type { MapDetailType } from '@/features/map/types';
import { fetchBusinessDetail } from './fetchBusinessDetail';
import { fetchEventDetail } from './fetchEventDetail';
import { fetchIncidentDetail } from './fetchIncidentDetail';
import { fetchJobDetail } from './fetchJobDetail';
import { fetchJobSeekerDetail } from './fetchJobSeekerDetail';
import { fetchLostFoundDetail } from './fetchLostFoundDetail';
import { fetchMarketplaceDetail } from './fetchMarketplaceDetail';
import { fetchPostDetail } from './fetchPostDetail';
import { fetchStaffDetail } from './fetchStaffDetail';
import { fetchTourismDetail } from './fetchTourismDetail';
import { fetchTrafficDetail } from './fetchTrafficDetail';
import { fetchHotelMapDetail } from './fetchHotelMapDetail';
import { fetchVoraNeedDetail } from './fetchVoraNeedDetail';
import { fetchVoraHizmetlerDetail } from './fetchVoraHizmetlerDetail';
import type { MapDetailRecord } from './shared';

export type { MapDetailRecord } from './shared';

type DetailFetcher = (id: string) => Promise<MapDetailRecord | null>;

const DETAIL_FETCHERS: Partial<Record<MapDetailType, DetailFetcher>> = {
  incidents: fetchIncidentDetail,
  posts: fetchPostDetail,
  businesses: fetchBusinessDetail,
  events: fetchEventDetail,
  lost_found: fetchLostFoundDetail,
  marketplace: fetchMarketplaceDetail,
  jobs: fetchJobDetail,
  staff: fetchStaffDetail,
  job_seekers: fetchJobSeekerDetail,
  traffic: fetchTrafficDetail,
  tourism: fetchTourismDetail,
  vora_needs: fetchVoraNeedDetail,
  vora_hizmetler: fetchVoraHizmetlerDetail,
  hotels: fetchHotelMapDetail,
};

export async function fetchMapDetail(
  type: MapDetailType,
  id: string,
): Promise<MapDetailRecord | null> {
  const fetcher = DETAIL_FETCHERS[type];
  return fetcher ? fetcher(id) : null;
}
