import type { GenderId } from '@/constants/registration';

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'location'
  | 'file'
  | 'shared_post'
  | 'shared_reel'
  | 'shared_profile'
  | 'shared_marketplace_listing'
  | 'shared_job_listing'
  | 'shared_staff_listing'
  | 'shared_vora_need'
  | 'call';

export type SharedCardMetadata = {
  cardType: 'post' | 'reel' | 'profile' | 'marketplace_listing' | 'vora_need' | 'job_listing' | 'staff_listing';
  targetId: string;
  title?: string | null;
  preview?: string | null;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export type CallLogMetadata = {
  callSessionId: string;
  callType: 'audio' | 'video';
  status: 'ended' | 'missed' | 'declined' | 'cancelled';
  callerId: string;
  calleeId: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
};

export type EphemeralImageMetadata = {
  ephemeral: true;
  durationSec: number;
  viewedAt?: string | null;
  expired?: boolean;
};

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MediaUploadStage = 'compressing' | 'uploading' | 'sending';

export type ConversationType = 'direct' | 'group';

export type ConversationMemberRole = 'member' | 'moderator' | 'admin' | 'founder';

export type ConversationMember = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: ConversationMemberRole;
  joinedAt: string;
};

export type ChatActivity = 'typing' | 'recording' | 'picking_photo' | 'picking_video';

export type MessagingParticipant = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  account_status?: 'active' | 'frozen' | 'deletion_pending' | 'deleted';
  is_verified?: boolean;
  is_platform_charm?: boolean;
  is_pioneer?: boolean;
  is_platform_supporter?: boolean;
  gender?: GenderId | null;
  last_seen_at?: string | null;
  is_online?: boolean | null;
  last_active_at?: string | null;
};

export type ConversationListItem = {
  id: string;
  type: ConversationType;
  title: string | null;
  avatarUrl: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  otherUser: MessagingParticipant | null;
  unreadCount: number;
  memberCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  mutedUntil: string | null;
};

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  messageType: MessageType;
  replyToId: string | null;
  forwardedFromId?: string | null;
  forwardedFrom?: Pick<ChatMessage, 'id' | 'content' | 'senderId' | 'messageType' | 'sender'>;
  editedAt: string | null;
  deletedForAll: boolean;
  isRead: boolean;
  createdAt: string;
  sender?: MessagingParticipant;
  replyTo?: Pick<ChatMessage, 'id' | 'content' | 'senderId' | 'messageType' | 'sender'>;
  reactions?: MessageReactionSummary[];
  metadata?: SharedCardMetadata | CallLogMetadata | EphemeralImageMetadata | null;
  /** Yalnızca istemci tarafı — sunucuya yazılmadan önce */
  localStatus?: MessageDeliveryStatus;
  localOnly?: boolean;
  queued?: boolean;
  /** Yükleme sırasında yerel dosya önizlemesi */
  localMediaUri?: string | null;
  uploadStage?: MediaUploadStage;
  uploadProgress?: number;
  uploadEtaSec?: number;
};

export type ConversationDetail = {
  id: string;
  type: ConversationType;
  title: string | null;
  avatarUrl: string | null;
  otherUser: MessagingParticipant | null;
  /** Karşı tarafın son okuma zamanı — gönderilen mesaj tikleri için */
  otherLastReadAt: string | null;
  members: ConversationMember[];
  memberCount: number;
  myRole: ConversationMemberRole | null;
};

export type MessagesTab = 'chats' | 'channels' | 'requests' | 'contacts' | 'friends' | 'calls';

export type CallHistoryItem = {
  id: string;
  callType: 'audio' | 'video';
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  otherUser: MessagingParticipant;
  isOutgoing: boolean;
};

export type ComposerAttachmentPreview =
  | { type: 'image'; uris: string[] }
  | { type: 'video'; uri: string; durationSec?: number };

export type ChatLocationPayload = {
  latitude: number;
  longitude: number;
  label?: string;
  street?: string;
  district?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  accuracy?: number;
};

export type ChatLocationViewContext = {
  sharedAt?: string;
  senderName?: string;
};
