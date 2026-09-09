export type CapStatus = 'published' | 'hidden' | 'removed';
export type CapLibrarySource = 'created' | 'market';
export type CapSourceKind = 'photo' | 'local_video' | 'vora_video';

export type CapOverlayStyle = {
  topText?: string;
  bottomText?: string;
  fontFamily?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  effect?: 'none' | 'shadow' | 'neon' | 'outline';
  position?: 'center' | 'top' | 'bottom';
  emoji?: string;
};

export type CapCreator = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type Cap = {
  id: string;
  creatorId: string;
  title: string | null;
  imageUrl: string;
  thumbUrl: string | null;
  /** Kısa caps videosu veya Vora playback URL. */
  videoUrl: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  sourceKind?: CapSourceKind | null;
  sourceVideoId?: string | null;
  startMs?: number | null;
  endMs?: number | null;
  overlay?: CapOverlayStyle | null;
  status: CapStatus;
  uniqueUserCount: number;
  libraryCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  creator?: CapCreator;
  inLibrary?: boolean;
  librarySource?: CapLibrarySource | null;
};

export type CapUsageRow = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  firstUsedAt: string;
  lastUsedAt: string;
};

export type CapMessageMetadata = {
  kind: 'cap';
  capId: string;
  imageUrl: string;
  videoUrl: string | null;
  thumbUrl: string | null;
  width?: number | null;
  height?: number | null;
  startMs?: number | null;
  endMs?: number | null;
  overlay?: CapOverlayStyle | null;
  creatorId: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
};

export type CapPickerTabId = 'library' | 'market' | 'mine';
export type CapsCenterTabId = 'discover' | 'library' | 'mine' | 'creators';
export type CapsDiscoverSort = 'trending' | 'new' | 'popular';
export type CapMediaKind = 'image' | 'video';
export type CapsStudioClipLengthSec = 3 | 5 | 10;

export type CapsStudioSource =
  | {
      kind: 'photo';
      localUri: string;
      width?: number | null;
      height?: number | null;
    }
  | {
      kind: 'local_video';
      localUri: string;
      durationMs: number;
      width?: number | null;
      height?: number | null;
    }
  | {
      kind: 'vora_video';
      videoId: string;
      playbackUrl: string;
      playbackId: string;
      thumbnailUrl: string | null;
      durationMs: number;
      title?: string | null;
    };

export type CapVoraVideoOption = {
  videoId: string;
  playbackId: string;
  playbackUrl: string;
  thumbnailUrl: string | null;
  durationMs: number;
  title: string | null;
  createdAt: string;
};

export type CapCreatorRank = {
  creatorId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  capsCount: number;
  totalUniqueUsers: number;
  totalLibrarySaves: number;
  rank: number;
};

export type CommentCapInfo = {
  id: string;
  imageUrl: string;
  videoUrl?: string | null;
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
  startMs?: number | null;
  endMs?: number | null;
  overlay?: CapOverlayStyle | null;
  creator: CapCreator;
};
