export type ProximityMatchCandidate = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  distanceM: number;
};

export type ProximityMatchDecisionStatus =
  | 'matched'
  | 'waiting'
  | 'declined'
  | 'cooldown'
  | 'already_matched'
  | 'already_decided';

export type ProximityMatchDecisionResult = {
  status: ProximityMatchDecisionStatus;
  otherUserId: string;
};

export type ProximityMatchedUser = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  matchedAt: string;
};
