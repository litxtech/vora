import type { CreatePostInput } from '@/features/compose/services/createPost';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import type { PostCategory } from '@/types/database';
import type { PostAudience } from '@/features/profile/services/audienceFilter';
import { useMusicSelectionStore } from '@/features/music/store/musicSelectionStore';
import { useStudioExportStore } from '@/features/vora-studio/store/studioExportStore';

export type ComposeFormState = {
  content: string;
  title: string;
  locationText: string;
  selectedLocation: SelectedLocation | null;
  category: PostCategory | null;
  mediaUris: string[];
  audience: PostAudience;
  showLocation: boolean;
};

export function hydrateComposeFromSnapshot(snapshot: CreatePostInput): ComposeFormState {
  const selectedLocation: SelectedLocation | null = snapshot.locationLabel
    ? {
        label: snapshot.locationLabel,
        latitude: snapshot.latitude ?? null,
        longitude: snapshot.longitude ?? null,
        source: snapshot.locationSource,
        geocodeHint: snapshot.locationGeocodeHint ?? undefined,
        suggestionRegionId: snapshot.locationSuggestionRegionId,
        mapboxId: snapshot.locationMapboxId ?? undefined,
        sessionToken: snapshot.locationSessionToken ?? undefined,
      }
    : null;

  if (snapshot.music) {
    useMusicSelectionStore.getState().setSelection(snapshot.music);
  }

  if (snapshot.editManifest) {
    useStudioExportStore.getState().setEditManifest(snapshot.editManifest);
  }

  return {
    content: snapshot.content,
    title: snapshot.title ?? '',
    locationText: snapshot.locationLabel ?? '',
    selectedLocation,
    category: snapshot.category,
    mediaUris: snapshot.mediaUris,
    audience: snapshot.audience ?? 'public',
    showLocation: Boolean(snapshot.locationLabel),
  };
}

export function isActiveComposeUploadSession(
  status: string,
  videoUploadActive: boolean,
  composeSnapshot: CreatePostInput | null,
): boolean {
  if (!composeSnapshot) return false;
  return status === 'uploading' || videoUploadActive;
}
