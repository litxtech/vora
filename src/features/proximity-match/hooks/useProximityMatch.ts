import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { toUserFacingError } from '@/lib/errors';
import {
  PROXIMITY_CANDIDATE_POLL_MS,
  PROXIMITY_PRESENCE_DISTANCE_M,
  PROXIMITY_PRESENCE_INTERVAL_MS,
  PROXIMITY_PUBLISH_POLL_MIN_MS,
  PROXIMITY_REALTIME_DEBOUNCE_MS,
} from '@/features/proximity-match/constants';
import {
  isProximityBackgroundOptInEnabled,
  subscribeProximityBackgroundOptIn,
} from '@/features/proximity-match/services/proximityLocationPrefs';
import {
  reconcileProximityBackgroundOptIn,
  setProximityBackgroundRegion,
  stopProximityBackgroundLocation,
  syncProximityBackgroundTracking,
} from '@/features/proximity-match/services/proximityBackgroundTask';
import {
  findNearbyProximityCandidate,
  submitProximityMatchDecision,
} from '@/features/proximity-match/services/proximityMatch';
import {
  proximityMatchIneligibilityMessage,
  resolveProximityMatchEligibility,
  type ProximityMatchIneligibilityReason,
} from '@/features/proximity-match/services/proximityMatchEligibility';
import {
  clearProximityPresence,
  upsertProximityPresence,
} from '@/features/proximity-match/services/proximityPresence';
import type { ProximityMatchCandidate } from '@/features/proximity-match/types';
import { DEFAULT_REGION_ID, type RegionId } from '@/constants/regions';
import {
  getProximityCandidatePollMs,
  getProximityPresenceIntervalMs,
} from '@/lib/device/androidPerfProfile';
import { useProximityTrackingSurfaceActive } from '@/features/proximity-match/hooks/useProximityTrackingSurfaceActive';
import { useAndroidHeavyBootGate } from '@/lib/device/useAndroidHeavyBootGate';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { useFeedVideoPlaybackStore } from '@/features/feed/store/feedVideoPlaybackStore';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { supabase } from '@/lib/supabase/client';
import { useOptionalAuth } from '@/providers/authContext';

export function useProximityMatch() {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const profile = auth?.profile ?? null;
  const heavyBootReady = useAndroidHeavyBootGate();
  const feedRegionId = useFeedStore((s) => s.regionId);
  const isFeedScrolling = useFeedVideoPlaybackStore((s) => s.isScrolling);
  const hasActiveFeedVideo = useFeedVideoPlaybackStore((s) => s.activePostId != null);
  const presenceRegionId =
    feedRegionId ?? (profile?.region_id as RegionId | undefined) ?? DEFAULT_REGION_ID;
  const enabled = useFeatureVisible('proximity-match');

  const eligibility = useMemo(
    () => resolveProximityMatchEligibility(profile, !!user?.id),
    [profile, user?.id],
  );

  const [candidate, setCandidate] = useState<ProximityMatchCandidate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [ineligibilityReason, setIneligibilityReason] =
    useState<ProximityMatchIneligibilityReason | null>(null);
  const [backgroundOptIn, setBackgroundOptIn] = useState(false);
  const [prefVersion, setPrefVersion] = useState(0);

  const mountedRef = useRef(true);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCandidateRef = useRef<() => Promise<void>>(async () => undefined);
  const lastCandidatePollAtRef = useRef(0);
  const realtimePollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  const dismissedRef = useRef<Set<string>>(new Set());
  const publishingRef = useRef(false);
  const watcherOpRef = useRef(0);
  const ineligibilityWarnedRef = useRef(false);

  const safeSetCandidate = useCallback((next: ProximityMatchCandidate | null) => {
    if (mountedRef.current) setCandidate(next);
  }, []);

  const safeSetIneligibilityReason = useCallback((reason: ProximityMatchIneligibilityReason | null) => {
    if (mountedRef.current) setIneligibilityReason(reason);
  }, []);

  const safeSetPermissionDenied = useCallback((denied: boolean) => {
    if (mountedRef.current) setPermissionDenied(denied);
  }, []);

  const stopForegroundWatcher = useCallback(() => {
    watcherOpRef.current += 1;
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
  }, []);

  const clearPresenceAndCoords = useCallback(async () => {
    await stopProximityBackgroundLocation();
    stopForegroundWatcher();
    await clearProximityPresence();
    coordsRef.current = null;
  }, [stopForegroundWatcher]);

  const publishCoords = useCallback(
    async (latitude: number, longitude: number) => {
      coordsRef.current = { lat: latitude, lng: longitude };

      if (!user?.id || publishingRef.current || !eligibility.eligible) return;

      publishingRef.current = true;
      const result = await upsertProximityPresence(presenceRegionId, latitude, longitude);
      publishingRef.current = false;

      if (!mountedRef.current) return;

      if (!result.ok) {
        if (result.reason) {
          safeSetIneligibilityReason(result.reason);
          if (!ineligibilityWarnedRef.current) {
            ineligibilityWarnedRef.current = true;
            console.warn(
              '[proximity-match] presence skipped:',
              proximityMatchIneligibilityMessage(result.reason),
            );
          }
          return;
        }

        if (result.error) {
          console.warn('[proximity-match] presence failed:', result.error);
        }
        return;
      }

      safeSetIneligibilityReason(null);

      const now = Date.now();
      if (now - lastCandidatePollAtRef.current >= PROXIMITY_PUBLISH_POLL_MIN_MS) {
        lastCandidatePollAtRef.current = now;
        void pollCandidateRef.current();
      }
    },
    [eligibility.eligible, presenceRegionId, safeSetIneligibilityReason, user?.id],
  );

  const pollCandidate = useCallback(async () => {
    if (!enabled || !user?.id || !eligibility.eligible || submitting) return;

    const coords = coordsRef.current;
    if (!coords) return;

    lastCandidatePollAtRef.current = Date.now();

    try {
      const next = await findNearbyProximityCandidate(coords.lat, coords.lng);
      if (!mountedRef.current) return;
      if (!next || dismissedRef.current.has(next.userId)) return;
      safeSetCandidate(next);
    } catch (err) {
      console.warn('[proximity-match] candidate poll failed:', err);
    }
  }, [eligibility.eligible, enabled, safeSetCandidate, submitting, user?.id]);

  const startTracking = useCallback(async () => {
    if (!eligibility.eligible) {
      safeSetIneligibilityReason(eligibility.reason);
      return;
    }

    const op = watcherOpRef.current + 1;
    watcherOpRef.current = op;

    await reconcileProximityBackgroundOptIn(presenceRegionId);
    const optIn = await isProximityBackgroundOptInEnabled();
    if (mountedRef.current) setBackgroundOptIn(optIn);

    await setProximityBackgroundRegion(presenceRegionId);
    const sync = await syncProximityBackgroundTracking(presenceRegionId, optIn);
    if (watcherOpRef.current !== op || !mountedRef.current) return;

    if (!sync.foregroundOk) {
      safeSetPermissionDenied(true);
      console.warn('[proximity-match] foreground location permission denied');
      return;
    }

    safeSetPermissionDenied(false);

    let initial: Location.LocationObject;
    try {
      initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
    } catch (err) {
      if (watcherOpRef.current !== op) return;
      console.warn('[proximity-match] getCurrentPosition failed:', err);
      return;
    }

    if (watcherOpRef.current !== op || !mountedRef.current) return;

    await publishCoords(initial.coords.latitude, initial.coords.longitude);
    if (watcherOpRef.current !== op) return;

    watcherRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Low,
        timeInterval: getProximityPresenceIntervalMs(PROXIMITY_PRESENCE_INTERVAL_MS),
        distanceInterval: PROXIMITY_PRESENCE_DISTANCE_M,
      },
      (position) => {
        void publishCoords(position.coords.latitude, position.coords.longitude);
      },
    );
  }, [
    eligibility.eligible,
    eligibility.reason,
    presenceRegionId,
    publishCoords,
    safeSetIneligibilityReason,
    safeSetPermissionDenied,
  ]);

  const respondToCandidate = useCallback(
    async (decision: 'yes' | 'no') => {
      if (!candidate || submitting) return;

      const target = candidate;
      dismissedRef.current.add(target.userId);
      safeSetCandidate(null);
      setSubmitting(true);

      try {
        const result = await submitProximityMatchDecision(target.userId, decision);

        if (result.status === 'matched') {
          const displayName = target.fullName ?? target.username;
          router.push(`/user/${target.userId}` as never);
          Alert.alert('Eşleştiniz!', `${displayName} ile eşleştiniz.`);
        }
      } catch (err) {
        Alert.alert(
          'İşlem başarısız',
          toUserFacingError(err instanceof Error ? err.message : null, { fallback: 'Tekrar deneyin.' }),
        );
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [candidate, safeSetCandidate, submitting],
  );

  const surfaceActive = useProximityTrackingSurfaceActive();
  const canRunMatching = enabled && !!user?.id && eligibility.eligible && heavyBootReady;
  /** Akış kaydırılırken veya inline video oynarken GPS/poll durur — pil ve ısı. */
  const canRunForeground =
    canRunMatching && appActive && surfaceActive && !isFeedScrolling && !hasActiveFeedVideo;
  const startTrackingRef = useRef(startTracking);
  startTrackingRef.current = startTracking;

  const scheduleRealtimePoll = useCallback(() => {
    if (realtimePollTimerRef.current) clearTimeout(realtimePollTimerRef.current);
    realtimePollTimerRef.current = setTimeout(() => {
      realtimePollTimerRef.current = null;
      void pollCandidateRef.current();
    }, PROXIMITY_REALTIME_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (realtimePollTimerRef.current) clearTimeout(realtimePollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return subscribeProximityBackgroundOptIn(() => {
      setPrefVersion((v) => v + 1);
    });
  }, []);

  useEffect(() => {
    if (!canRunMatching) {
      void clearPresenceAndCoords();
      safeSetCandidate(null);
      if (!eligibility.eligible && eligibility.reason) {
        safeSetIneligibilityReason(eligibility.reason);
      }
      return;
    }

    if (!canRunForeground) {
      stopForegroundWatcher();
      return;
    }

    void startTrackingRef.current();

    return () => {
      stopForegroundWatcher();
    };
  }, [
    canRunMatching,
    canRunForeground,
    clearPresenceAndCoords,
    eligibility.eligible,
    eligibility.reason,
    prefVersion,
    safeSetCandidate,
    safeSetIneligibilityReason,
    stopForegroundWatcher,
  ]);

  useEffect(() => {
    pollCandidateRef.current = pollCandidate;
  }, [pollCandidate]);

  useEffect(() => {
    if (!canRunForeground) return;
    void setProximityBackgroundRegion(presenceRegionId);
    const coords = coordsRef.current;
    if (coords) void publishCoords(coords.lat, coords.lng);
  }, [canRunForeground, presenceRegionId, publishCoords]);

  useEffect(() => {
    if (!canRunForeground) return;

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      void pollCandidate();
    }, getProximityCandidatePollMs(PROXIMITY_CANDIDATE_POLL_MS));

    void pollCandidate();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [canRunForeground, pollCandidate]);

  useEffect(() => {
    if (!canRunForeground || !user?.id) return;

    const channel = supabase
      .channel(`proximity-match-${user.id}-${presenceRegionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proximity_match_presence',
          filter: `region_id=eq.${presenceRegionId}`,
        },
        () => {
          scheduleRealtimePoll();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canRunForeground, presenceRegionId, scheduleRealtimePoll, user?.id]);

  return {
    candidate,
    submitting,
    permissionDenied,
    ineligibilityReason,
    backgroundOptIn,
    respondToCandidate,
  };
}
