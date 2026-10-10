export type AiMusicStyle = 'kaval' | 'kemence' | 'horon' | 'tulum' | 'karma' | 'serbest';
export type AiMusicStatus = 'generating' | 'ready' | 'published' | 'failed' | 'removed';
export type AiMusicVocal = 'instrumental' | 'female' | 'male';
export type AiMusicShareKind = 'post' | 'reel' | 'story';
export type AiMusicReferenceKind = 'audio' | 'video';
export type AiMusicReferenceSource = 'recording' | 'upload';

export type AiMusicWork = {
  id: string;
  authorId: string;
  title: string;
  prompt: string;
  style: AiMusicStyle;
  durationSec: number;
  instrumental: boolean;
  vocal: AiMusicVocal;
  lyrics: string | null;
  status: AiMusicStatus;
  stage: string;
  progress: number;
  audioUrl: string | null;
  coverUrl: string | null;
  coverStoragePath: string | null;
  soundId: string | null;
  musicTrackId: string | null;
  copyrightCode: string;
  rightsHolder: string;
  rightsNotice: string;
  referenceName: string | null;
  referenceKind: AiMusicReferenceKind | null;
  errorMessage: string | null;
  accountUsageCount: number;
  shareCount: number;
  approvedAt: string | null;
  createdAt: string;
};

export type AiMusicBalance = {
  grantedSec: number;
  reservedSec: number;
  spentSec: number;
  availableSec: number;
};

export type AiMusicGrant = {
  seconds: number;
  source: 'free' | 'purchase' | 'admin';
  packageId: string | null;
  amountMinor: number | null;
  note: string | null;
  createdAt: string;
};

export type AiMusicAdminAccount = AiMusicBalance & {
  userId: string;
  username: string | null;
  fullName: string | null;
  grants: AiMusicGrant[];
};

export type AiMusicShare = {
  kind: AiMusicShareKind;
  contentId: string;
  authorId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  caption: string;
  thumbUrl: string | null;
  createdAt: string;
};

export type GenerateAiMusicInput = {
  title?: string;
  prompt: string;
  style: AiMusicStyle;
  durationSec: number;
  vocal: AiMusicVocal;
  lyrics?: string;
  referenceStoragePath?: string | null;
  referenceName?: string | null;
  referenceKind?: AiMusicReferenceKind | null;
  referenceSource?: AiMusicReferenceSource | null;
  referenceDurationSec?: number | null;
};
