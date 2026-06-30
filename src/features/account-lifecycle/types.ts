import type { LifecycleRequestType } from '@/features/account-lifecycle/constants';

export type AccountLifecycleStats = {
  total_accounts: number;
  active_accounts: number;
  frozen_accounts: number;
  deletion_pending_accounts: number;
  deleted_accounts: number;
  opened_today: number;
  opened_this_month: number;
  deleted_this_month: number;
  pending_requests: number;
};

export type AccountLifecycleAccountRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  account_status: string;
  created_at: string;
  deletion_requested_at: string | null;
  deleted_at: string | null;
  last_seen_at: string | null;
};

export type AccountLifecycleRequestRow = {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  request_type: LifecycleRequestType;
  account_status_snapshot: string;
  current_account_status: string;
  message: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'closed';
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  profile_created_at: string;
  deletion_requested_at: string | null;
  deleted_at: string | null;
};
