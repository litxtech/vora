import type { RegionId } from '@/constants/regions';

export type CityDiplomacyRequestType =
  | 'leader_call'
  | 'joint_room'
  | 'joint_council'
  | 'cooperation'
  | 'challenge';

export type CityDiplomacyStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export type CityDiplomacyRequest = {
  id: string;
  fromRegionId: RegionId;
  toRegionId: RegionId;
  fromRegionName: string;
  toRegionName: string;
  fromLeaderUserId: string;
  toLeaderUserId: string;
  fromLeaderUsername: string;
  toLeaderUsername: string;
  fromLeaderName: string | null;
  toLeaderName: string | null;
  fromLeaderAvatarUrl: string | null;
  requestType: CityDiplomacyRequestType;
  title: string | null;
  message: string | null;
  status: CityDiplomacyStatus;
  callSessionId: string | null;
  voiceRoomId: string | null;
  createdAt: string;
  respondedAt: string | null;
};

export const DIPLOMACY_REQUEST_LABELS: Record<CityDiplomacyRequestType, string> = {
  leader_call: 'Lider Görüşmesi',
  joint_room: 'Ortak Oda',
  joint_council: 'Ortak Meclis',
  cooperation: 'İş Birliği',
  challenge: 'Meydan Okuma',
};
