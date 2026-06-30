import { LAYER_BY_ID } from '@/features/map/constants';
import type { MapLayerId, MapLocationSuggestion, MapMarker } from '@/features/map/types';

export type MapSearchHit =
  | {
      kind: 'marker';
      id: string;
      marker: MapMarker;
      label: string;
      subtitle?: string;
    }
  | {
      kind: 'location';
      id: string;
      suggestion: MapLocationSuggestion;
    };

const SUGGESTION_LAYER_MAP: Record<string, MapLayerId> = {
  business: 'businesses',
  event: 'events',
  tourism: 'tourism',
  marketplace: 'marketplace',
};

export function markerIdFromSuggestionId(suggestionId: string): string | null {
  const [prefix, sourceId] = suggestionId.split('-', 2);
  const layer = SUGGESTION_LAYER_MAP[prefix];
  if (!layer || !sourceId) return null;
  return `${prefix}-${sourceId}`;
}

export function findMarkerForSuggestion(markers: MapMarker[], suggestion: MapLocationSuggestion): MapMarker | null {
  const markerId = markerIdFromSuggestionId(suggestion.id);
  if (!markerId) return null;
  return markers.find((marker) => marker.id === markerId) ?? null;
}

export function searchLocalMapMarkers(markers: MapMarker[], query: string, limit = 8): MapSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = markers
    .map((marker) => {
      const layer = LAYER_BY_ID[marker.layer];
      const haystack = [marker.title, marker.subtitle, marker.description, layer?.label]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matches = tokens.every((token) => haystack.includes(token));
      if (!matches) return null;

      const title = marker.title.toLowerCase();
      let score = 0;
      if (title === q) score += 100;
      else if (title.startsWith(q)) score += 50;
      else if (title.includes(q)) score += 20;
      if (marker.subtitle?.toLowerCase().includes(q)) score += 10;

      return { marker, score };
    })
    .filter((row): row is { marker: MapMarker; score: number } => row !== null)
    .sort((a, b) => b.score - a.score || a.marker.title.localeCompare(b.marker.title, 'tr'))
    .slice(0, limit);

  return scored.map(({ marker }) => ({
    kind: 'marker',
    id: `marker-${marker.id}`,
    marker,
    label: marker.title,
    subtitle: [LAYER_BY_ID[marker.layer]?.label, marker.subtitle].filter(Boolean).join(' · '),
  }));
}

export function mergeMapSearchHits(localHits: MapSearchHit[], remoteSuggestions: MapLocationSuggestion[]): MapSearchHit[] {
  const localMarkerIds = new Set(localHits.map((hit) => (hit.kind === 'marker' ? hit.marker.id : '')));
  const merged: MapSearchHit[] = [...localHits];

  for (const suggestion of remoteSuggestions) {
    const markerId = markerIdFromSuggestionId(suggestion.id);
    if (markerId && localMarkerIds.has(markerId)) continue;

    merged.push({
      kind: 'location',
      id: suggestion.id,
      suggestion,
    });
  }

  return merged;
}

export function splitMapSearchHits(hits: MapSearchHit[]): {
  onMap: MapSearchHit[];
  places: MapSearchHit[];
} {
  const onMap = hits.filter((hit) => hit.kind === 'marker');
  const places = hits.filter((hit) => hit.kind === 'location');
  return { onMap, places };
}
