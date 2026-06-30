import type { AudioPlayer } from 'expo-audio';
import type { VideoPlayer } from 'expo-video';
import type { MusicPlaybackConfig } from '@/features/music/types';
import {
  isVideoPlayerAlive,
  readVideoPlayerCurrentTime,
  readVideoPlayerPlaying,
  runIfVideoPlayerAlive,
} from '@/features/reels/services/safeVideoPlayer';
import {
  ensureReelFeedAudioMode,
  loadReelMusicPlayer,
  prefetchAudioSourceUri,
  releaseAudioPlayer,
} from '@/features/music/services/audioPreview';

const LOOP_SEEK_THRESHOLD_SEC = 0.45;
const VIDEO_STALL_GRACE_MS = 600;

let audioPlayer: AudioPlayer | null = null;
let boundVideoPlayer: VideoPlayer | null = null;
let boundConfig: MusicPlaybackConfig | null = null;
let boundReelId: string | null = null;
let loadGeneration = 0;
let timeSubscription: { remove: () => void } | null = null;
let lastVideoTimeSec = 0;
let lastMusicTargetSec = 0;
let videoPauseGraceTimer: ReturnType<typeof setTimeout> | null = null;
let audioModeReady = false;

const pooledPlayers = new Map<string, AudioPlayer>();

function musicClipDuration(config: MusicPlaybackConfig): number {
  return Math.max(0.05, config.musicEndSec - config.musicStartSec);
}

/** Uzun videolarda müzik klip döngüsü — videodan kısa seçilmiş parça tekrarlar. */
export function musicTimeForVideo(videoTimeSec: number, config: MusicPlaybackConfig): number {
  const clipLen = musicClipDuration(config);
  const offset = ((Math.max(0, videoTimeSec) % clipLen) + clipLen) % clipLen;
  return config.musicStartSec + offset;
}

function applyVideoAudioMix(player: VideoPlayer, config: MusicPlaybackConfig): void {
  runIfVideoPlayerAlive(player, (p) => {
    const muteOriginal = config.originalAudioVolume <= 0.001;
    p.muted = muteOriginal;
    p.volume = muteOriginal ? 0 : config.originalAudioVolume;
  });
}

function clearVideoPauseGrace(): void {
  if (videoPauseGraceTimer) {
    clearTimeout(videoPauseGraceTimer);
    videoPauseGraceTimer = null;
  }
}

function clearSubscription(): void {
  clearVideoPauseGrace();
  timeSubscription?.remove();
  timeSubscription = null;
}

function pausePooledPlayer(player: AudioPlayer): void {
  try {
    player.pause();
  } catch {
    /* ignore */
  }
}

function playMusicAt(target: number, forceSeek = false): void {
  const player = audioPlayer;
  const config = boundConfig;
  const video = boundVideoPlayer;
  if (!player || !config || !video || !isVideoPlayerAlive(video)) return;

  if (readVideoPlayerPlaying(video) !== true) {
    pausePooledPlayer(player);
    return;
  }

  try {
    player.volume = config.musicVolume;

    const drift = Math.abs(player.currentTime - target);
    if (forceSeek || drift > LOOP_SEEK_THRESHOLD_SEC) {
      void player.seekTo(target).then(() => {
        if (
          boundVideoPlayer === video &&
          audioPlayer === player &&
          isVideoPlayerAlive(video) &&
          readVideoPlayerPlaying(video) === true
        ) {
          try {
            player.play();
          } catch {
            /* ignore */
          }
        }
      });
      return;
    }

    if (!player.playing) {
      try {
        player.play();
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore stale player */
  }
}

function bindSyncListener(videoPlayer: VideoPlayer): void {
  clearSubscription();
  lastVideoTimeSec = readVideoPlayerCurrentTime(videoPlayer) ?? 0;
  lastMusicTargetSec = boundConfig
    ? musicTimeForVideo(readVideoPlayerCurrentTime(videoPlayer) ?? 0, boundConfig)
    : 0;

  const subs: Array<{ remove: () => void }> = [];

  subs.push(
    videoPlayer.addListener('playingChange', ({ isPlaying }) => {
      const config = boundConfig;
      if (!config || boundVideoPlayer !== videoPlayer) return;

      clearVideoPauseGrace();

      if (!isPlaying) {
        videoPauseGraceTimer = setTimeout(() => {
          if (
            boundVideoPlayer === videoPlayer &&
            isVideoPlayerAlive(videoPlayer) &&
            readVideoPlayerPlaying(videoPlayer) !== true &&
            audioPlayer
          ) {
            pausePooledPlayer(audioPlayer);
          }
        }, VIDEO_STALL_GRACE_MS);
        return;
      }

      playMusicAt(musicTimeForVideo(readVideoPlayerCurrentTime(videoPlayer) ?? 0, config), false);
    }),
  );

  subs.push(
    videoPlayer.addListener('timeUpdate', ({ currentTime }) => {
      const config = boundConfig;
      if (!config || boundVideoPlayer !== videoPlayer) return;

      const target = musicTimeForVideo(currentTime, config);

      if (currentTime < lastVideoTimeSec - 0.35) {
        lastVideoTimeSec = currentTime;
        lastMusicTargetSec = target;
        playMusicAt(target, true);
        return;
      }

      if (target < lastMusicTargetSec - 0.2) {
        lastMusicTargetSec = target;
        playMusicAt(target, true);
        return;
      }

      lastVideoTimeSec = currentTime;
      lastMusicTargetSec = target;
    }),
  );

  subs.push(
    videoPlayer.addListener('playToEnd', () => {
      const config = boundConfig;
      if (!config || boundVideoPlayer !== videoPlayer) return;
      lastVideoTimeSec = 0;
      lastMusicTargetSec = musicTimeForVideo(0, config);
      playMusicAt(lastMusicTargetSec, true);
    }),
  );

  timeSubscription = {
    remove: () => {
      for (const sub of subs) sub.remove();
    },
  };
}

async function ensureReelAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await ensureReelFeedAudioMode();
  audioModeReady = true;
}

async function getPooledPlayer(audioUrl: string, volume: number): Promise<AudioPlayer> {
  await ensureReelAudioMode();

  const existing = pooledPlayers.get(audioUrl);
  if (existing) {
    try {
      existing.volume = volume;
      return existing;
    } catch {
      pooledPlayers.delete(audioUrl);
    }
  }

  const created = await loadReelMusicPlayer(audioUrl, volume);
  pooledPlayers.set(audioUrl, created);
  return created;
}

export function detachReelMusic(): void {
  loadGeneration += 1;
  clearSubscription();
  if (audioPlayer) pausePooledPlayer(audioPlayer);
  audioPlayer = null;
  boundVideoPlayer = null;
  boundConfig = null;
  boundReelId = null;
  lastVideoTimeSec = 0;
  lastMusicTargetSec = 0;
}

export function detachReelMusicIfOwner(reelId: string): void {
  if (boundReelId !== reelId) return;
  detachReelMusic();
}

export function ensureReelVideoPlaying(videoPlayer: VideoPlayer): void {
  runIfVideoPlayerAlive(videoPlayer, (p) => {
    p.loop = true;
    if (readVideoPlayerPlaying(p) !== true) p.play();
  });
}

export async function attachReelMusic(
  reelId: string,
  videoPlayer: VideoPlayer,
  config: MusicPlaybackConfig,
): Promise<void> {
  const target = musicTimeForVideo(Math.max(0, readVideoPlayerCurrentTime(videoPlayer) ?? 0), config);

  if (
    boundReelId === reelId &&
    boundVideoPlayer === videoPlayer &&
    audioPlayer &&
    boundConfig?.audioUrl === config.audioUrl &&
    isVideoPlayerAlive(videoPlayer)
  ) {
    boundConfig = config;
    applyVideoAudioMix(videoPlayer, config);
    if (readVideoPlayerPlaying(videoPlayer) === true) {
      playMusicAt(target, false);
    }
    return;
  }

  if (audioPlayer) pausePooledPlayer(audioPlayer);
  clearSubscription();
  loadGeneration += 1;
  const generation = loadGeneration;

  boundReelId = reelId;
  boundVideoPlayer = videoPlayer;
  boundConfig = config;
  applyVideoAudioMix(videoPlayer, config);

  try {
    prefetchAudioSourceUri(config.audioUrl);
    const nextPlayer = await getPooledPlayer(config.audioUrl, config.musicVolume);
    if (generation !== loadGeneration) return;

    audioPlayer = nextPlayer;
    bindSyncListener(videoPlayer);

    if (readVideoPlayerPlaying(videoPlayer) === true) {
      playMusicAt(target, true);
    }
  } catch {
    if (generation === loadGeneration) detachReelMusicIfOwner(reelId);
  }
}

export function prefetchReelMusic(config: MusicPlaybackConfig | null | undefined): void {
  if (!config?.audioUrl) return;
  prefetchAudioSourceUri(config.audioUrl);
  void getPooledPlayer(config.audioUrl, config.musicVolume).catch(() => undefined);
}

export function prepareReelMusicInPool(config: MusicPlaybackConfig): void {
  prefetchReelMusic(config);
}

export function clearReelMusicPool(): void {
  for (const player of pooledPlayers.values()) {
    releaseAudioPlayer(player);
  }
  pooledPlayers.clear();
  detachReelMusic();
  audioModeReady = false;
}
