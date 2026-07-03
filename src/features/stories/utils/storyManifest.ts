import type { MusicSelection } from '@/features/music/types';
import type { StoryFraming } from '@/features/stories/utils/storyFraming';
import { parseStoryFraming } from '@/features/stories/utils/storyFraming';
import {
  parseStoryLinks,
  serializeStoryLinks,
  type StoryLinkManifest,
} from '@/features/stories/utils/storyLinks';

export type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';

export type StoryLocationManifest = {
  label: string;
};

export type StoryMusicManifest = {
  trackId: string;
  displayTitle: string;
  artist: string;
  audioUrl: string;
  musicStartSec: number;
  musicEndSec: number;
  musicVolume: number;
  originalAudioVolume: number;
};

export type StoryManifest = {
  framing: StoryFraming | null;
  music: StoryMusicManifest | null;
  location: StoryLocationManifest | null;
  links: StoryLinkManifest[];
  /** Video orijinal sesi — müzik yokken geçerli (0 = sessiz, yoksa 1). */
  originalAudioVolume?: number;
};

export const EMPTY_STORY_MANIFEST: StoryManifest = {
  framing: null,
  music: null,
  location: null,
  links: [],
};

export function musicSelectionToManifest(music: MusicSelection | null): StoryMusicManifest | null {
  if (!music?.trackId || !music.audioUrl) return null;
  return {
    trackId: music.trackId,
    displayTitle: music.displayTitle,
    artist: music.artist,
    audioUrl: music.audioUrl,
    musicStartSec: music.musicStartSec,
    musicEndSec: music.musicEndSec,
    musicVolume: music.musicVolume,
    originalAudioVolume: music.originalAudioVolume,
  };
}

export function parseStoryManifest(raw: unknown): StoryManifest {
  if (!raw) return { ...EMPTY_STORY_MANIFEST };

  if (Array.isArray(raw)) {
    return { ...EMPTY_STORY_MANIFEST, framing: parseStoryFraming({ framing: raw[0] }) };
  }

  if (typeof raw !== 'object') {
    return { ...EMPTY_STORY_MANIFEST, framing: parseStoryFraming(raw) };
  }

  const obj = raw as Record<string, unknown>;
  const framing = parseStoryFraming(raw);
  const musicRaw = obj.music;
  const locationRaw = obj.location;

  let music: StoryMusicManifest | null = null;
  if (musicRaw && typeof musicRaw === 'object') {
    const m = musicRaw as Record<string, unknown>;
    if (typeof m.trackId === 'string' && typeof m.audioUrl === 'string') {
      music = {
        trackId: m.trackId,
        displayTitle: typeof m.displayTitle === 'string' ? m.displayTitle : '',
        artist: typeof m.artist === 'string' ? m.artist : '',
        audioUrl: m.audioUrl,
        musicStartSec: typeof m.musicStartSec === 'number' ? m.musicStartSec : 0,
        musicEndSec: typeof m.musicEndSec === 'number' ? m.musicEndSec : 30,
        musicVolume: typeof m.musicVolume === 'number' ? m.musicVolume : 0.8,
        originalAudioVolume: typeof m.originalAudioVolume === 'number' ? m.originalAudioVolume : 1,
      };
    }
  }

  let location: StoryLocationManifest | null = null;
  if (locationRaw && typeof locationRaw === 'object') {
    const l = locationRaw as Record<string, unknown>;
    if (typeof l.label === 'string' && l.label.trim()) {
      location = { label: l.label.trim() };
    }
  }

  const links = parseStoryLinks(obj.links);

  const originalAudioVolume =
    typeof obj.originalAudioVolume === 'number' ? obj.originalAudioVolume : 1;

  return { framing, music, location, links, originalAudioVolume };
}

export function serializeStoryManifest(manifest: StoryManifest): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (manifest.framing) out.framing = manifest.framing;
  if (manifest.music) out.music = manifest.music;
  if (manifest.location) out.location = manifest.location;
  if (manifest.links.length > 0) out.links = serializeStoryLinks(manifest.links);
  if (
    manifest.originalAudioVolume != null &&
    manifest.originalAudioVolume <= 0.001 &&
    !manifest.music
  ) {
    out.originalAudioVolume = 0;
  }
  return out;
}
