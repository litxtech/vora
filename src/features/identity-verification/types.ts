import type { IdentityDocumentType, IdentityVerificationStatus } from '@/features/identity-verification/constants';

export type IdentityVerificationRequest = {
  id: string;
  userId: string;
  status: IdentityVerificationStatus;
  documentType: IdentityDocumentType;
  fullName: string;
  birthDate: string | null;
  idFrontPath: string;
  idBackPath: string | null;
  selfiePath: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type PickedImage = {
  uri: string;
  name: string;
};

export type SubmitIdentityVerificationInput = {
  documentType: IdentityDocumentType;
  fullName: string;
  birthDate: string | null;
  idFront: PickedImage;
  idBack: PickedImage | null;
  selfie: PickedImage;
};
