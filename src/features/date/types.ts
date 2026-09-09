import type { GenderId } from '@/constants/registration';

export type DateStatus = 'open' | 'full' | 'completed' | 'cancelled';

export type DateJoinStatus = 'pending' | 'approved' | 'declined' | 'withdrawn';

export type DateSoughtGender = 'female' | 'male' | 'any' | 'mixed';

export type DateCenterTab = 'discover' | 'mine' | 'requests';

export type DateParticipant = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  gender: GenderId | null;
  isCreator?: boolean;
};

export type DateOuting = {
  id: string;
  creatorId: string;
  title: string;
  activity: string;
  destination: string;
  lookingFor: string;
  category: string | null;
  organizerCount: number;
  seekingCount: number;
  approvedCount: number;
  soughtGender: DateSoughtGender;
  scheduledAt: string | null;
  description: string | null;
  status: DateStatus;
  regionId: string | null;
  createdAt: string;
  organizers: DateParticipant[];
  approvedMembers: DateParticipant[];
  conversationId: string | null;
  myPendingRequestId: string | null;
  isOrganizer: boolean;
  isApprovedMember: boolean;
};

export type DateJoinRequest = {
  id: string;
  outingId: string;
  requesterId: string;
  requester: DateParticipant;
  companion: DateParticipant | null;
  message: string | null;
  seatsRequested: number;
  status: DateJoinStatus;
  createdAt: string;
  outingTitle?: string;
};

export type CreateDateInput = {
  title: string;
  activity: string;
  destination: string;
  lookingFor: string;
  organizerCount: number;
  seekingCount: number;
  soughtGender: DateSoughtGender;
  category?: string | null;
  scheduledAt?: string | null;
  description?: string | null;
  regionId?: string | null;
  organizerUserIds?: string[];
};
