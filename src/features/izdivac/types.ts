import type { GenderId } from '@/constants/registration';

export type IzdivacGenderTab = 'women' | 'men';

export type IzdivacMainTab = 'members' | 'wall' | 'spaces' | 'messages';

export type IzdivacPostKind = 'share' | 'invite' | 'media';

export type IzdivacSpaceType = 'open' | 'invite_only' | 'plan';

export type IzdivacSpaceAudience = 'all_members' | 'opposite_gender' | 'invited_only';

export type IzdivacInviteMeta = {
  when?: string | null;
  where?: string | null;
  activity?: string | null;
};

export type IzdivacSpecialBadgeType = 'jigolo' | 'tilki' | 'finansman';

export type IzdivacBadgeVisibility = 'izdivac' | 'app' | 'both';

export type IzdivacParticipant = {
  userId: string;
  firstName: string;
  lastName: string | null;
  ageYears: number | null;
  gender: GenderId;
  isOnline: boolean;
  inLobby: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  specialBadges: IzdivacSpecialBadgeType[];
};

export type IzdivacLobbyState = {
  women: IzdivacParticipant[];
  men: IzdivacParticipant[];
};

export type IzdivacProfile = {
  userId: string;
  headline: string | null;
  lookingFor: string | null;
  aboutMe: string | null;
  showOnWall: boolean;
};

export type IzdivacPost = {
  postId: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string | null;
  authorAvatarUrl: string | null;
  kind: IzdivacPostKind;
  body: string;
  mediaUrls: string[];
  inviteMeta: IzdivacInviteMeta | null;
  spaceId: string | null;
  likeCount: number;
  commentCount: number;
  joinCount: number;
  likedByMe: boolean;
  joinedByMe: boolean;
  createdAt: string;
  authorSpecialBadges: IzdivacSpecialBadgeType[];
};

export type IzdivacPostComment = {
  commentId: string;
  parentCommentId: string | null;
  authorId: string;
  authorFirstName: string;
  authorAvatarUrl: string | null;
  body: string;
  isEdited: boolean;
  createdAt: string;
  replies?: IzdivacPostComment[];
};

export type IzdivacSpace = {
  spaceId: string;
  conversationId: string;
  title: string;
  description: string | null;
  spaceType: IzdivacSpaceType;
  audience: IzdivacSpaceAudience;
  memberCount: number;
  createdBy: string;
  creatorFirstName: string;
  creatorAvatarUrl: string | null;
  linkedPostId: string | null;
  isMember: boolean;
  lastActivityAt: string;
};

export type IzdivacConversationItem = {
  conversationId: string;
  conversationType: 'direct' | 'group';
  title: string | null;
  avatarUrl: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  otherUserId: string | null;
  otherUsername: string | null;
  otherFullName: string | null;
  otherAvatarUrl: string | null;
  unreadCount: number;
  memberCount: number;
  linkType: 'direct' | 'space';
  spaceId: string | null;
};

export type AdminIzdivacUserRow = {
  userId: string;
  username: string;
  fullName: string | null;
  gender: GenderId | null;
  birthDate: string | null;
  izdivacAccessGranted: boolean;
  isOnline: boolean;
  inLobby: boolean;
  grantedAt: string;
};

/** @deprecated Use IzdivacGenderTab */
export type IzdivacTab = IzdivacGenderTab;
