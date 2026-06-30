import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { isMusicTrackPlayable } from '@/features/music/constants';

let activePreviewPlayer: AudioPlayer | null = null;
let activeStudioPlayer: AudioPlayer | null = null;
let previewGeneration = 0;

const resolvedUriCache = new Map<string, string>();
const inflightUriCache = new Map<string, Promise<string>>();

/**
 * Bildirim sesleri ve chat sesi ile aynı basit model.
 * Reels/studio için doNotMix — tek aktif parça.
 */
export async function ensureAudioPreviewMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
  });
}

/** Reels: müzik + sessiz video birlikte — doNotMix videoyu iOS'ta durdurur. */
export async function ensureReelFeedAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    allowsRecording: false,
  });
}

async function resolveAudioSourceUri(audioUrl: string): Promise<string> {
  if (!audioUrl.startsWith('http')) return audioUrl;

  const cleanUrl = audioUrl.split('?')[0] ?? audioUrl;
  const ext = cleanUrl.split('.').pop()?.toLowerCase() ?? 'mp3';
  const mimeType = ext === 'm4a' || ext === 'aac' ? 'mp4' : ext;

  const asset = Asset.fromURI(audioUrl);
  const downloadable =
    asset.type != null
      ? asset
      : new Asset({
          uri: audioUrl,
          type: mimeType,
          name: `track.${ext}`,
        });

  await downloadable.downloadAsync();
  return downloadable.localUri ?? downloadable.uri;
}

/** Aynı parçayı tekrar indirmeden yerel URI döner. */
export async function resolveAudioSourceUriCached(audioUrl: string): Promise<string> {
  if (!audioUrl.startsWith('http')) return audioUrl;

  const cached = resolvedUriCache.get(audioUrl);
  if (cached) return cached;

  const inflight = inflightUriCache.get(audioUrl);
  if (inflight) return inflight;

  const promise = resolveAudioSourceUri(audioUrl)
    .then((uri) => {
      resolvedUriCache.set(audioUrl, uri);
      inflightUriCache.delete(audioUrl);
      return uri;
    })
    .catch((err) => {
      inflightUriCache.delete(audioUrl);
      throw err;
    });

  inflightUriCache.set(audioUrl, promise);
  return promise;
}

export function prefetchAudioSourceUri(audioUrl: string | null | undefined): void {
  if (!audioUrl || !isMusicTrackPlayable(audioUrl)) return;
  void resolveAudioSourceUriCached(audioUrl).catch(() => undefined);
}

export function releaseAudioPlayer(player: AudioPlayer | null | undefined): void {
  if (!player) return;
  try {
    player.pause();
  } catch {
    /* ignore */
  }
  try {
    player.volume = 0;
  } catch {
    /* ignore */
  }
  try {
    player.release();
  } catch {
    /* ignore */
  }
}

/** Picker önizlemesini durdur — yeni parça dinlenmeden önce mutlaka çağrılır. */
export function stopMusicPreview(): void {
  previewGeneration += 1;
  if (activePreviewPlayer) {
    releaseAudioPlayer(activePreviewPlayer);
    activePreviewPlayer = null;
  }
}

/** Studio / reel oynatıcısını kaydet; yeni player gelince eskisini kapatır. */
export function registerStudioMusicPlayer(player: AudioPlayer | null): void {
  if (activeStudioPlayer && activeStudioPlayer !== player) {
    releaseAudioPlayer(activeStudioPlayer);
  }
  activeStudioPlayer = player;
}

/** Tüm müzik oynatıcılarını kapat (picker + studio + reel). */
export function stopAllMusicPlayback(): void {
  stopMusicPreview();
  if (activeStudioPlayer) {
    releaseAudioPlayer(activeStudioPlayer);
    activeStudioPlayer = null;
  }
}

export async function loadReelMusicPlayer(audioUrl: string, volume = 1): Promise<AudioPlayer> {
  if (!isMusicTrackPlayable(audioUrl)) {
    throw new Error('Geçerli ses dosyası bulunamadı');
  }

  await ensureReelFeedAudioMode();
  const uri = await resolveAudioSourceUriCached(audioUrl);
  const player = createAudioPlayer({ uri });
  player.volume = volume;
  return player;
}

export async function loadAudioPreviewPlayer(audioUrl: string, volume = 1): Promise<AudioPlayer> {
  if (!isMusicTrackPlayable(audioUrl)) {
    throw new Error('Geçerli ses dosyası bulunamadı');
  }

  await ensureAudioPreviewMode();
  const uri = await resolveAudioSourceUriCached(audioUrl);
  const player = createAudioPlayer({ uri });
  player.volume = volume;
  return player;
}

export async function playAudioPreview(
  audioUrl: string,
  startSec = 0,
  volume = 1,
): Promise<AudioPlayer> {
  stopMusicPreview();
  const generation = previewGeneration;

  const player = await loadAudioPreviewPlayer(audioUrl, volume);

  if (generation !== previewGeneration) {
    releaseAudioPlayer(player);
    throw new Error('Önizleme iptal edildi');
  }

  if (startSec > 0) {
    try {
      await player.seekTo(startSec);
    } catch {
      /* henüz buffer yoksa yoksay */
    }
  }

  activePreviewPlayer = player;
  player.play();
  return player;
}

export async function playStudioMusicPreview(
  audioUrl: string,
  volume = 1,
): Promise<AudioPlayer> {
  stopMusicPreview();
  const player = await loadAudioPreviewPlayer(audioUrl, volume);
  registerStudioMusicPlayer(player);
  return player;
}
