import { router } from 'expo-router';
import { useMapStore } from '@/features/map/store/mapStore';
import type { ChatLocationPayload, ChatLocationViewContext } from '../types';

export function openChatLocationMap(
  payload: ChatLocationPayload,
  context?: ChatLocationViewContext,
) {
  router.push({
    pathname: '/chat/location',
    params: {
      latitude: String(payload.latitude),
      longitude: String(payload.longitude),
      label: payload.label ?? '',
      street: payload.street ?? '',
      district: payload.district ?? '',
      city: payload.city ?? '',
      region: payload.region ?? '',
      country: payload.country ?? '',
      postalCode: payload.postalCode ?? '',
      accuracy: payload.accuracy != null ? String(payload.accuracy) : '',
      sharedAt: context?.sharedAt ?? '',
      senderName: context?.senderName ?? '',
    },
  } as never);
}

export function openLocationInMainMap(payload: ChatLocationPayload) {
  useMapStore.getState().focusOn(payload.latitude, payload.longitude, 16);
  router.push('/(tabs)/map' as never);
}
