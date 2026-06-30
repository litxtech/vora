import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioPlayer } from 'expo-audio';
import { isMusicTrackPlayable } from '@/features/music/constants';
import {
  playAudioPreview,
  releaseAudioPlayer,
  stopMusicPreview,
} from '@/features/music/services/audioPreview';
import { toUserFacingError } from '@/lib/errors';

export function useMusicPreview() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    stopMusicPreview();
    playerRef.current = null;
    playingIdRef.current = null;
    setPlayingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const togglePreview = useCallback(
    async (trackId: string, audioUrl: string, startSec = 0): Promise<{ ok: boolean; error?: string }> => {
      if (!isMusicTrackPlayable(audioUrl)) {
        return { ok: false, error: 'Bu parçanın ses dosyası henüz yüklenmemiş.' };
      }

      if (playingIdRef.current === trackId) {
        stop();
        return { ok: true };
      }

      stop();

      try {
        const player = await playAudioPreview(audioUrl, startSec, 1);
        playerRef.current = player;
        playingIdRef.current = trackId;
        setPlayingId(trackId);

        const subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            subscription.remove();
            stop();
          }
        });

        return { ok: true };
      } catch (err) {
        stop();
        const rawMessage = err instanceof Error ? err.message : null;
        if (rawMessage === 'Önizleme iptal edildi') {
          return { ok: true };
        }
        const message = toUserFacingError(rawMessage, { fallback: 'Müzik çalınamadı.' });
        return { ok: false, error: message };
      }
    },
    [stop],
  );

  return { togglePreview, stopPreview: stop, playingId };
};
