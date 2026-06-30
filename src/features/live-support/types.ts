export type LiveSupportTopic =
  | 'account'
  | 'billing'
  | 'technical'
  | 'general'
  | 'app_bug'
  | 'report'
  | 'other';

export type LiveSupportStatus =
  | 'open'
  | 'waiting_user'
  | 'waiting_support'
  | 'resolved'
  | 'closed'
  | 'no_response';

export type LiveSupportMessageType = 'text' | 'image' | 'video';

export type LiveSupportThread = {
  id: string;
  user_id: string;
  subject: string;
  topic: LiveSupportTopic | null;
  status: LiveSupportStatus;
  user_unread_count: number;
  support_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  session_expires_at?: string | null;
  username?: string;
  full_name?: string | null;
};

export type LiveSupportMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  message_type?: LiveSupportMessageType;
  media_url?: string | null;
  created_at: string;
  sender_username?: string;
  sender_full_name?: string | null;
  sender_avatar_url?: string | null;
  sender_account_status?: 'active' | 'frozen' | 'deletion_pending' | 'deleted';
  is_staff?: boolean;
};
