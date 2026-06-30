import type { ReportReason, UserRole } from '@/types/database';

export type ReportQueueStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';
export type BanDuration = 'hours_24' | 'days_7' | 'days_30' | 'permanent';
export type BroadcastType = 'system' | 'emergency' | 'update';
export type RevenueType = 'premium_business' | 'sponsored_content' | 'job_listing' | 'advertisement';

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  daily_registrations: number;
  daily_posts: number;
  daily_comments: number;
  daily_messages: number;
  pending_reports: number;
  pending_verifications: number;
  pending_identity_verifications: number;
  pending_reporter_apps: number;
  pending_ads: number;
  pending_appeals: number;
  pending_tips: number;
  disputed_vcts: number;
  pending_post_verifications: number;
  ai_review_queue: number;
  pending_support_tickets: number;
}

export interface AdminUserRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  account_status: 'active' | 'frozen' | 'quarantined' | 'deletion_pending' | 'deleted';
  trust_score: number;
  is_premium: boolean;
  is_verified?: boolean;
  region_id: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_active_at?: string | null;
  is_online?: boolean;
  report_count?: number;
}

export interface ContentReportRow {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportQueueStatus;
  priority: number;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  reporter?: { username: string; full_name: string | null };
}

export interface ModerationLogRow {
  id: string;
  moderator_id: string;
  target_type: string;
  target_id: string;
  action: string;
  reason: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  moderator?: { username: string; full_name: string | null };
  moderator_username?: string | null;
}

export interface BusinessApprovalRow {
  id: string;
  name: string;
  category: string;
  owner_id: string;
  region_id: string;
  registration_status: 'pending' | 'approved' | 'rejected';
  is_verified: boolean;
  document_urls: string[];
  created_at: string;
  owner?: { username: string; full_name: string | null };
}

export interface AdminStatisticsOverview {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  guest_users: number;
  premium_users: number;
  reporter_users: number;
  verified_businesses: number;
  total_businesses: number;
  total_posts: number;
  published_posts: number;
  total_reels: number;
  published_reels: number;
  total_comments: number;
  total_messages: number;
  total_conversations: number;
  total_communities: number;
  total_channels: number;
  total_events: number;
  total_jobs: number;
  total_follows: number;
  total_hashtags: number;
}

export interface AdminStatisticsDaily {
  registrations: number;
  posts: number;
  reels: number;
  comments: number;
  messages: number;
  reports: number;
  new_follows: number;
}

export interface AdminStatisticsWeekly {
  registrations: number;
  posts: number;
  reels: number;
  active_users: number;
}

export interface AdminStatisticsModeration {
  pending_reports: number;
  pending_verifications: number;
  pending_identity_verifications: number;
  pending_reporter_apps: number;
  pending_ads: number;
  pending_appeals: number;
  pending_tips: number;
  disputed_vcts: number;
  pending_post_verifications: number;
  ai_review_queue: number;
  pending_support_tickets: number;
}

export interface AdminStatistics {
  generated_at?: string;
  overview?: AdminStatisticsOverview;
  daily?: AdminStatisticsDaily;
  weekly?: AdminStatisticsWeekly;
  moderation?: AdminStatisticsModeration;
  top_cities: { name: string; user_count: number; percentage?: number }[];
  top_users: {
    id: string;
    username: string;
    full_name: string | null;
    contribution_score: number;
    post_count?: number;
    follower_count?: number;
  }[];
  top_posts: {
    id: string;
    title: string | null;
    content: string;
    view_count: number;
    like_count?: number;
    comment_count?: number;
    author_username: string;
  }[];
  top_reels?: {
    id: string;
    caption: string | null;
    view_count: number;
    like_count: number;
    comment_count: number;
    author_username: string;
  }[];
  top_categories: { category: string; post_count: number; percentage?: number }[];
  top_hashtags?: { tag: string; usage_count: number }[];
}

export interface RevenueSummary {
  total_revenue: number;
  by_type: Record<string, number>;
  platform_contributions_total?: number;
  premium_businesses: number;
  premium_users: number;
  stripe_subscriptions_active?: number;
}
