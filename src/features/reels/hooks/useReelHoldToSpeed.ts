import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoPlayer } from 'expo-video';
import { setReelMusicPlaybackRate } from '@/features/music/services/reelMusicSync';
import { REEL_HOLD_SPEED_RATE } from '@/features/reels/constants';
import { runIfVideoPlayerAlive } from '@/features/reels/services/safeVideoPlayer';

const NORMAL_RATE = 1;

export function useReelHoldToSpeed({
  player,
  reelId,
  enabled,
}: {
  player: VideoPlayer;
  reelId: string;
  enabled: boolean;
}) {
  const [boosting, setBoosting] = useState(false);
  const boostingRef = useRef(false);

  const applyRate = useCallback(
    (rate: number) => {
      runIfVideoPlayerAlive(player, (p) => {
        p.playbackRate = rate;
      });
      setReelMusicPlaybackRate(reelId, rate);
    },
    [player, reelId],
  );

  const endBoost = useCallback(() => {
    if (!boostingRef.current) return;
    boostingRef.current = false;
    setBoosting(false);
    applyRate(NORMAL_RATE);
  }, [applyRate]);

  const beginBoost = useCallback(() => {
    if (!enabled || boostingRef.current) return;
    boostingRef.current = true;
    setBoosting(true);
    applyRate(REEL_HOLD_SPEED_RATE);
  }, [enabled, applyRate]);

  useEffect(() => {
    if (!enabled) endBoost();
  }, [enabled, endBoost]);

  useEffect(() => () => endBoost(), [endBoost]);

  return { boosting, beginBoost, endBoost };
}
