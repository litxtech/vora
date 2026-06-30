import type { VctsContentType, VctsTrustStatus } from '@/features/vcts/constants';

export type ContentAssetRecord = {
  storagePath: string | null;
  mediaUrl: string | null;
  sha256: string;
  assetIndex: number;
  watermarkVersion: number;
};

export type ContentTrustRecord = {
  id: string;
  postId: string;
  trustCode: string;
  publisherKey: string;
  authorId: string;
  contentHash: string;
  contentType: VctsContentType;
  status: VctsTrustStatus;
  createdAt: string;
};

export type VctsVerificationResult = {
  found: boolean;
  status: VctsTrustStatus | 'not_found';
  trustCode?: string;
  publisherKey?: string;
  contentHash?: string;
  contentType?: VctsContentType;
  hashMatch?: boolean;
  authorUsername?: string;
  authorId?: string;
  postId?: string;
  createdAt?: string;
  postCreatedAt?: string;
  verified?: boolean;
  message?: string;
};

export type AttestationInput = {
  postId: string;
  authorId: string;
  publisherKey: string;
  contentHash: string;
  contentType: VctsContentType;
  assets: ContentAssetRecord[];
  timestamp: string;
  textContent: string;
};
