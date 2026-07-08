import { create } from 'zustand';
import { LIVE_SUPPORT_CLIP_MAX_SEC, STORY_CLIP_MAX_SEC, STUDIO_MAX_DURATION_SEC } from '@/features/vora-studio/constants';
import type {
  StudioEditorState,
  StudioExportMode,
  StudioTextOverlay,
  StudioTool,
  StudioVoiceOver,
} from '@/features/vora-studio/types';
import { computeMusicEnd } from '@/features/music/utils/formatMusicTime';
import type { MusicTrack } from '@/features/music/types';
import {
  createInitialClips,
  deleteClip,
  mergeAdjacentClips,
  moveClip,
  splitClipAt,
} from '@/features/vora-studio/utils/clips';
import { clampTime, generateId } from '@/features/vora-studio/utils/time';

function clipCapForMode(exportMode: StudioExportMode): { capped: boolean; maxClipSec: number } {
  if (exportMode === 'live-support') {
    return { capped: true, maxClipSec: LIVE_SUPPORT_CLIP_MAX_SEC };
  }
  if (exportMode === 'story') {
    return { capped: true, maxClipSec: STORY_CLIP_MAX_SEC };
  }
  return { capped: false, maxClipSec: STUDIO_MAX_DURATION_SEC };
}

type StudioActions = {
  initProject: (sourceUri: string, durationSec: number, exportMode?: StudioExportMode) => void;
  reset: () => void;
  setActiveTool: (tool: StudioTool) => void;
  toggleTool: (tool: StudioTool) => void;
  closeToolSheet: () => void;
  setSelectedTextOverlay: (id: string | null) => void;
  setTrimStart: (sec: number) => void;
  setTrimEnd: (sec: number) => void;
  slideTrimWindow: (startSec: number) => void;
  setPlayhead: (sec: number) => void;
  setPlaying: (playing: boolean) => void;
  setOriginalAudioVolume: (volume: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedMusic: (track: MusicTrack | null) => void;
  setMusicStartSec: (sec: number) => void;
  setMusicVolume: (volume: number) => void;
  syncMusicToClip: () => void;
  setVoiceOver: (voiceOver: StudioVoiceOver | null) => void;
  setRecordingVoice: (recording: boolean) => void;
  splitAtPlayhead: () => void;
  deleteClipById: (clipId: string) => void;
  moveClipById: (clipId: string, direction: 'up' | 'down') => void;
  mergeClips: () => void;
  addTextOverlay: (overlay: Omit<StudioTextOverlay, 'id'>) => void;
  updateTextOverlay: (id: string, patch: Partial<StudioTextOverlay>) => void;
  removeTextOverlay: (id: string) => void;
  setSubtitles: (cues: StudioEditorState['subtitles']) => void;
  setThumbnailTime: (sec: number) => void;
};

const initialState: StudioEditorState = {
  sourceUri: null,
  durationSec: 0,
  trimStartSec: 0,
  trimEndSec: 0,
  playheadSec: 0,
  clips: [],
  originalAudioVolume: 1,
  playbackSpeed: 1,
  selectedMusicId: null,
  selectedMusicTitle: null,
  selectedMusicArtist: null,
  selectedMusicAudioUrl: null,
  selectedMusicDurationSec: 0,
  musicStartSec: 0,
  musicEndSec: 0,
  musicVolume: 0.8,
  voiceOver: null,
  textOverlays: [],
  subtitles: [],
  thumbnailTimeSec: 0,
  activeTool: 'trim',
  toolSheetOpen: false,
  selectedTextOverlayId: null,
  isPlaying: false,
  isRecordingVoice: false,
  exportMode: 'reel',
};

export const useStudioEditorStore = create<StudioEditorState & StudioActions>((set, get) => ({
  ...initialState,

  initProject: (sourceUri, durationSec, exportMode = 'reel') => {
    const { capped: isClipCapped, maxClipSec } = clipCapForMode(exportMode);
    const capped = isClipCapped ? durationSec : Math.min(durationSec, STUDIO_MAX_DURATION_SEC);
    const trimEnd = isClipCapped ? Math.min(maxClipSec, capped) : capped;
    set({
      ...initialState,
      sourceUri,
      durationSec: capped,
      trimStartSec: 0,
      trimEndSec: trimEnd,
      playheadSec: 0,
      clips: createInitialClips(capped),
      thumbnailTimeSec: 0,
      exportMode,
      activeTool: 'trim',
      toolSheetOpen: isClipCapped,
    });
  },

  reset: () => set(initialState),

  setActiveTool: (tool) => set({ activeTool: tool, toolSheetOpen: true }),

  toggleTool: (tool) => {
    const { activeTool, toolSheetOpen } = get();
    if (activeTool === tool && toolSheetOpen) {
      set({ toolSheetOpen: false });
      return;
    }
    set({ activeTool: tool, toolSheetOpen: true });
  },

  closeToolSheet: () => set({ toolSheetOpen: false }),

  setSelectedTextOverlay: (id) => set({ selectedTextOverlayId: id }),

  setTrimStart: (sec) => {
    const { trimEndSec, clips, exportMode, durationSec } = get();
    const { capped: isClipCapped, maxClipSec } = clipCapForMode(exportMode);

    if (isClipCapped) {
      const windowSec = Math.min(trimEndSec - get().trimStartSec, maxClipSec);
      const nextStart = clampTime(sec, 0, Math.max(0, durationSec - windowSec));
      const nextEnd = Math.min(durationSec, nextStart + windowSec);
      const nextClips =
        clips.length === 1 ? [{ ...clips[0], startSec: nextStart, endSec: nextEnd }] : clips;
      set({
        trimStartSec: nextStart,
        trimEndSec: nextEnd,
        playheadSec: clampTime(get().playheadSec, nextStart, nextEnd),
        clips: nextClips,
      });
      get().syncMusicToClip();
      return;
    }

    let nextEnd = trimEndSec;
    const next = clampTime(sec, 0, trimEndSec - 0.5);
    const nextClips =
      clips.length === 1 ? [{ ...clips[0], startSec: next, endSec: nextEnd }] : clips;
    set({
      trimStartSec: next,
      trimEndSec: nextEnd,
      playheadSec: clampTime(get().playheadSec, next, nextEnd),
      clips: nextClips,
    });
    get().syncMusicToClip();
  },

  setTrimEnd: (sec) => {
    const { durationSec, trimStartSec, trimEndSec, clips, exportMode } = get();
    const { capped: isClipCapped, maxClipSec } = clipCapForMode(exportMode);

    if (isClipCapped) {
      const windowSec = Math.min(trimEndSec - trimStartSec, maxClipSec);
      const nextEnd = clampTime(sec, windowSec, durationSec);
      const nextStart = Math.max(0, nextEnd - windowSec);
      const nextClips =
        clips.length === 1 ? [{ ...clips[0], startSec: nextStart, endSec: nextEnd }] : clips;
      set({
        trimStartSec: nextStart,
        trimEndSec: nextEnd,
        playheadSec: clampTime(get().playheadSec, nextStart, nextEnd),
        clips: nextClips,
      });
      get().syncMusicToClip();
      return;
    }

    const next = clampTime(sec, trimStartSec + 0.5, durationSec);
    const nextClips =
      clips.length === 1 ? [{ ...clips[0], startSec: trimStartSec, endSec: next }] : clips;
    set({
      trimEndSec: next,
      playheadSec: clampTime(get().playheadSec, trimStartSec, next),
      clips: nextClips,
    });
    get().syncMusicToClip();
  },

  slideTrimWindow: (startSec) => {
    const { durationSec, trimStartSec, trimEndSec, clips, exportMode } = get();
    const { capped: isClipCapped, maxClipSec } = clipCapForMode(exportMode);
    if (!isClipCapped) return;

    const windowSec = Math.min(trimEndSec - trimStartSec, maxClipSec);
    const nextStart = clampTime(startSec, 0, Math.max(0, durationSec - windowSec));
    const nextEnd = Math.min(durationSec, nextStart + windowSec);
    const nextClips =
      clips.length === 1 ? [{ ...clips[0], startSec: nextStart, endSec: nextEnd }] : clips;
    set({
      trimStartSec: nextStart,
      trimEndSec: nextEnd,
      playheadSec: clampTime(get().playheadSec, nextStart, nextEnd),
      clips: nextClips,
    });
    get().syncMusicToClip();
  },

  setPlayhead: (sec) => {
    const { trimStartSec, trimEndSec } = get();
    set({ playheadSec: clampTime(sec, trimStartSec, trimEndSec) });
  },

  setPlaying: (playing) => set({ isPlaying: playing }),

  setOriginalAudioVolume: (volume) => set({ originalAudioVolume: clampTime(volume, 0, 1) }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setSelectedMusic: (track) => {
    if (!track) {
      set({
        selectedMusicId: null,
        selectedMusicTitle: null,
        selectedMusicArtist: null,
        selectedMusicAudioUrl: null,
        selectedMusicDurationSec: 0,
        musicStartSec: 0,
        musicEndSec: 0,
      });
      return;
    }

    const { trimStartSec, trimEndSec } = get();
    const clipDuration = Math.max(0.5, trimEndSec - trimStartSec);
    const musicStartSec = 0;
    const musicEndSec = computeMusicEnd(musicStartSec, clipDuration, track.durationSec);

    set({
      selectedMusicId: track.id,
      selectedMusicTitle: track.displayTitle,
      selectedMusicArtist: track.artist,
      selectedMusicAudioUrl: track.audioUrl,
      selectedMusicDurationSec: track.durationSec,
      musicStartSec,
      musicEndSec,
      originalAudioVolume: 0,
      isPlaying: false,
    });
  },

  setMusicStartSec: (sec) => {
    const state = get();
    if (!state.selectedMusicId) return;
    const clipDuration = Math.max(0.5, state.trimEndSec - state.trimStartSec);
    const maxStart = Math.max(0, state.selectedMusicDurationSec - clipDuration);
    const musicStartSec = clampTime(sec, 0, maxStart);
    set({
      musicStartSec,
      musicEndSec: computeMusicEnd(musicStartSec, clipDuration, state.selectedMusicDurationSec),
    });
  },

  syncMusicToClip: () => {
    const state = get();
    if (!state.selectedMusicId) return;
    const clipDuration = Math.max(0.5, state.trimEndSec - state.trimStartSec);
    const maxStart = Math.max(0, state.selectedMusicDurationSec - clipDuration);
    const musicStartSec = clampTime(state.musicStartSec, 0, maxStart);
    set({
      musicStartSec,
      musicEndSec: computeMusicEnd(musicStartSec, clipDuration, state.selectedMusicDurationSec),
    });
  },

  setMusicVolume: (volume) => set({ musicVolume: clampTime(volume, 0, 1) }),

  setVoiceOver: (voiceOver) => set({ voiceOver }),

  setRecordingVoice: (recording) => set({ isRecordingVoice: recording }),

  splitAtPlayhead: () => {
    const { clips, playheadSec } = get();
    set({ clips: splitClipAt(clips, playheadSec) });
  },

  deleteClipById: (clipId) => {
    const { clips } = get();
    set({ clips: deleteClip(clips, clipId) });
  },

  moveClipById: (clipId, direction) => {
    const { clips } = get();
    set({ clips: moveClip(clips, clipId, direction) });
  },

  mergeClips: () => {
    const { clips } = get();
    set({ clips: mergeAdjacentClips(clips) });
  },

  addTextOverlay: (overlay) => {
    const id = generateId('text');
    set((state) => ({
      textOverlays: [...state.textOverlays, { ...overlay, id }],
      selectedTextOverlayId: id,
      activeTool: 'text',
      toolSheetOpen: true,
    }));
  },

  updateTextOverlay: (id, patch) => {
    set((state) => ({
      textOverlays: state.textOverlays.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  },

  removeTextOverlay: (id) => {
    set((state) => ({
      textOverlays: state.textOverlays.filter((item) => item.id !== id),
      selectedTextOverlayId: state.selectedTextOverlayId === id ? null : state.selectedTextOverlayId,
    }));
  },

  setSubtitles: (cues) => set({ subtitles: cues }),

  setThumbnailTime: (sec) => {
    const { trimStartSec, trimEndSec } = get();
    set({ thumbnailTimeSec: clampTime(sec, trimStartSec, trimEndSec) });
  },
}));
