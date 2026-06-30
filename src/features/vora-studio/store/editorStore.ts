import { create } from 'zustand';
import { LIVE_SUPPORT_CLIP_MAX_SEC, STUDIO_MAX_DURATION_SEC } from '@/features/vora-studio/constants';
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

type StudioActions = {
  initProject: (sourceUri: string, durationSec: number, exportMode?: StudioExportMode) => void;
  reset: () => void;
  setActiveTool: (tool: StudioTool) => void;
  toggleTool: (tool: StudioTool) => void;
  closeToolSheet: () => void;
  setSelectedTextOverlay: (id: string | null) => void;
  setTrimStart: (sec: number) => void;
  setTrimEnd: (sec: number) => void;
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
    const isLiveSupport = exportMode === 'live-support';
    const capped = isLiveSupport ? durationSec : Math.min(durationSec, STUDIO_MAX_DURATION_SEC);
    const trimEnd = isLiveSupport
      ? Math.min(LIVE_SUPPORT_CLIP_MAX_SEC, capped)
      : capped;
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
      toolSheetOpen: isLiveSupport,
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
    let nextEnd = trimEndSec;
    let next = clampTime(sec, 0, trimEndSec - 0.5);
    if (exportMode === 'live-support' && nextEnd - next > LIVE_SUPPORT_CLIP_MAX_SEC) {
      nextEnd = Math.min(durationSec, next + LIVE_SUPPORT_CLIP_MAX_SEC);
    }
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
    const { durationSec, trimStartSec, clips, exportMode } = get();
    let next = clampTime(sec, trimStartSec + 0.5, durationSec);
    if (exportMode === 'live-support' && next - trimStartSec > LIVE_SUPPORT_CLIP_MAX_SEC) {
      next = Math.min(durationSec, trimStartSec + LIVE_SUPPORT_CLIP_MAX_SEC);
    }
    const nextClips =
      clips.length === 1 ? [{ ...clips[0], startSec: trimStartSec, endSec: next }] : clips;
    set({
      trimEndSec: next,
      playheadSec: clampTime(get().playheadSec, trimStartSec, next),
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
