import type { FeedAuthor } from '@/features/feed/types';

export type IncidentUpdate = {
  id: string;
  incidentId: string;
  author: FeedAuthor;
  updateType: 'initial' | 'update' | 'photo' | 'video' | 'verification';
  content: string;
  mediaUrls: string[];
  createdAt: string;
};

export type IncidentVerification = {
  id: string;
  verifier: FeedAuthor;
  note: string | null;
  createdAt: string;
};

export type IncidentThread = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  regionId: string;
  latitude: number | null;
  longitude: number | null;
  mediaUrls: string[];
  reporter: FeedAuthor;
  createdAt: string;
  updates: IncidentUpdate[];
  verifications: IncidentVerification[];
  verificationCount: number;
  isDemo?: boolean;
};
