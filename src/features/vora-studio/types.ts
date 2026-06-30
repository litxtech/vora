export type StudioTool =
  | 'trim'
  | 'split'
  | 'audio'
  | 'music'
  | 'voiceover'
  | 'text'
  | 'thumbnail'
  | 'subtitles';

export type StudioExportMode = 'reel' | 'post' | 'standalone' | 'live-support';

export type TextAnimation = 'none' | 'fade' | 'slide' | 'pop';

export type StudioClip = {
  id: string;
  startSec: number;
  endSec: number;
  order: number;
};

export type StudioTextOverlay = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  startSec: number;
  endSec: number;
  animation: TextAnimation;
};

export type StudioSubtitleCue = {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
};

export type StudioMusicTrack = {
  id: string;
  title: string;
  category: string;
  uri: string;
  durationSec: number;
  license: string;
};

export type StudioVoiceOver = {
  uri: string;
  startSec: number;
  durationSec: number;
};

export type StudioWatermarkMeta = {
  username: string;
  postId?: string | null;
  publisherKeyHash?: string | null;
  contentHash?: string | null;
  version: number;
};

/** Paylaşılan içerikte istemci tarafında render edilen studio düzenlemesi */
export type PublishedEditManifest = {
  version: 1;
  textOverlays: StudioTextOverlay[];
  trimStartSec: number;
  trimEndSec: number;
};

export type StudioEditManifest = {
  version: 1;
  sourceUri: string;
  durationSec: number;
  trimStartSec: number;
  trimEndSec: number;
  clips: StudioClip[];
  originalAudioVolume: number;
  playbackSpeed: number;
  musicTrackId: string | null;
  musicStartSec: number;
  musicEndSec: number;
  musicVolume: number;
  voiceOver: StudioVoiceOver | null;
  textOverlays: StudioTextOverlay[];
  subtitles: StudioSubtitleCue[];
  thumbnailTimeSec: number;
  watermark: StudioWatermarkMeta;
  ffmpegCommands: string[];
};

export type StudioExportResult = {
  outputUri: string;
  manifest: StudioEditManifest;
  jobId: string | null;
  thumbnailUri: string | null;
};

export type StudioEditorState = {
  sourceUri: string | null;
  durationSec: number;
  trimStartSec: number;
  trimEndSec: number;
  playheadSec: number;
  clips: StudioClip[];
  originalAudioVolume: number;
  playbackSpeed: number;
  selectedMusicId: string | null;
  selectedMusicTitle: string | null;
  selectedMusicArtist: string | null;
  selectedMusicAudioUrl: string | null;
  selectedMusicDurationSec: number;
  musicStartSec: number;
  musicEndSec: number;
  musicVolume: number;
  voiceOver: StudioVoiceOver | null;
  textOverlays: StudioTextOverlay[];
  subtitles: StudioSubtitleCue[];
  thumbnailTimeSec: number;
  activeTool: StudioTool;
  toolSheetOpen: boolean;
  selectedTextOverlayId: string | null;
  isPlaying: boolean;
  isRecordingVoice: boolean;
  exportMode: StudioExportMode;
};
