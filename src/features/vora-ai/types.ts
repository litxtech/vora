import type { VoraAiModuleId, VoraAiPostActionId, VoraAiReelActionId } from '@/features/vora-ai/constants';

export type VoraAiSettingsMap = Record<VoraAiModuleId, boolean>;

export type VoraAiInvokePayload = {
  action: string;
  module: VoraAiModuleId;
  context?: Record<string, unknown>;
};

export type VoraAiResponse = {
  text: string;
  provider: string;
  items?: VoraAiResultItem[];
  cached?: boolean;
  commentPosted?: boolean;
  commentId?: string;
};

export type VoraAiResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
};

export type VoraAiMapOverlayPoint = {
  id: string;
  latitude: number;
  longitude: number;
  dataType: 'trend' | 'density' | 'live_event' | 'news_pin';
  label: string;
  intensity?: number;
  color?: string;
};

export type VoraAiCommentMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type VoraAiPostContext = {
  postId: string;
  title?: string | null;
  content: string;
  category?: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  regionId?: string;
  mediaUrls?: string[];
  postAsComment?: boolean;
};

export type VoraAiReelContext = {
  reelId: string;
  caption: string;
  locationLabel?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  regionId?: string;
  mediaUrls?: string[];
  playbackId?: string | null;
  thumbnailUrl?: string | null;
  postAsComment?: boolean;
};

export type VoraAiActionRequest =
  | { module: 'posts'; action: VoraAiPostActionId; context: VoraAiPostContext }
  | { module: 'reels'; action: VoraAiReelActionId; context: VoraAiReelContext }
  | { module: 'map'; action: 'nearby'; context: { latitude: number; longitude: number; category?: string } }
  | { module: 'events'; action: string; context: { regionId?: string; latitude?: number; longitude?: number } }
  | { module: 'comments'; action: 'ask' | 'observe'; context: { postId?: string; reelId?: string; question?: string; mediaUrls?: string[]; postAsComment?: boolean } }
  | { module: 'news'; action: 'digest'; context: { regionId?: string } }
  | { module: 'recommendations'; action: 'personal'; context: { regionId?: string } }
  | { module: 'trends'; action: 'detect'; context: { regionId?: string } };
