export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type UserRole =
  | 'user'
  | 'verified_reporter'
  | 'moderator'
  | 'admin'
  | 'super_admin';

export type ContentStatus = 'draft' | 'published' | 'hidden' | 'removed';

export type PostCategory =
  | 'general'
  | 'news'
  | 'emergency'
  | 'traffic'
  | 'event'
  | 'job'
  | 'business'
  | 'lost_found';

export type PostType = 'post' | 'incident' | 'quote' | 'reel';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'fraud'
  | 'abuse'
  | 'misinformation'
  | 'child_safety'
  | 'violence';

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          region_id: string | null;
          district: string | null;
          occupation: string | null;
          interests: string[];
          notification_prefs: Json;
          onboarding_completed: boolean;
          account_status: 'active' | 'frozen' | 'deletion_pending';
          role: UserRole;
          is_verified: boolean;
          is_premium: boolean;
          birth_date: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          region_id?: string | null;
          district?: string | null;
          occupation?: string | null;
          interests?: string[];
          notification_prefs?: Json;
          onboarding_completed?: boolean;
          account_status?: 'active' | 'frozen' | 'deletion_pending';
          role?: UserRole;
          is_verified?: boolean;
          is_premium?: boolean;
          birth_date?: string | null;
        }
      >;
      posts: {
        Row: {
          id: string;
          author_id: string;
          region_id: string;
          title: string | null;
          content: string;
          media_urls: string[];
          category: PostCategory;
          district: string | null;
          location_label: string | null;
          post_type: PostType;
          latitude: number | null;
          longitude: number | null;
          status: ContentStatus;
          view_count: number;
          like_count: number;
          comment_count: number;
          quote_count: number;
          save_count: number;
          quoted_post_id: string | null;
          incident_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['posts']['Row']> & {
          author_id: string;
          region_id: string;
          content: string;
        };
        Update: Partial<Database['public']['Tables']['posts']['Row']>;
        Relationships: [];
      };
      post_likes: TableDef<
        { post_id: string; user_id: string; created_at: string },
        { post_id: string; user_id: string }
      >;
      post_comments: TableDef<
        {
          id: string;
          post_id: string;
          author_id: string;
          parent_id: string | null;
          content: string;
          like_count: number;
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          post_id: string;
          author_id: string;
          content: string;
          parent_id?: string | null;
        }
      >;
      comment_likes: TableDef<
        { comment_id: string; user_id: string; created_at: string },
        { comment_id: string; user_id: string }
      >;
      post_saves: TableDef<
        {
          post_id: string;
          user_id: string;
          collection_id: string | null;
          created_at: string;
        },
        { post_id: string; user_id: string; collection_id?: string | null }
      >;
      save_collections: TableDef<
        { id: string; user_id: string; name: string; created_at: string },
        { user_id: string; name: string }
      >;
      follows: TableDef<
        { follower_id: string; following_id: string; created_at: string },
        { follower_id: string; following_id: string }
      >;
      post_views: TableDef<
        {
          id: string;
          post_id: string;
          viewer_id: string | null;
          is_unique: boolean;
          created_at: string;
        },
        { post_id: string; viewer_id?: string | null; is_unique?: boolean }
      >;
      content_reports: TableDef<
        {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: ReportReason;
          details: string | null;
          created_at: string;
        },
        {
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: ReportReason;
          details?: string | null;
        }
      >;
      user_blocks: TableDef<
        {
          blocker_id: string;
          blocked_id: string;
          is_restricted: boolean;
          created_at: string;
        },
        { blocker_id: string; blocked_id: string; is_restricted?: boolean }
      >;
      incident_reports: {
        Row: {
          id: string;
          reporter_id: string;
          region_id: string;
          title: string;
          description: string;
          media_urls: string[];
          latitude: number | null;
          longitude: number | null;
          severity: 'low' | 'medium' | 'high' | 'critical';
          status: 'open' | 'verified' | 'resolved' | 'dismissed';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['incident_reports']['Row']> & {
          reporter_id: string;
          region_id: string;
          title: string;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['incident_reports']['Row']>;
        Relationships: [];
      };
      videos: TableDef<
        {
          id: string;
          owner_id: string;
          region_id: string;
          title: string | null;
          description: string | null;
          mux_asset_id: string | null;
          mux_playback_id: string | null;
          mux_upload_id: string | null;
          duration_seconds: number | null;
          status: VideoStatus;
          thumbnail_url: string | null;
          created_at: string;
        },
        {
          owner_id: string;
          region_id: string;
          title?: string | null;
          description?: string | null;
          mux_asset_id?: string | null;
          mux_playback_id?: string | null;
          mux_upload_id?: string | null;
          duration_seconds?: number | null;
          status?: VideoStatus;
          thumbnail_url?: string | null;
        }
      >;
      reel_likes: TableDef<
        { reel_id: string; user_id: string; created_at: string },
        { reel_id: string; user_id: string }
      >;
      incident_updates: TableDef<
        {
          id: string;
          incident_id: string;
          author_id: string;
          update_type: 'initial' | 'update' | 'photo' | 'video' | 'verification';
          content: string;
          media_urls: string[];
          created_at: string;
        },
        {
          incident_id: string;
          author_id: string;
          content: string;
          update_type?: 'initial' | 'update' | 'photo' | 'video' | 'verification';
          media_urls?: string[];
        }
      >;
      incident_verifications: TableDef<
        {
          id: string;
          incident_id: string;
          verifier_id: string;
          note: string | null;
          created_at: string;
        },
        { incident_id: string; verifier_id: string; note?: string | null }
      >;
      hashtags: TableDef<
        { id: string; tag: string; post_count: number; created_at: string },
        { tag: string; post_count?: number }
      >;
      post_hashtags: TableDef<
        { post_id: string; hashtag_id: string },
        { post_id: string; hashtag_id: string }
      >;
      reels: {
        Row: {
          id: string;
          author_id: string;
          region_id: string;
          video_id: string;
          caption: string | null;
          like_count: number;
          view_count: number;
          status: ContentStatus;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['reels']['Row']> & {
          author_id: string;
          region_id: string;
          video_id: string;
        };
        Update: Partial<Database['public']['Tables']['reels']['Row']>;
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          region_id: string;
          name: string;
          category: string;
          description: string | null;
          phone: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          logo_url: string | null;
          is_verified: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['businesses']['Row']> & {
          owner_id: string;
          region_id: string;
          name: string;
          category: string;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Row']>;
        Relationships: [];
      };
      job_listings: {
        Row: {
          id: string;
          business_id: string | null;
          author_id: string;
          region_id: string;
          title: string;
          description: string;
          job_type: 'full_time' | 'part_time' | 'seasonal' | 'remote';
          salary_range: string | null;
          status: ContentStatus;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['job_listings']['Row']> & {
          author_id: string;
          region_id: string;
          title: string;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['job_listings']['Row']>;
        Relationships: [];
      };
      staff_requests: {
        Row: {
          id: string;
          business_id: string | null;
          author_id: string;
          region_id: string;
          title: string;
          description: string;
          positions: string[];
          status: ContentStatus;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['staff_requests']['Row']> & {
          author_id: string;
          region_id: string;
          title: string;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['staff_requests']['Row']>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organizer_id: string;
          region_id: string;
          title: string;
          description: string;
          starts_at: string;
          ends_at: string | null;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          cover_url: string | null;
          status: ContentStatus;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['events']['Row']> & {
          organizer_id: string;
          region_id: string;
          title: string;
          description: string;
          starts_at: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Row']>;
        Relationships: [];
      };
      lost_items: {
        Row: {
          id: string;
          author_id: string;
          region_id: string;
          item_type: 'lost' | 'found';
          title: string;
          description: string;
          contact_info: string | null;
          media_urls: string[];
          latitude: number | null;
          longitude: number | null;
          status: 'open' | 'resolved';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['lost_items']['Row']> & {
          author_id: string;
          region_id: string;
          item_type: 'lost' | 'found';
          title: string;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['lost_items']['Row']>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: 'direct' | 'group';
          title: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['conversations']['Row']> & {
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Row']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          media_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['messages']['Row']> & {
          conversation_id: string;
          sender_id: string;
          content: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
        Relationships: [];
      };
      call_sessions: TableDef<
        {
          id: string;
          channel_name: string;
          caller_id: string;
          callee_id: string;
          call_type: 'audio' | 'video';
          status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed' | 'cancelled';
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        },
        {
          channel_name: string;
          caller_id: string;
          callee_id: string;
          call_type?: 'audio' | 'video';
          status?: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed' | 'cancelled';
        }
      >;
      moderation_actions: {
        Row: {
          id: string;
          moderator_id: string;
          target_type: string;
          target_id: string;
          action: 'warn' | 'hide' | 'remove' | 'ban';
          reason: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['moderation_actions']['Row']> & {
          moderator_id: string;
          target_type: string;
          target_id: string;
          action: 'warn' | 'hide' | 'remove' | 'ban';
          reason: string;
        };
        Update: Partial<Database['public']['Tables']['moderation_actions']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
