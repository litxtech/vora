import type { VideoPlayer } from 'expo-video';

export function isVideoPlayerAlive(player: VideoPlayer | null | undefined): player is VideoPlayer {
  if (!player) return false;
  try {
    void player.status;
    return true;
  } catch {
    return false;
  }
}

export function readVideoPlayerStatus(player: VideoPlayer): string | null {
  try {
    return player.status;
  } catch {
    return null;
  }
}

export function readVideoPlayerPlaying(player: VideoPlayer): boolean | null {
  try {
    return player.playing;
  } catch {
    return null;
  }
}

export function readVideoPlayerCurrentTime(player: VideoPlayer): number | null {
  try {
    return player.currentTime;
  } catch {
    return null;
  }
}

export function readVideoPlayerDuration(player: VideoPlayer): number | null {
  try {
    return player.duration;
  } catch {
    return null;
  }
}

export function readVideoPlayerBufferedPosition(player: VideoPlayer): number | null {
  try {
    return player.bufferedPosition;
  } catch {
    return null;
  }
}

export function runIfVideoPlayerAlive(player: VideoPlayer, fn: (player: VideoPlayer) => void): void {
  if (!isVideoPlayerAlive(player)) return;
  try {
    fn(player);
  } catch {
    /* native player released mid-call */
  }
}
