import { createVideoPlayer, type VideoPlayer, type VideoSource } from 'expo-video';
import { getMuxPlaybackUrl } from '@/lib/mux/client';
import { toVideoSource } from '@/lib/media/videoSource';

const MAX_WARM_PLAYERS = 2;

/** Tıklanan reel — anchor sırasında pause edilmez, LRU'dan atılmaz. */
let primedPlaybackId: string | null = null;

/** Gizli preload — henüz ekranda mount edilmemiş. */
const hiddenPlayers = new Map<string, VideoPlayer>();
/** ReelPlayer unmount olunca geri dönüş için saklanan sıcak oynatıcılar. */
const stashedPlayers = new Map<string, VideoPlayer>();
const hiddenStatusSubs = new Map<string, { remove: () => void }>();
const lruOrder: string[] = [];

function configurePlayer(player: VideoPlayer): void {
  player.loop = true;
  player.muted = true;
  player.volume = 0;
  player.timeUpdateEventInterval = 0;
  try {
    player.bufferOptions = {
      preferredForwardBufferDuration: 8,
      minBufferForPlayback: 0.5,
    };
  } catch {
    /* ignore */
  }
}

function touchLru(playbackId: string): void {
  const idx = lruOrder.indexOf(playbackId);
  if (idx >= 0) lruOrder.splice(idx, 1);
  lruOrder.push(playbackId);
}

function removeFromLru(playbackId: string): void {
  const idx = lruOrder.indexOf(playbackId);
  if (idx >= 0) lruOrder.splice(idx, 1);
}

function warmPlayerCount(): number {
  return hiddenPlayers.size + stashedPlayers.size;
}

function releasePlayer(playbackId: string): void {
  hiddenStatusSubs.get(playbackId)?.remove();
  hiddenStatusSubs.delete(playbackId);

  const player = hiddenPlayers.get(playbackId) ?? stashedPlayers.get(playbackId);
  hiddenPlayers.delete(playbackId);
  stashedPlayers.delete(playbackId);
  removeFromLru(playbackId);

  if (!player) return;
  try {
    player.pause();
    player.release();
  } catch {
    /* ignore */
  }
}

function evictOldestWarmPlayer(): void {
  for (let i = 0; i < lruOrder.length; i += 1) {
    const candidate = lruOrder[i];
    if (candidate === primedPlaybackId) continue;
    lruOrder.splice(i, 1);
    releasePlayer(candidate);
    return;
  }
}

function ensurePoolCapacity(): void {
  while (warmPlayerCount() >= MAX_WARM_PLAYERS) {
    evictOldestWarmPlayer();
  }
}

function beginHiddenBuffer(player: VideoPlayer): void {
  try {
    if (player.status === 'readyToPlay' && !player.playing) {
      player.play();
    }
  } catch {
    /* ignore */
  }
}

function startHiddenPreload(playbackId: string): void {
  if (hiddenPlayers.has(playbackId) || stashedPlayers.has(playbackId)) return;

  ensurePoolCapacity();

  const source = toVideoSource(getMuxPlaybackUrl(playbackId));
  const player = createVideoPlayer(source);
  configurePlayer(player);

  const statusSub = player.addListener('statusChange', ({ status }) => {
    if (status === 'readyToPlay') beginHiddenBuffer(player);
  });
  hiddenStatusSubs.set(playbackId, statusSub);

  if (player.status === 'readyToPlay') {
    beginHiddenBuffer(player);
  }

  hiddenPlayers.set(playbackId, player);
  touchLru(playbackId);
}

/**
 * Aktif reel'in önü + arkası — yukarı kaydırınca da hazır olsun.
 * Aktif indeks hariç (onu ReelPlayer yönetir).
 */
/** Reel'e tıklanınca hemen video buffer'ı başlat — oynatıcı ReelPlayer mount olunca sıcak devralır. */
export function primeReelVideoPreload(playbackId: string): void {
  if (!playbackId) return;
  primedPlaybackId = playbackId;
  touchLru(playbackId);

  for (const id of [...hiddenPlayers.keys(), ...stashedPlayers.keys()]) {
    if (id !== playbackId) releasePlayer(id);
  }

  startHiddenPreload(playbackId);
}

export function clearPrimedReelVideoPreload(): void {
  primedPlaybackId = null;
}

export function scheduleReelVideoPreload(playbackIds: string[]): void {
  const wanted = [...new Set(playbackIds.filter(Boolean))].slice(0, MAX_WARM_PLAYERS);

  for (const id of [...hiddenPlayers.keys()]) {
    if (!wanted.includes(id)) {
      releasePlayer(id);
    }
  }

  for (const id of wanted) {
    if (stashedPlayers.has(id)) continue;
    startHiddenPreload(id);
  }
}

/** ReelPlayer mount — önce stash, sonra gizli preload, en son yeni oluştur. */
export function acquireWarmVideoPlayer(playbackId: string, videoSource: VideoSource): VideoPlayer {
  hiddenStatusSubs.get(playbackId)?.remove();
  hiddenStatusSubs.delete(playbackId);

  const stashed = stashedPlayers.get(playbackId);
  if (stashed) {
    stashedPlayers.delete(playbackId);
    touchLru(playbackId);
    return stashed;
  }

  const hidden = hiddenPlayers.get(playbackId);
  if (hidden) {
    hiddenPlayers.delete(playbackId);
    touchLru(playbackId);
    try {
      hidden.pause();
    } catch {
      /* ignore */
    }
    return hidden;
  }

  ensurePoolCapacity();
  const player = createVideoPlayer(videoSource);
  configurePlayer(player);
  touchLru(playbackId);
  return player;
}

/** Unmount — release etme, buffer'ı koru (yukarı kaydırma için). */
export function stashWarmVideoPlayer(playbackId: string, player: VideoPlayer): void {
  if (hiddenPlayers.has(playbackId) || stashedPlayers.has(playbackId)) {
    try {
      player.pause();
      player.release();
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    player.pause();
    player.muted = true;
    player.volume = 0;
  } catch {
    /* ignore */
  }

  ensurePoolCapacity();
  stashedPlayers.set(playbackId, player);
  touchLru(playbackId);
}

export function clearReelVideoPreloadPool(): void {
  for (const id of [...lruOrder]) {
    releasePlayer(id);
  }
}

/** Sekme arka plana geçince — mount edilmiş ReelPlayer oynatıcılarını release etme. */
export function pauseReelVideoPreloadPool(): void {
  for (const [id, player] of hiddenPlayers.entries()) {
    if (id === primedPlaybackId) continue;
    try {
      player.pause();
    } catch {
      /* ignore */
    }
  }
  for (const [id, player] of stashedPlayers.entries()) {
    if (id === primedPlaybackId) continue;
    try {
      player.pause();
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated acquireWarmVideoPlayer kullan */
export function takePreloadedVideoPlayer(playbackId: string): VideoPlayer | null {
  const hidden = hiddenPlayers.get(playbackId);
  if (!hidden) return null;
  hiddenPlayers.delete(playbackId);
  hiddenStatusSubs.get(playbackId)?.remove();
  hiddenStatusSubs.delete(playbackId);
  removeFromLru(playbackId);
  try {
    hidden.pause();
  } catch {
    /* ignore */
  }
  return hidden;
}
