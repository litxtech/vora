import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { PROXIMITY_PRESENCE_DISTANCE_M, PROXIMITY_PRESENCE_INTERVAL_MS } from '@/features/proximity-match/constants';
import {
  isProximityBackgroundOptInEnabled,
  setProximityBackgroundOptInEnabled,
} from '@/features/proximity-match/services/proximityLocationPrefs';
import { upsertProximityPresence } from '@/features/proximity-match/services/proximityPresence';

export const PROXIMITY_LOCATION_TASK = 'proximity-match-location';
const REGION_STORAGE_KEY = 'proximity-match:region-id';

let taskRegistered = false;

function isTaskManagerNativeAvailable(): boolean {
  return requireOptionalNativeModule('ExpoTaskManager') != null;
}

function ensureProximityBackgroundTask(): boolean {
  if (taskRegistered) return true;
  if (!isTaskManagerNativeAvailable()) return false;

  try {
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');

    TaskManager.defineTask(PROXIMITY_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.warn('[proximity-match:bg]', error.message);
        return;
      }

      const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
      const latest = locations?.at(-1);
      if (!latest) return;

      const regionId = (await AsyncStorage.getItem(REGION_STORAGE_KEY)) ?? 'trabzon';
      await upsertProximityPresence(regionId, latest.coords.latitude, latest.coords.longitude);
    });

    taskRegistered = true;
    return true;
  } catch (err) {
    console.warn('[proximity-match] background task registration failed:', err);
    return false;
  }
}

export function isProximityBackgroundLocationNativeAvailable(): boolean {
  return isTaskManagerNativeAvailable();
}

export async function setProximityBackgroundRegion(regionId: string): Promise<void> {
  await AsyncStorage.setItem(REGION_STORAGE_KEY, regionId);
}

/** Yalnızca ön plan konum izni — eşleşme için zorunlu. */
export async function ensureProximityForegroundPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return true;

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === 'granted';
}

export async function getProximityBackgroundPermissionStatus(): Promise<Location.PermissionStatus> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status;
}

export type ProximityBackgroundSyncResult = {
  foregroundOk: boolean;
  backgroundActive: boolean;
  nativeAvailable: boolean;
};

/**
 * Arka plan takibi yalnızca kullanıcı opt-in verdiyse ve izin onaylıysa başlar.
 * Ön plan izni her zaman kontrol edilir; arka plan izni otomatik istenmez.
 */
export async function syncProximityBackgroundTracking(
  regionId: string,
  userOptIn: boolean,
): Promise<ProximityBackgroundSyncResult> {
  await setProximityBackgroundRegion(regionId);

  const foregroundOk = await ensureProximityForegroundPermission();
  if (!foregroundOk) {
    await stopProximityBackgroundLocation();
    return { foregroundOk: false, backgroundActive: false, nativeAvailable: isTaskManagerNativeAvailable() };
  }

  if (!userOptIn) {
    await stopProximityBackgroundLocation();
    return { foregroundOk: true, backgroundActive: false, nativeAvailable: isTaskManagerNativeAvailable() };
  }

  const nativeAvailable = ensureProximityBackgroundTask();
  if (!nativeAvailable) {
    return { foregroundOk: true, backgroundActive: false, nativeAvailable: false };
  }

  const bgPerm = await Location.getBackgroundPermissionsAsync();
  if (bgPerm.status !== 'granted') {
    await stopProximityBackgroundLocation();
    return { foregroundOk: true, backgroundActive: false, nativeAvailable: true };
  }

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(PROXIMITY_LOCATION_TASK);
    if (!started) {
      await Location.startLocationUpdatesAsync(PROXIMITY_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: PROXIMITY_PRESENCE_INTERVAL_MS,
        distanceInterval: PROXIMITY_PRESENCE_DISTANCE_M,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Yakınlık eşleşmesi',
          notificationBody: 'Yakındaki Vora kullanıcıları için konum güncelleniyor.',
        },
      });
    }
    return { foregroundOk: true, backgroundActive: true, nativeAvailable: true };
  } catch (err) {
    console.warn('[proximity-match] background tracking start failed:', err);
    return { foregroundOk: true, backgroundActive: false, nativeAvailable: true };
  }
}

/** Kullanıcı opt-in açtığında: önce ön plan, sonra arka plan izni iste. */
export async function requestProximityBackgroundAccess(regionId: string): Promise<{
  granted: boolean;
  reason?: 'foreground_denied' | 'background_denied' | 'native_unavailable' | 'start_failed';
}> {
  const foregroundOk = await ensureProximityForegroundPermission();
  if (!foregroundOk) {
    return { granted: false, reason: 'foreground_denied' };
  }

  if (!ensureProximityBackgroundTask()) {
    return { granted: false, reason: 'native_unavailable' };
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    return { granted: false, reason: 'background_denied' };
  }

  const sync = await syncProximityBackgroundTracking(regionId, true);
  if (!sync.backgroundActive) {
    return { granted: false, reason: 'start_failed' };
  }

  return { granted: true };
}

export async function stopProximityBackgroundLocation(): Promise<void> {
  if (!ensureProximityBackgroundTask()) return;

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(PROXIMITY_LOCATION_TASK);
    if (started) {
      await Location.stopLocationUpdatesAsync(PROXIMITY_LOCATION_TASK);
    }
  } catch {
    /* zaten durmuş veya native yok */
  }
}

/** Opt-in açık ama sistem izni kalkmışsa tercihi sıfırla. */
export async function reconcileProximityBackgroundOptIn(regionId: string): Promise<void> {
  const optIn = await isProximityBackgroundOptInEnabled();
  if (!optIn) return;

  const status = await getProximityBackgroundPermissionStatus();
  if (status === 'granted') {
    await syncProximityBackgroundTracking(regionId, true);
    return;
  }

  await setProximityBackgroundOptInEnabled(false);
}
