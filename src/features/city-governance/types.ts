import type { RegionId } from '@/constants/regions';

export type CityMembershipRole = 'citizen' | 'council_member' | 'deputy' | 'leader';

export type CityMembershipStatus = 'active' | 'suspended' | 'left';

export type CityGovernanceStatus = 'active' | 'passive' | 'coming_soon';

export type CityLeaderSummary = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  regionId: RegionId;
  regionName: string;
};

export type CityCouncilSummary = {
  memberCount: number;
  openAgendaCount: number;
  votingCount: number;
};

export type CityOverview = {
  id: RegionId;
  slug: string;
  name: string;
  countryCode: string;
  regionLabel: string;
  description: string | null;
  coverImageUrl: string | null;
  iconUrl: string | null;
  memberCount: number;
  activeCount: number;
  governanceStatus: CityGovernanceStatus;
  leader: CityLeaderSummary | null;
  council: CityCouncilSummary;
  activeElection: CityElectionSummary | null;
  isMember: boolean;
  myRole: CityMembershipRole | null;
  myMembershipStatus: CityMembershipStatus | null;
  isPrimaryCity: boolean;
};

export type CityMembership = {
  id: string;
  regionId: RegionId;
  userId: string;
  role: CityMembershipRole;
  status: CityMembershipStatus;
  joinedAt: string;
};

export type CityElectionStatus =
  | 'scheduled'
  | 'nomination'
  | 'voting'
  | 'counting'
  | 'completed'
  | 'cancelled';

export type CityElectionCandidateStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type CityElectionSummary = {
  id: string;
  regionId: RegionId;
  title: string;
  description: string | null;
  status: CityElectionStatus;
  startsAt: string;
  nominationEndsAt: string;
  votingStartsAt: string;
  endsAt: string;
};

export type CityElectionCandidate = {
  id: string;
  electionId: string;
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  statement: string | null;
  status: CityElectionCandidateStatus;
  voteCount: number;
  isMe: boolean;
};

export type CityElectionDetail = CityElectionSummary & {
  regionName: string;
  regionSlug: string;
  candidates: CityElectionCandidate[];
  myVoteCandidateUserId: string | null;
  myCandidacy: CityElectionCandidate | null;
  canVote: boolean;
  canApply: boolean;
  isEligible: boolean;
};

export type CityLeadershipTerm = {
  id: string;
  regionId: RegionId;
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  startedAt: string;
  endedAt: string | null;
  status: 'active' | 'completed' | 'removed';
};

export type CityHistoryEvent = {
  id: string;
  regionId: RegionId;
  eventType: string;
  title: string;
  description: string | null;
  occurredAt: string;
};
