export type SupportTicketCategory = 'account' | 'billing' | 'technical' | 'general';

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export type SupportTicketRow = {
  id: string;
  user_id: string;
  username?: string;
  full_name?: string | null;
  category: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  admin_note: string | null;
  lifecycle_request_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type SupportTicketUserContext = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  account_status: string;
  role: string;
  trust_score: number;
  is_premium: boolean;
  is_guest: boolean;
  region_id: string | null;
  created_at: string;
  last_seen_at: string | null;
  deletion_requested_at: string | null;
  deleted_at: string | null;
  email: string | null;
  report_count?: number;
};

export type LinkedLifecycleRequest = {
  id: string;
  request_type: string;
  message: string;
  status: string;
  account_status_snapshot: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type AdminSupportTicketDetail = SupportTicketRow & {
  user: SupportTicketUserContext;
  lifecycle_request: LinkedLifecycleRequest | null;
  kuru_balance: number;
};
