export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_lifecycle_requests: {
        Row: {
          account_status_snapshot: string
          admin_id: string | null
          admin_note: string | null
          created_at: string
          id: string
          message: string
          request_type: string
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status_snapshot: string
          admin_id?: string | null
          admin_note?: string | null
          created_at?: string
          id?: string
          message: string
          request_type: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status_snapshot?: string
          admin_id?: string | null
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string
          request_type?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_lifecycle_requests_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_lifecycle_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_quarantine_snapshots: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          previous_status: string
          released_at: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          previous_status: string
          released_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          previous_status?: string
          released_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_quarantine_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_broadcasts: {
        Row: {
          body: string
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          created_at: string
          id: string
          recipient_count: number
          region_id: string | null
          sent_by: string
          title: string
        }
        Insert: {
          body: string
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          created_at?: string
          id?: string
          recipient_count?: number
          region_id?: string | null
          sent_by: string
          title: string
        }
        Update: {
          body?: string
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          created_at?: string
          id?: string
          recipient_count?: number
          region_id?: string | null
          sent_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcasts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_role_permissions: {
        Row: {
          allowed: boolean
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          allowed?: boolean
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          allowed?: boolean
          permission_key?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      ai_moderation_logs: {
        Row: {
          action: string
          created_at: string
          flags: Json
          id: string
          provider: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          target_id: string | null
          target_type: string | null
          text_sample: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          flags?: Json
          id?: string
          provider?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          target_id?: string | null
          target_type?: string | null
          text_sample?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          flags?: Json
          id?: string
          provider?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          target_id?: string | null
          target_type?: string | null
          text_sample?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_moderation_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_moderation_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_tips: {
        Row: {
          category: Database["public"]["Enums"]["tip_category"]
          created_at: string
          description: string
          id: string
          location: unknown
          moderation_status: Database["public"]["Enums"]["tip_moderation_status"]
          region_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["tip_category"]
          created_at?: string
          description: string
          id?: string
          location?: unknown
          moderation_status?: Database["public"]["Enums"]["tip_moderation_status"]
          region_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["tip_category"]
          created_at?: string
          description?: string
          id?: string
          location?: unknown
          moderation_status?: Database["public"]["Enums"]["tip_moderation_status"]
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_tips_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_feature_flags: {
        Row: {
          feature_group: string
          feature_id: string
          is_button_visible: boolean
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_group: string
          feature_id: string
          is_button_visible?: boolean
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_group?: string
          feature_id?: string
          is_button_visible?: boolean
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_system_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ads: {
        Row: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          budget_cents: number
          business_id: string
          clicks: number
          created_at: string
          description: string
          ends_at: string | null
          id: string
          image_url: string | null
          impressions: number
          owner_id: string
          spent_cents: number
          starts_at: string
          status: Database["public"]["Enums"]["ad_status"]
          target_age_max: number | null
          target_age_min: number | null
          target_district: string | null
          target_interests: string[]
          target_region_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          budget_cents?: number
          business_id: string
          clicks?: number
          created_at?: string
          description: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          owner_id: string
          spent_cents?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          target_age_max?: number | null
          target_age_min?: number | null
          target_district?: string | null
          target_interests?: string[]
          target_region_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          budget_cents?: number
          business_id?: string
          clicks?: number
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          owner_id?: string
          spent_cents?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          target_age_max?: number | null
          target_age_min?: number | null
          target_district?: string | null
          target_interests?: string[]
          target_region_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_ads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ads_target_region_id_fkey"
            columns: ["target_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_campaigns: {
        Row: {
          business_id: string
          created_at: string
          description: string
          ends_at: string | null
          id: string
          image_url: string | null
          starts_at: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_follows: {
        Row: {
          business_id: string
          created_at: string
          notify_on_new_listing: boolean
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          notify_on_new_listing?: boolean
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          notify_on_new_listing?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_follows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_views: {
        Row: {
          business_id: string
          created_at: string
          viewer_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          viewer_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: string
          created_at: string
          description: string | null
          district: string | null
          document_urls: string[]
          email: string | null
          id: string
          is_verified: boolean
          latitude: number | null
          location: unknown
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string
          phone: string | null
          region_id: string
          registration_status: Database["public"]["Enums"]["business_registration_status"]
          tax_number: string | null
          view_count: number
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          description?: string | null
          district?: string | null
          document_urls?: string[]
          email?: string | null
          id?: string
          is_verified?: boolean
          latitude?: number | null
          location?: unknown
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          phone?: string | null
          region_id: string
          registration_status?: Database["public"]["Enums"]["business_registration_status"]
          tax_number?: string | null
          view_count?: number
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          district?: string | null
          document_urls?: string[]
          email?: string | null
          id?: string
          is_verified?: boolean
          latitude?: number | null
          location?: unknown
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          region_id?: string
          registration_status?: Database["public"]["Enums"]["business_registration_status"]
          tax_number?: string | null
          view_count?: number
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_type: Database["public"]["Enums"]["call_type"]
          callee_id: string
          caller_id: string
          channel_name: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
        }
        Insert: {
          call_type?: Database["public"]["Enums"]["call_type"]
          callee_id: string
          caller_id: string
          channel_name: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
        }
        Update: {
          call_type?: Database["public"]["Enums"]["call_type"]
          callee_id?: string
          caller_id?: string
          channel_name?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_admins: {
        Row: {
          can_post: boolean
          channel_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          can_post?: boolean
          channel_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          can_post?: boolean
          channel_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_admins_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_posts: {
        Row: {
          author_id: string
          channel_id: string
          content: string
          created_at: string
          id: string
          media_url: string | null
          view_count: number
        }
        Insert: {
          author_id: string
          channel_id: string
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          view_count?: number
        }
        Update: {
          author_id?: string
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_subscribers: {
        Row: {
          channel_id: string
          notify_enabled: boolean
          subscribed_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          notify_enabled?: boolean
          subscribed_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          notify_enabled?: boolean
          subscribed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_subscribers_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          description: string | null
          id: string
          is_suspended: boolean
          is_verified: boolean
          name: string
          notify_subscribers: boolean
          owner_id: string
          post_count: number
          region_id: string | null
          slug: string
          subscriber_count: number
          suspend_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          name: string
          notify_subscribers?: boolean
          owner_id: string
          post_count?: number
          region_id?: string | null
          slug: string
          subscriber_count?: number
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          name?: string
          notify_subscribers?: boolean
          owner_id?: string
          post_count?: number
          region_id?: string | null
          slug?: string
          subscriber_count?: number
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_score_votes: {
        Row: {
          cleanliness_score: number
          created_at: string
          id: string
          quality_score: number
          region_id: string
          security_score: number
          traffic_score: number
          voter_id: string
        }
        Insert: {
          cleanliness_score: number
          created_at?: string
          id?: string
          quality_score: number
          region_id: string
          security_score: number
          traffic_score: number
          voter_id: string
        }
        Update: {
          cleanliness_score?: number
          created_at?: string
          id?: string
          quality_score?: number
          region_id?: string
          security_score?: number
          traffic_score?: number
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_score_votes_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_score_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_scores: {
        Row: {
          cleanliness_score: number
          id: string
          quality_score: number
          region_id: string
          security_score: number
          traffic_score: number
          updated_at: string
          vote_count: number
        }
        Insert: {
          cleanliness_score?: number
          id?: string
          quality_score?: number
          region_id: string
          security_score?: number
          traffic_score?: number
          updated_at?: string
          vote_count?: number
        }
        Update: {
          cleanliness_score?: number
          id?: string
          quality_score?: number
          region_id?: string
          security_score?: number
          traffic_score?: number
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "city_scores_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          icon_url: string | null
          id: string
          is_suspended: boolean
          member_count: number
          name: string
          post_count: number
          region_id: string | null
          rules_summary: string | null
          slug: string
          suspend_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["community_visibility"]
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_suspended?: boolean
          member_count?: number
          name: string
          post_count?: number
          region_id?: string | null
          rules_summary?: string | null
          slug: string
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_suspended?: boolean
          member_count?: number
          name?: string
          post_count?: number
          region_id?: string | null
          rules_summary?: string | null
          slug?: string
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_member_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_member_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rules: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rules_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          asset_index: number
          created_at: string
          id: string
          media_url: string | null
          sha256: string
          storage_path: string | null
          trust_record_id: string
          watermark_version: number
        }
        Insert: {
          asset_index?: number
          created_at?: string
          id?: string
          media_url?: string | null
          sha256: string
          storage_path?: string | null
          trust_record_id: string
          watermark_version?: number
        }
        Update: {
          asset_index?: number
          created_at?: string
          id?: string
          media_url?: string | null
          sha256?: string
          storage_path?: string | null
          trust_record_id?: string
          watermark_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_trust_record_id_fkey"
            columns: ["trust_record_id"]
            isOneToOne: false
            referencedRelation: "content_trust_records"
            referencedColumns: ["id"]
          },
        ]
      }
      content_misinfo_flags: {
        Row: {
          created_at: string
          details: string | null
          flag_type: Database["public"]["Enums"]["misinfo_flag_type"]
          flagger_id: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          flag_type: Database["public"]["Enums"]["misinfo_flag_type"]
          flagger_id: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          flag_type?: Database["public"]["Enums"]["misinfo_flag_type"]
          flagger_id?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_misinfo_flags_flagger_id_fkey"
            columns: ["flagger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          assigned_to: string | null
          created_at: string
          details: string | null
          id: string
          priority: number
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_queue_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          details?: string | null
          id?: string
          priority?: number
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_queue_status"]
          target_id: string
          target_type: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          details?: string | null
          id?: string
          priority?: number
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_queue_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_trust_records: {
        Row: {
          author_id: string
          content_hash: string
          content_type: Database["public"]["Enums"]["vcts_content_type"]
          created_at: string
          device_platform: string | null
          id: string
          ip_hash: string | null
          location_hash: string | null
          post_id: string
          publisher_key: string
          status: Database["public"]["Enums"]["vcts_trust_status"]
          trust_code: string
        }
        Insert: {
          author_id: string
          content_hash: string
          content_type?: Database["public"]["Enums"]["vcts_content_type"]
          created_at?: string
          device_platform?: string | null
          id?: string
          ip_hash?: string | null
          location_hash?: string | null
          post_id: string
          publisher_key: string
          status?: Database["public"]["Enums"]["vcts_trust_status"]
          trust_code?: string
        }
        Update: {
          author_id?: string
          content_hash?: string
          content_type?: Database["public"]["Enums"]["vcts_content_type"]
          created_at?: string
          device_platform?: string | null
          id?: string
          ip_hash?: string | null
          location_hash?: string | null
          post_id?: string
          publisher_key?: string
          status?: Database["public"]["Enums"]["vcts_trust_status"]
          trust_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_trust_records_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_trust_records_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          hidden_at: string | null
          is_archived: boolean
          is_pinned: boolean
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          pinned_at: string | null
          role: Database["public"]["Enums"]["conversation_member_role"]
          user_id: string
        }
        Insert: {
          conversation_id: string
          hidden_at?: string | null
          is_archived?: boolean
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: Database["public"]["Enums"]["conversation_member_role"]
          user_id: string
        }
        Update: {
          conversation_id?: string
          hidden_at?: string | null
          is_archived?: boolean
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: Database["public"]["Enums"]["conversation_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_lock_reason: string | null
          admin_locked: boolean
          avatar_url: string | null
          created_at: string
          created_by: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          title: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          admin_lock_reason?: string | null
          admin_locked?: boolean
          avatar_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          admin_lock_reason?: string | null
          admin_locked?: boolean
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_agenda: {
        Row: {
          agenda_date: string
          created_at: string
          id: string
          is_manual: boolean
          label: string
          priority: number
          region_id: string | null
          scope: string
          tag: string
        }
        Insert: {
          agenda_date?: string
          created_at?: string
          id?: string
          is_manual?: boolean
          label: string
          priority?: number
          region_id?: string | null
          scope?: string
          tag: string
        }
        Update: {
          agenda_date?: string
          created_at?: string
          id?: string
          is_manual?: boolean
          label?: string
          priority?: number
          region_id?: string | null
          scope?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_agenda_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_city_summaries: {
        Row: {
          created_at: string
          id: string
          region_id: string
          stats: Json
          summary_date: string
          summary_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          region_id: string
          stats?: Json
          summary_date?: string
          summary_text: string
        }
        Update: {
          created_at?: string
          id?: string
          region_id?: string
          stats?: Json
          summary_date?: string
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_city_summaries_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_task_definitions: {
        Row: {
          description: string
          is_active: boolean
          key: string
          reward_key: string | null
          reward_type: Database["public"]["Enums"]["task_reward_type"]
          reward_value: number
          sort_order: number
          target_count: number
          title: string
        }
        Insert: {
          description: string
          is_active?: boolean
          key: string
          reward_key?: string | null
          reward_type?: Database["public"]["Enums"]["task_reward_type"]
          reward_value?: number
          sort_order?: number
          target_count?: number
          title: string
        }
        Update: {
          description?: string
          is_active?: boolean
          key?: string
          reward_key?: string | null
          reward_type?: Database["public"]["Enums"]["task_reward_type"]
          reward_value?: number
          sort_order?: number
          target_count?: number
          title?: string
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          business_id: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          tracking_code: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_featured_items: {
        Row: {
          created_at: string
          featured_by: string | null
          featured_until: string | null
          id: string
          priority: number
          region_key: string
          scope: string
          tab: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          featured_by?: string | null
          featured_until?: string | null
          id?: string
          priority?: number
          region_key?: string
          scope?: string
          tab: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          featured_by?: string | null
          featured_until?: string | null
          id?: string
          priority?: number
          region_key?: string
          scope?: string
          tab?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_featured_items_featured_by_fkey"
            columns: ["featured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_broadcasts: {
        Row: {
          body: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          region_id: string | null
          sent_by: string
          severity: Database["public"]["Enums"]["incident_severity"]
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          region_id?: string | null
          sent_by: string
          severity?: Database["public"]["Enums"]["incident_severity"]
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          region_id?: string | null
          sent_by?: string
          severity?: Database["public"]["Enums"]["incident_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_broadcasts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_pois: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["poi_category"]
          created_at: string
          description: string | null
          id: string
          is_24h: boolean
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string
          phone: string | null
          region_id: string
          source: string
        }
        Insert: {
          address?: string | null
          category: Database["public"]["Enums"]["poi_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_24h?: boolean
          latitude?: number | null
          location: unknown
          longitude?: number | null
          name: string
          phone?: string | null
          region_id: string
          source?: string
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["poi_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_24h?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string
          phone?: string | null
          region_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_pois_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checkins: {
        Row: {
          checked_in_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_follows: {
        Row: {
          created_at: string
          event_id: string
          notify_on_update: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          notify_on_update?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          notify_on_update?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_follows_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminder_queue: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reminder_kind: string
          scheduled_at: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reminder_kind: string
          scheduled_at: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reminder_kind?: string
          scheduled_at?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminder_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reminder_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          event_id: string
          id: string
          paid_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_updates: {
        Row: {
          author_id: string
          content: string
          created_at: string
          event_id: string
          id: string
          media_urls: string[]
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          event_id: string
          id?: string
          media_urls?: string[]
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          media_urls?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "event_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_updates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_views: {
        Row: {
          created_at: string
          event_id: string
          source: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          source: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          source?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_views_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          business_id: string | null
          category: Database["public"]["Enums"]["event_category"]
          community_id: string | null
          conversation_id: string | null
          cover_url: string | null
          created_at: string
          description: string
          ends_at: string | null
          id: string
          is_featured: boolean
          is_sponsored: boolean
          latitude: number | null
          location: unknown
          location_name: string | null
          longitude: number | null
          map_category: Database["public"]["Enums"]["event_map_category"]
          map_view_count: number
          max_attendees: number | null
          organizer_id: string
          qr_token: string | null
          region_id: string
          starts_at: string
          status: Database["public"]["Enums"]["content_status"]
          ticket_currency: string
          ticket_price_cents: number | null
          ticket_type: Database["public"]["Enums"]["event_ticket_type"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          business_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          community_id?: string | null
          conversation_id?: string | null
          cover_url?: string | null
          created_at?: string
          description: string
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          is_sponsored?: boolean
          latitude?: number | null
          location?: unknown
          location_name?: string | null
          longitude?: number | null
          map_category?: Database["public"]["Enums"]["event_map_category"]
          map_view_count?: number
          max_attendees?: number | null
          organizer_id: string
          qr_token?: string | null
          region_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["content_status"]
          ticket_currency?: string
          ticket_price_cents?: number | null
          ticket_type?: Database["public"]["Enums"]["event_ticket_type"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          business_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          community_id?: string | null
          conversation_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          is_sponsored?: boolean
          latitude?: number | null
          location?: unknown
          location_name?: string | null
          longitude?: number | null
          map_category?: Database["public"]["Enums"]["event_map_category"]
          map_view_count?: number
          max_attendees?: number | null
          organizer_id?: string
          qr_token?: string | null
          region_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          ticket_currency?: string
          ticket_price_cents?: number | null
          ticket_type?: Database["public"]["Enums"]["event_ticket_type"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      explorer_presence: {
        Row: {
          heading: number | null
          is_visible: boolean
          latitude: number
          location: unknown
          longitude: number
          region_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          heading?: number | null
          is_visible?: boolean
          latitude: number
          location?: unknown
          longitude: number
          region_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          heading?: number | null
          is_visible?: boolean
          latitude?: number
          location?: unknown
          longitude?: number
          region_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "explorer_presence_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "explorer_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["friend_request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["friend_request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["friend_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean
          is_hidden: boolean
          post_count: number
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean
          is_hidden?: boolean
          post_count?: number
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean
          is_hidden?: boolean
          post_count?: number
          tag?: string
        }
        Relationships: []
      }
      help_requests: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["help_request_category"]
          contact_info: string | null
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          location: unknown
          region_id: string
          title: string
          urgency: Database["public"]["Enums"]["help_urgency"]
        }
        Insert: {
          author_id: string
          category: Database["public"]["Enums"]["help_request_category"]
          contact_info?: string | null
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean
          location?: unknown
          region_id: string
          title: string
          urgency?: Database["public"]["Enums"]["help_urgency"]
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["help_request_category"]
          contact_info?: string | null
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean
          location?: unknown
          region_id?: string
          title?: string
          urgency?: Database["public"]["Enums"]["help_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verification_requests: {
        Row: {
          birth_date: string | null
          created_at: string
          document_type: Database["public"]["Enums"]["identity_document_type"]
          full_name: string
          id: string
          id_back_path: string | null
          id_front_path: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["identity_verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          document_type: Database["public"]["Enums"]["identity_document_type"]
          full_name: string
          id?: string
          id_back_path?: string | null
          id_front_path: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: Database["public"]["Enums"]["identity_verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["identity_document_type"]
          full_name?: string
          id?: string
          id_back_path?: string | null
          id_front_path?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["identity_verification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_follows: {
        Row: {
          created_at: string
          incident_id: string
          notify_on_update: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          incident_id: string
          notify_on_update?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          incident_id?: string
          notify_on_update?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_follows_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          latitude: number | null
          location: unknown
          longitude: number | null
          media_urls: string[]
          region_id: string
          reporter_id: string
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          media_urls?: string[]
          region_id: string
          reporter_id: string
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          media_urls?: string[]
          region_id?: string
          reporter_id?: string
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_updates: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          incident_id: string
          media_urls: string[]
          update_type: Database["public"]["Enums"]["incident_update_type"]
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          incident_id: string
          media_urls?: string[]
          update_type?: Database["public"]["Enums"]["incident_update_type"]
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          incident_id?: string
          media_urls?: string[]
          update_type?: Database["public"]["Enums"]["incident_update_type"]
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_verifications: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          note: string | null
          verifier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          note?: string | null
          verifier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          note?: string | null
          verifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_verifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_verifications_verifier_id_fkey"
            columns: ["verifier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          conversation_id: string | null
          created_at: string
          employer_id: string
          id: string
          job_id: string | null
          message: string | null
          staff_request_id: string | null
          status: Database["public"]["Enums"]["job_application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          conversation_id?: string | null
          created_at?: string
          employer_id: string
          id?: string
          job_id?: string | null
          message?: string | null
          staff_request_id?: string | null
          status?: Database["public"]["Enums"]["job_application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          conversation_id?: string | null
          created_at?: string
          employer_id?: string
          id?: string
          job_id?: string | null
          message?: string | null
          staff_request_id?: string | null
          status?: Database["public"]["Enums"]["job_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_staff_request_id_fkey"
            columns: ["staff_request_id"]
            isOneToOne: false
            referencedRelation: "staff_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_favorites: {
        Row: {
          created_at: string
          listing_id: string
          listing_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          listing_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          listing_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listing_views: {
        Row: {
          created_at: string
          listing_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_listing_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listings: {
        Row: {
          author_id: string
          business_id: string | null
          created_at: string
          description: string
          district: string | null
          experience_required: string | null
          housing_provided: boolean
          id: string
          is_urgent: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          latitude: number | null
          location: unknown
          location_label: string | null
          longitude: number | null
          meal_provided: boolean
          region_id: string
          salary_range: string | null
          salary_type: Database["public"]["Enums"]["salary_type"]
          start_date: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          view_count: number
        }
        Insert: {
          author_id: string
          business_id?: string | null
          created_at?: string
          description: string
          district?: string | null
          experience_required?: string | null
          housing_provided?: boolean
          id?: string
          is_urgent?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          latitude?: number | null
          location?: unknown
          location_label?: string | null
          longitude?: number | null
          meal_provided?: boolean
          region_id: string
          salary_range?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          view_count?: number
        }
        Update: {
          author_id?: string
          business_id?: string | null
          created_at?: string
          description?: string
          district?: string | null
          experience_required?: string | null
          housing_provided?: boolean
          id?: string
          is_urgent?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          latitude?: number | null
          location?: unknown
          location_label?: string | null
          longitude?: number | null
          meal_provided?: boolean
          region_id?: string
          salary_range?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_listings_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_listings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_ratings: {
        Row: {
          application_id: string
          comment: string | null
          communication: number | null
          created_at: string
          discipline: number | null
          id: string
          overall: number
          punctuality: number | null
          quality: number | null
          rated_id: string
          rater_id: string
          rating_type: string
        }
        Insert: {
          application_id: string
          comment?: string | null
          communication?: number | null
          created_at?: string
          discipline?: number | null
          id?: string
          overall: number
          punctuality?: number | null
          quality?: number | null
          rated_id: string
          rater_id: string
          rating_type: string
        }
        Update: {
          application_id?: string
          comment?: string | null
          communication?: number | null
          created_at?: string
          discipline?: number | null
          id?: string
          overall?: number
          punctuality?: number | null
          quality?: number | null
          rated_id?: string
          rater_id?: string
          rating_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_ratings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_references: {
        Row: {
          company_name: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_verified: boolean
          position: string
          user_id: string
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          position: string
          user_id: string
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          position?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_references_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seekers: {
        Row: {
          created_at: string
          description: string | null
          district: string | null
          driving_license: boolean
          education: string | null
          experience_years: number
          id: string
          intro: string | null
          is_ready: boolean
          is_visible_on_map: boolean
          job_types: Database["public"]["Enums"]["job_type"][]
          languages: string[]
          latitude: number | null
          location: unknown
          longitude: number | null
          military_status: Database["public"]["Enums"]["military_status"] | null
          occupation: string
          phone_visible: boolean
          region_id: string
          salary_expectation: string | null
          skills: string[]
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          district?: string | null
          driving_license?: boolean
          education?: string | null
          experience_years?: number
          id?: string
          intro?: string | null
          is_ready?: boolean
          is_visible_on_map?: boolean
          job_types?: Database["public"]["Enums"]["job_type"][]
          languages?: string[]
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          military_status?:
            | Database["public"]["Enums"]["military_status"]
            | null
          occupation: string
          phone_visible?: boolean
          region_id: string
          salary_expectation?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          district?: string | null
          driving_license?: boolean
          education?: string | null
          experience_years?: number
          id?: string
          intro?: string | null
          is_ready?: boolean
          is_visible_on_map?: boolean
          job_types?: Database["public"]["Enums"]["job_type"][]
          languages?: string[]
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          military_status?:
            | Database["public"]["Enums"]["military_status"]
            | null
          occupation?: string
          phone_visible?: boolean
          region_id?: string
          salary_expectation?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_seekers_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_seekers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kuru_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          note: string | null
          reference_id: string | null
          source_key: string | null
          source_type: Database["public"]["Enums"]["kuru_source_type"]
          tx_type: Database["public"]["Enums"]["kuru_transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          reference_id?: string | null
          source_key?: string | null
          source_type?: Database["public"]["Enums"]["kuru_source_type"]
          tx_type: Database["public"]["Enums"]["kuru_transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          note?: string | null
          reference_id?: string | null
          source_key?: string | null
          source_type?: Database["public"]["Enums"]["kuru_source_type"]
          tx_type?: Database["public"]["Enums"]["kuru_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kuru_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kuru_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_deals: {
        Row: {
          business_id: string
          coupon_code: string | null
          created_at: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: string
          discount_text: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          region_id: string
          starts_at: string
          title: string
        }
        Insert: {
          business_id: string
          coupon_code?: string | null
          created_at?: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: string
          discount_text?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          region_id: string
          starts_at?: string
          title: string
        }
        Update: {
          business_id?: string
          coupon_code?: string | null
          created_at?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          description?: string
          discount_text?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          region_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_deals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_deals_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_item_tips: {
        Row: {
          contact_info: string | null
          created_at: string
          id: string
          lost_item_id: string
          message: string
          reporter_id: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          lost_item_id: string
          message: string
          reporter_id: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          lost_item_id?: string
          message?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_item_tips_lost_item_id_fkey"
            columns: ["lost_item_id"]
            isOneToOne: false
            referencedRelation: "lost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_item_tips_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_item_views: {
        Row: {
          created_at: string
          item_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_item_views_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "lost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_item_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_items: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["lost_item_category"]
          contact_info: string | null
          created_at: string
          description: string
          district: string | null
          id: string
          is_urgent: boolean
          item_type: Database["public"]["Enums"]["lost_item_type"]
          last_seen_at: string | null
          latitude: number | null
          location: unknown
          location_name: string | null
          longitude: number | null
          media_urls: string[]
          region_id: string
          resolved_at: string | null
          reward_amount: string | null
          status: Database["public"]["Enums"]["lost_item_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          category?: Database["public"]["Enums"]["lost_item_category"]
          contact_info?: string | null
          created_at?: string
          description: string
          district?: string | null
          id?: string
          is_urgent?: boolean
          item_type: Database["public"]["Enums"]["lost_item_type"]
          last_seen_at?: string | null
          latitude?: number | null
          location?: unknown
          location_name?: string | null
          longitude?: number | null
          media_urls?: string[]
          region_id: string
          resolved_at?: string | null
          reward_amount?: string | null
          status?: Database["public"]["Enums"]["lost_item_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["lost_item_category"]
          contact_info?: string | null
          created_at?: string
          description?: string
          district?: string | null
          id?: string
          is_urgent?: boolean
          item_type?: Database["public"]["Enums"]["lost_item_type"]
          last_seen_at?: string | null
          latitude?: number | null
          location?: unknown
          location_name?: string | null
          longitude?: number | null
          media_urls?: string[]
          region_id?: string
          resolved_at?: string | null
          reward_amount?: string | null
          status?: Database["public"]["Enums"]["lost_item_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lost_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_items_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_removed: boolean
          listing_id: string
          parent_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_removed?: boolean
          listing_id: string
          parent_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_removed?: boolean
          listing_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "marketplace_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          author_id: string
          business_id: string | null
          category: Database["public"]["Enums"]["marketplace_category"]
          comment_count: number
          condition: Database["public"]["Enums"]["marketplace_condition"]
          contact_phone: string | null
          content_status: Database["public"]["Enums"]["content_status"]
          cover_url: string | null
          created_at: string
          currency: string
          delivery_mode: Database["public"]["Enums"]["marketplace_delivery_mode"]
          description: string
          district: string
          favorite_count: number
          id: string
          latitude: number | null
          listing_type: Database["public"]["Enums"]["marketplace_listing_type"]
          location: unknown
          longitude: number | null
          media_urls: string[]
          price: number | null
          region_id: string
          search_vector: unknown
          shipping_note: string | null
          show_phone: boolean
          sold_at: string | null
          status: Database["public"]["Enums"]["marketplace_listing_status"]
          subcategory: string
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          business_id?: string | null
          category: Database["public"]["Enums"]["marketplace_category"]
          comment_count?: number
          condition?: Database["public"]["Enums"]["marketplace_condition"]
          contact_phone?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          cover_url?: string | null
          created_at?: string
          currency?: string
          delivery_mode?: Database["public"]["Enums"]["marketplace_delivery_mode"]
          description: string
          district: string
          favorite_count?: number
          id?: string
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["marketplace_listing_type"]
          location?: unknown
          longitude?: number | null
          media_urls?: string[]
          price?: number | null
          region_id: string
          search_vector?: unknown
          shipping_note?: string | null
          show_phone?: boolean
          sold_at?: string | null
          status?: Database["public"]["Enums"]["marketplace_listing_status"]
          subcategory: string
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          business_id?: string | null
          category?: Database["public"]["Enums"]["marketplace_category"]
          comment_count?: number
          condition?: Database["public"]["Enums"]["marketplace_condition"]
          contact_phone?: string | null
          content_status?: Database["public"]["Enums"]["content_status"]
          cover_url?: string | null
          created_at?: string
          currency?: string
          delivery_mode?: Database["public"]["Enums"]["marketplace_delivery_mode"]
          description?: string
          district?: string
          favorite_count?: number
          id?: string
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["marketplace_listing_type"]
          location?: unknown
          longitude?: number | null
          media_urls?: string[]
          price?: number | null
          region_id?: string
          search_vector?: unknown
          shipping_note?: string | null
          show_phone?: boolean
          sold_at?: string | null
          status?: Database["public"]["Enums"]["marketplace_listing_status"]
          subcategory?: string
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_order_documents: {
        Row: {
          document_type: string
          file_name: string
          generated_at: string
          generated_by: string | null
          id: string
          order_id: string
          storage_path: string
        }
        Insert: {
          document_type: string
          file_name: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          order_id: string
          storage_path: string
        }
        Update: {
          document_type?: string
          file_name?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          order_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_order_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          business_id: string | null
          buyer_confirmed_at: string | null
          buyer_id: string
          commission_cents: number
          commission_rate: number
          created_at: string
          currency: string
          dispute_reason: string | null
          gross_amount_cents: number
          id: string
          listing_id: string
          order_number: string
          paid_at: string | null
          payout_completed_at: string | null
          payout_completed_by: string | null
          payout_due_at: string | null
          payout_notes: string | null
          payout_reference: string | null
          platform_approved_at: string | null
          platform_approved_by: string | null
          refunded_at: string | null
          seller_account_name: string | null
          seller_iban: string | null
          seller_id: string
          seller_net_cents: number
          seller_shipped_at: string | null
          status: Database["public"]["Enums"]["marketplace_order_status"]
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_fee_cents: number | null
          stripe_payment_intent_id: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          buyer_confirmed_at?: string | null
          buyer_id: string
          commission_cents: number
          commission_rate?: number
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          gross_amount_cents: number
          id?: string
          listing_id: string
          order_number: string
          paid_at?: string | null
          payout_completed_at?: string | null
          payout_completed_by?: string | null
          payout_due_at?: string | null
          payout_notes?: string | null
          payout_reference?: string | null
          platform_approved_at?: string | null
          platform_approved_by?: string | null
          refunded_at?: string | null
          seller_account_name?: string | null
          seller_iban?: string | null
          seller_id: string
          seller_net_cents: number
          seller_shipped_at?: string | null
          status?: Database["public"]["Enums"]["marketplace_order_status"]
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_fee_cents?: number | null
          stripe_payment_intent_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          buyer_confirmed_at?: string | null
          buyer_id?: string
          commission_cents?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          gross_amount_cents?: number
          id?: string
          listing_id?: string
          order_number?: string
          paid_at?: string | null
          payout_completed_at?: string | null
          payout_completed_by?: string | null
          payout_due_at?: string | null
          payout_notes?: string | null
          payout_reference?: string | null
          platform_approved_at?: string | null
          platform_approved_by?: string | null
          refunded_at?: string | null
          seller_account_name?: string | null
          seller_iban?: string | null
          seller_id?: string
          seller_net_cents?: number
          seller_shipped_at?: string | null
          status?: Database["public"]["Enums"]["marketplace_order_status"]
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_fee_cents?: number | null
          stripe_payment_intent_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_payout_completed_by_fkey"
            columns: ["payout_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_platform_approved_by_fkey"
            columns: ["platform_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_seller_payout_profiles: {
        Row: {
          account_holder: string
          bank_name: string | null
          created_at: string
          iban: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_holder: string
          bank_name?: string | null
          created_at?: string
          iban: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_holder?: string
          bank_name?: string | null
          created_at?: string
          iban?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_seller_payout_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_seller_payout_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_daily_usage: {
        Row: {
          message_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          message_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          message_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_daily_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_deletions: {
        Row: {
          deleted_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_deletions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_deletions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_for_all: boolean
          edited_at: string | null
          forwarded_from_id: string | null
          id: string
          is_read: boolean
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_for_all?: boolean
          edited_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_read?: boolean
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_for_all?: boolean
          edited_at?: string | null
          forwarded_from_id?: string | null
          id?: string
          is_read?: boolean
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_id_fkey"
            columns: ["forwarded_from_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_inbox_events: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_for_all: boolean
          forwarded_from_id: string | null
          id: string
          media_url: string | null
          message_id: string
          message_type: string
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at: string
          deleted_for_all?: boolean
          forwarded_from_id?: string | null
          id?: string
          media_url?: string | null
          message_id: string
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_for_all?: boolean
          forwarded_from_id?: string | null
          id?: string
          media_url?: string | null
          message_id?: string
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_inbox_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_inbox_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_inbox_events_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_inbox_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action_type"]
          created_at: string
          id: string
          metadata: Json
          moderator_id: string
          reason: string
          report_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: Database["public"]["Enums"]["moderation_action_type"]
          created_at?: string
          id?: string
          metadata?: Json
          moderator_id: string
          reason: string
          report_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: Database["public"]["Enums"]["moderation_action_type"]
          created_at?: string
          id?: string
          metadata?: Json
          moderator_id?: string
          reason?: string
          report_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_appeals: {
        Row: {
          appeal_type: Database["public"]["Enums"]["appeal_type"]
          assigned_to: string | null
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["appeal_status"]
          user_id: string
        }
        Insert: {
          appeal_type: Database["public"]["Enums"]["appeal_type"]
          assigned_to?: string | null
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          user_id: string
        }
        Update: {
          appeal_type?: Database["public"]["Enums"]["appeal_type"]
          assigned_to?: string | null
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_appeals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_appeals_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_track_usages: {
        Row: {
          created_at: string
          id: string
          music_end_sec: number
          music_start_sec: number
          music_volume: number
          original_audio_volume: number
          post_id: string | null
          reel_id: string | null
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          music_end_sec?: number
          music_start_sec?: number
          music_volume?: number
          original_audio_volume?: number
          post_id?: string | null
          reel_id?: string | null
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          music_end_sec?: number
          music_start_sec?: number
          music_volume?: number
          original_audio_volume?: number
          post_id?: string | null
          reel_id?: string | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_track_usages_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_track_usages_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_track_usages_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_track_usages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tracks: {
        Row: {
          album: string | null
          artist: string
          audio_storage_path: string | null
          audio_url: string
          category_id: string | null
          cover_storage_path: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          display_title: string
          duration_seconds: number
          id: string
          is_editor_pick: boolean
          is_featured: boolean
          is_trending: boolean
          last_used_at: string | null
          license_info: string | null
          license_status: Database["public"]["Enums"]["music_license_status"]
          publication_status: Database["public"]["Enums"]["music_publication_status"]
          sort_order: number
          title: string
          updated_at: string
          usage_count: number
          view_count: number
        }
        Insert: {
          album?: string | null
          artist?: string
          audio_storage_path?: string | null
          audio_url: string
          category_id?: string | null
          cover_storage_path?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          display_title: string
          duration_seconds?: number
          id?: string
          is_editor_pick?: boolean
          is_featured?: boolean
          is_trending?: boolean
          last_used_at?: string | null
          license_info?: string | null
          license_status?: Database["public"]["Enums"]["music_license_status"]
          publication_status?: Database["public"]["Enums"]["music_publication_status"]
          sort_order?: number
          title: string
          updated_at?: string
          usage_count?: number
          view_count?: number
        }
        Update: {
          album?: string | null
          artist?: string
          audio_storage_path?: string | null
          audio_url?: string
          category_id?: string | null
          cover_storage_path?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          display_title?: string
          duration_seconds?: number
          id?: string
          is_editor_pick?: boolean
          is_featured?: boolean
          is_trending?: boolean
          last_used_at?: string | null
          license_info?: string | null
          license_status?: Database["public"]["Enums"]["music_license_status"]
          publication_status?: Database["public"]["Enums"]["music_publication_status"]
          sort_order?: number
          title?: string
          updated_at?: string
          usage_count?: number
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "music_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_tracks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_verifications: {
        Row: {
          created_at: string
          id: string
          note: string | null
          post_id: string | null
          reel_id: string | null
          reporter_id: string
          result: Database["public"]["Enums"]["news_verification_result"]
          score_delta: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string | null
          reel_id?: string | null
          reporter_id: string
          result: Database["public"]["Enums"]["news_verification_result"]
          score_delta: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string | null
          reel_id?: string | null
          reporter_id?: string
          result?: Database["public"]["Enums"]["news_verification_result"]
          score_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "news_verifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_verifications_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_verifications_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"] | null
          clicked_at: string | null
          delivered_at: string
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          notification_id: string | null
          opened_at: string | null
          outbox_id: string | null
          priority: Database["public"]["Enums"]["notification_priority"] | null
          recipient_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["notification_category"] | null
          clicked_at?: string | null
          delivered_at?: string
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          notification_id?: string | null
          opened_at?: string | null
          outbox_id?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          recipient_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"] | null
          clicked_at?: string | null
          delivered_at?: string
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          notification_id?: string | null
          opened_at?: string | null
          outbox_id?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_log_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_log_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          data: Json
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          processed_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          data?: Json
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          processed_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          data?: Json
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          processed_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sound_settings: {
        Row: {
          duration_seconds: number | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          is_custom_enabled: boolean
          label: string
          sound_filename: string | null
          sound_storage_path: string | null
          sound_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          duration_seconds?: number | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          is_custom_enabled?: boolean
          label: string
          sound_filename?: string | null
          sound_storage_path?: string | null
          sound_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          duration_seconds?: number | null
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          is_custom_enabled?: boolean
          label?: string
          sound_filename?: string | null
          sound_storage_path?: string | null
          sound_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_sound_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          category: Database["public"]["Enums"]["notification_category"]
          clicked_at: string | null
          created_at: string
          data: Json
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          opened_at: string | null
          priority: Database["public"]["Enums"]["notification_priority"] | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          category?: Database["public"]["Enums"]["notification_category"]
          clicked_at?: string | null
          created_at?: string
          data?: Json
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          opened_at?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          category?: Database["public"]["Enums"]["notification_category"]
          clicked_at?: string | null
          created_at?: string
          data?: Json
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          opened_at?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      on_duty_listings: {
        Row: {
          address: string | null
          created_at: string
          duty_date: string
          id: string
          is_open: boolean
          latitude: number | null
          listing_type: Database["public"]["Enums"]["duty_listing_type"]
          location: unknown
          longitude: number | null
          name: string
          open_until: string | null
          phone: string | null
          region_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          duty_date?: string
          id?: string
          is_open?: boolean
          latitude?: number | null
          listing_type: Database["public"]["Enums"]["duty_listing_type"]
          location?: unknown
          longitude?: number | null
          name: string
          open_until?: string | null
          phone?: string | null
          region_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          duty_date?: string
          id?: string
          is_open?: boolean
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["duty_listing_type"]
          location?: unknown
          longitude?: number | null
          name?: string
          open_until?: string | null
          phone?: string | null
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_duty_listings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_contributions: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          sort_order: number
          vote_count: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          sort_order?: number
          vote_count?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          author_id: string
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          question: string
          region_id: string
          total_votes: number
        }
        Insert: {
          author_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          question: string
          region_id: string
          total_votes?: number
        }
        Update: {
          author_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          question?: string
          region_id?: string
          total_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "polls_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean
          like_count: number
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          like_count?: number
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          like_count?: number
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          hashtag_id: string
          post_id: string
        }
        Insert: {
          hashtag_id: string
          post_id: string
        }
        Update: {
          hashtag_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          collection_id: string | null
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "save_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_verification_votes: {
        Row: {
          created_at: string
          id: string
          verification_id: string
          vote: Database["public"]["Enums"]["verification_vote"]
          voter_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          verification_id: string
          vote: Database["public"]["Enums"]["verification_vote"]
          voter_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          verification_id?: string
          vote?: Database["public"]["Enums"]["verification_vote"]
          voter_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_verification_votes_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "post_verifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_verification_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_verifications: {
        Row: {
          created_at: string
          id: string
          misinfo_votes: number
          post_id: string
          region_id: string
          reviewing_votes: number
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          verified_votes: number
        }
        Insert: {
          created_at?: string
          id?: string
          misinfo_votes?: number
          post_id: string
          region_id: string
          reviewing_votes?: number
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_votes?: number
        }
        Update: {
          created_at?: string
          id?: string
          misinfo_votes?: number
          post_id?: string
          region_id?: string
          reviewing_votes?: number
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          verified_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_verifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_verifications_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          is_unique: boolean
          post_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_unique?: boolean
          post_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_unique?: boolean
          post_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          audience: Database["public"]["Enums"]["post_audience"]
          author_id: string
          category: Database["public"]["Enums"]["post_category"]
          comment_count: number
          community_id: string | null
          content: string
          created_at: string
          district: string | null
          edit_manifest: Json | null
          id: string
          incident_id: string | null
          is_pinned: boolean
          is_sensitive: boolean
          latitude: number | null
          like_count: number
          location: unknown
          location_label: string | null
          longitude: number | null
          media_urls: string[]
          music_end_sec: number | null
          music_start_sec: number | null
          music_track_id: string | null
          music_volume: number | null
          original_audio_volume: number | null
          pin_priority: number
          pinned_at: string | null
          pinned_by: string | null
          pinned_until: string | null
          post_type: Database["public"]["Enums"]["post_type"]
          quote_count: number
          quoted_post_id: string | null
          region_id: string
          requires_moderation: boolean
          save_count: number
          status: Database["public"]["Enums"]["content_status"]
          title: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          audience?: Database["public"]["Enums"]["post_audience"]
          author_id: string
          category?: Database["public"]["Enums"]["post_category"]
          comment_count?: number
          community_id?: string | null
          content: string
          created_at?: string
          district?: string | null
          edit_manifest?: Json | null
          id?: string
          incident_id?: string | null
          is_pinned?: boolean
          is_sensitive?: boolean
          latitude?: number | null
          like_count?: number
          location?: unknown
          location_label?: string | null
          longitude?: number | null
          media_urls?: string[]
          music_end_sec?: number | null
          music_start_sec?: number | null
          music_track_id?: string | null
          music_volume?: number | null
          original_audio_volume?: number | null
          pin_priority?: number
          pinned_at?: string | null
          pinned_by?: string | null
          pinned_until?: string | null
          post_type?: Database["public"]["Enums"]["post_type"]
          quote_count?: number
          quoted_post_id?: string | null
          region_id: string
          requires_moderation?: boolean
          save_count?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["post_audience"]
          author_id?: string
          category?: Database["public"]["Enums"]["post_category"]
          comment_count?: number
          community_id?: string | null
          content?: string
          created_at?: string
          district?: string | null
          edit_manifest?: Json | null
          id?: string
          incident_id?: string | null
          is_pinned?: boolean
          is_sensitive?: boolean
          latitude?: number | null
          like_count?: number
          location?: unknown
          location_label?: string | null
          longitude?: number | null
          media_urls?: string[]
          music_end_sec?: number | null
          music_start_sec?: number | null
          music_track_id?: string | null
          music_volume?: number | null
          original_audio_volume?: number | null
          pin_priority?: number
          pinned_at?: string | null
          pinned_by?: string | null
          pinned_until?: string | null
          post_type?: Database["public"]["Enums"]["post_type"]
          quote_count?: number
          quoted_post_id?: string | null
          region_id?: string
          requires_moderation?: boolean
          save_count?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_quoted_post_id_fkey"
            columns: ["quoted_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_subscriptions: {
        Row: {
          apple_original_transaction_id: string | null
          apple_product_id: string | null
          cancel_at_period_end: boolean
          created_at: string
          expires_at: string
          id: string
          payment_provider: Database["public"]["Enums"]["premium_payment_provider"]
          plan: Database["public"]["Enums"]["premium_plan"]
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          apple_original_transaction_id?: string | null
          apple_product_id?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          expires_at: string
          id?: string
          payment_provider?: Database["public"]["Enums"]["premium_payment_provider"]
          plan?: Database["public"]["Enums"]["premium_plan"]
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          apple_original_transaction_id?: string | null
          apple_product_id?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          payment_provider?: Database["public"]["Enums"]["premium_payment_provider"]
          plan?: Database["public"]["Enums"]["premium_plan"]
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_snapshots: {
        Row: {
          change_pct: number | null
          id: string
          recorded_at: string
          source: string | null
          symbol_id: string
          value: number
        }
        Insert: {
          change_pct?: number | null
          id?: string
          recorded_at?: string
          source?: string | null
          symbol_id: string
          value: number
        }
        Update: {
          change_pct?: number | null
          id?: string
          recorded_at?: string
          source?: string | null
          symbol_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_symbol_id_fkey"
            columns: ["symbol_id"]
            isOneToOne: false
            referencedRelation: "price_symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      price_symbols: {
        Row: {
          id: string
          label: string
          sort_order: number
          symbol_key: Database["public"]["Enums"]["price_symbol_key"]
          unit: string
        }
        Insert: {
          id?: string
          label: string
          sort_order?: number
          symbol_key: Database["public"]["Enums"]["price_symbol_key"]
          unit?: string
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number
          symbol_key?: Database["public"]["Enums"]["price_symbol_key"]
          unit?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          account_type: Database["public"]["Enums"]["account_type"]
          address: string | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_name: string | null
          bio: string | null
          birth_date: string | null
          contribution_score: number
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_requested_at: string | null
          district: string | null
          first_name: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          hidden_badges: string[]
          iban: string | null
          id: string
          interests: string[]
          is_guest: boolean
          izdivac_access_granted: boolean
          is_premium: boolean
          is_verified: boolean
          last_name: string | null
          last_seen_at: string | null
          messaging_prefs: Json
          news_verification_granted: boolean
          notification_prefs: Json
          occupation: string | null
          onboarding_completed: boolean
          policy_consents: Json
          profile_boosted_until: string | null
          profile_visibility: Database["public"]["Enums"]["profile_visibility"]
          publisher_key: string
          quarantine_reason: string | null
          quarantined_at: string | null
          quarantined_by: string | null
          quiet_hours: Json
          region_id: string | null
          reporter_level: number
          role: Database["public"]["Enums"]["user_role"]
          safety_preferences: Json
          show_liked_posts: boolean
          show_profile_views: boolean
          stripe_customer_id: string | null
          trust_score: number
          updated_at: string
          username: string
          verified_content_count: number
        }
        Insert: {
          account_status?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          address?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bio?: string | null
          birth_date?: string | null
          contribution_score?: number
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_requested_at?: string | null
          district?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hidden_badges?: string[]
          iban?: string | null
          id: string
          interests?: string[]
          is_guest?: boolean
          izdivac_access_granted?: boolean
          is_premium?: boolean
          is_verified?: boolean
          last_name?: string | null
          last_seen_at?: string | null
          messaging_prefs?: Json
          news_verification_granted?: boolean
          notification_prefs?: Json
          occupation?: string | null
          onboarding_completed?: boolean
          policy_consents?: Json
          profile_boosted_until?: string | null
          profile_visibility?: Database["public"]["Enums"]["profile_visibility"]
          publisher_key?: string
          quarantine_reason?: string | null
          quarantined_at?: string | null
          quarantined_by?: string | null
          quiet_hours?: Json
          region_id?: string | null
          reporter_level?: number
          role?: Database["public"]["Enums"]["user_role"]
          safety_preferences?: Json
          show_liked_posts?: boolean
          show_profile_views?: boolean
          stripe_customer_id?: string | null
          trust_score?: number
          updated_at?: string
          username: string
          verified_content_count?: number
        }
        Update: {
          account_status?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          address?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bio?: string | null
          birth_date?: string | null
          contribution_score?: number
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_requested_at?: string | null
          district?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hidden_badges?: string[]
          iban?: string | null
          id?: string
          interests?: string[]
          is_guest?: boolean
          izdivac_access_granted?: boolean
          is_premium?: boolean
          is_verified?: boolean
          last_name?: string | null
          last_seen_at?: string | null
          messaging_prefs?: Json
          news_verification_granted?: boolean
          notification_prefs?: Json
          occupation?: string | null
          onboarding_completed?: boolean
          policy_consents?: Json
          profile_boosted_until?: string | null
          profile_visibility?: Database["public"]["Enums"]["profile_visibility"]
          publisher_key?: string
          quarantine_reason?: string | null
          quarantined_at?: string | null
          quarantined_by?: string | null
          quiet_hours?: Json
          region_id?: string | null
          reporter_level?: number
          role?: Database["public"]["Enums"]["user_role"]
          safety_preferences?: Json
          show_liked_posts?: boolean
          show_profile_views?: boolean
          stripe_customer_id?: string | null
          trust_score?: number
          updated_at?: string
          username?: string
          verified_content_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_quarantined_by_fkey"
            columns: ["quarantined_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          device_push_token: string | null
          expo_push_token: string | null
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["push_platform"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          device_push_token?: string | null
          expo_push_token?: string | null
          id?: string
          is_active?: boolean
          platform: Database["public"]["Enums"]["push_platform"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          device_push_token?: string | null
          expo_push_token?: string | null
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["push_platform"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          action_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean
          like_count: number
          parent_id: string | null
          reel_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          like_count?: number
          parent_id?: string | null
          reel_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          like_count?: number
          parent_id?: string | null
          reel_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_complete_views: {
        Row: {
          created_at: string
          reel_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          reel_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          reel_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_complete_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_complete_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_saves: {
        Row: {
          created_at: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_saves_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_views: {
        Row: {
          created_at: string
          reel_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          reel_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          reel_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          author_id: string
          caption: string | null
          comment_count: number
          completed_view_count: number
          completion_rate: number
          created_at: string
          edit_manifest: Json | null
          id: string
          is_pinned: boolean
          is_sensitive: boolean
          like_count: number
          music_end_sec: number | null
          music_start_sec: number | null
          music_track_id: string | null
          music_volume: number | null
          original_audio_volume: number | null
          pin_priority: number
          pinned_at: string | null
          pinned_by: string | null
          pinned_until: string | null
          region_id: string
          requires_moderation: boolean
          save_count: number
          share_count: number
          source_post_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          video_id: string
          view_count: number
        }
        Insert: {
          author_id: string
          caption?: string | null
          comment_count?: number
          completed_view_count?: number
          completion_rate?: number
          created_at?: string
          edit_manifest?: Json | null
          id?: string
          is_pinned?: boolean
          is_sensitive?: boolean
          like_count?: number
          music_end_sec?: number | null
          music_start_sec?: number | null
          music_track_id?: string | null
          music_volume?: number | null
          original_audio_volume?: number | null
          pin_priority?: number
          pinned_at?: string | null
          pinned_by?: string | null
          pinned_until?: string | null
          region_id: string
          requires_moderation?: boolean
          save_count?: number
          share_count?: number
          source_post_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          video_id: string
          view_count?: number
        }
        Update: {
          author_id?: string
          caption?: string | null
          comment_count?: number
          completed_view_count?: number
          completion_rate?: number
          created_at?: string
          edit_manifest?: Json | null
          id?: string
          is_pinned?: boolean
          is_sensitive?: boolean
          like_count?: number
          music_end_sec?: number | null
          music_start_sec?: number | null
          music_track_id?: string | null
          music_volume?: number | null
          original_audio_volume?: number | null
          pin_priority?: number
          pinned_at?: string | null
          pinned_by?: string | null
          pinned_until?: string | null
          region_id?: string
          requires_moderation?: boolean
          save_count?: number
          share_count?: number
          source_post_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          video_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "reels_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_alert_subscriptions: {
        Row: {
          created_at: string
          districts: string[]
          neighborhoods: string[]
          notify_emergency: boolean
          notify_events: boolean
          notify_incidents: boolean
          notify_jobs: boolean
          region_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          districts?: string[]
          neighborhoods?: string[]
          notify_emergency?: boolean
          notify_events?: boolean
          notify_incidents?: boolean
          notify_jobs?: boolean
          region_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          districts?: string[]
          neighborhoods?: string[]
          notify_emergency?: boolean
          notify_events?: boolean
          notify_incidents?: boolean
          notify_jobs?: boolean
          region_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_alert_subscriptions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regional_alert_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phase: number
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          phase?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phase?: number
        }
        Relationships: []
      }
      reporter_applications: {
        Row: {
          created_at: string
          experience: string | null
          id: string
          motivation: string
          region_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_links: string[]
          status: Database["public"]["Enums"]["reporter_application_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          experience?: string | null
          id?: string
          motivation: string
          region_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_links?: string[]
          status?: Database["public"]["Enums"]["reporter_application_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          experience?: string | null
          id?: string
          motivation?: string
          region_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_links?: string[]
          status?: Database["public"]["Enums"]["reporter_application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporter_applications_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporter_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporter_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_records: {
        Row: {
          amount: number
          currency: string
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          reference_id: string | null
          reference_label: string | null
          region_id: string | null
          revenue_type: Database["public"]["Enums"]["revenue_type"]
        }
        Insert: {
          amount: number
          currency?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          reference_id?: string | null
          reference_label?: string | null
          region_id?: string | null
          revenue_type: Database["public"]["Enums"]["revenue_type"]
        }
        Update: {
          amount?: number
          currency?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          reference_id?: string | null
          reference_label?: string | null
          region_id?: string | null
          revenue_type?: Database["public"]["Enums"]["revenue_type"]
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_records_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      save_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "save_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_broadcasts: {
        Row: {
          body: string
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          created_at: string
          created_by: string
          id: string
          is_cancelled: boolean
          is_sent: boolean
          region_id: string | null
          scheduled_at: string
          sent_at: string | null
          title: string
        }
        Insert: {
          body: string
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          created_at?: string
          created_by: string
          id?: string
          is_cancelled?: boolean
          is_sent?: boolean
          region_id?: string | null
          scheduled_at: string
          sent_at?: string | null
          title: string
        }
        Update: {
          body?: string
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          created_at?: string
          created_by?: string
          id?: string
          is_cancelled?: boolean
          is_sent?: boolean
          region_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_broadcasts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      staff_requests: {
        Row: {
          author_id: string
          business_id: string | null
          created_at: string
          description: string
          district: string | null
          housing_provided: boolean
          id: string
          is_urgent: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          latitude: number | null
          location: unknown
          location_label: string | null
          longitude: number | null
          meal_provided: boolean
          needed_by: string | null
          positions: string[]
          positions_count: number | null
          region_id: string
          salary_range: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Insert: {
          author_id: string
          business_id?: string | null
          created_at?: string
          description: string
          district?: string | null
          housing_provided?: boolean
          id?: string
          is_urgent?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          latitude?: number | null
          location?: unknown
          location_label?: string | null
          longitude?: number | null
          meal_provided?: boolean
          needed_by?: string | null
          positions?: string[]
          positions_count?: number | null
          region_id: string
          salary_range?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Update: {
          author_id?: string
          business_id?: string | null
          created_at?: string
          description?: string
          district?: string | null
          housing_provided?: boolean
          id?: string
          is_urgent?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          latitude?: number | null
          location?: unknown
          location_label?: string | null
          longitude?: number | null
          meal_provided?: boolean
          needed_by?: string | null
          positions?: string[]
          positions_count?: number | null
          region_id?: string
          salary_range?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_requests_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_id: string | null
          admin_note: string | null
          category: string
          created_at: string
          id: string
          lifecycle_request_id: string | null
          message: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_note?: string | null
          category?: string
          created_at?: string
          id?: string
          lifecycle_request_id?: string | null
          message: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_note?: string | null
          category?: string
          created_at?: string
          id?: string
          lifecycle_request_id?: string | null
          message?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_lifecycle_request_id_fkey"
            columns: ["lifecycle_request_id"]
            isOneToOne: false
            referencedRelation: "account_lifecycle_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tourism_places: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["tourism_category"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string
          rating: number | null
          region_id: string
        }
        Insert: {
          address?: string | null
          category: Database["public"]["Enums"]["tourism_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name: string
          rating?: number | null
          region_id: string
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["tourism_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string
          rating?: number | null
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tourism_places_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_reports: {
        Row: {
          author_id: string
          confirm_count: number
          created_at: string
          description: string | null
          district: string | null
          expires_at: string
          id: string
          is_active: boolean
          latitude: number | null
          location: unknown
          longitude: number | null
          region_id: string
          report_type: Database["public"]["Enums"]["traffic_report_type"]
          title: string
        }
        Insert: {
          author_id: string
          confirm_count?: number
          created_at?: string
          description?: string | null
          district?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          region_id: string
          report_type: Database["public"]["Enums"]["traffic_report_type"]
          title: string
        }
        Update: {
          author_id?: string
          confirm_count?: number
          created_at?: string
          description?: string | null
          district?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          region_id?: string
          report_type?: Database["public"]["Enums"]["traffic_report_type"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_reports_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_topics: {
        Row: {
          comment_count: number
          computed_at: string
          id: string
          like_count: number
          period: string
          post_count: number
          quote_count: number
          rank: number
          region_id: string | null
          scope: string
          tag: string
          trend_score: number
          view_count: number
        }
        Insert: {
          comment_count?: number
          computed_at?: string
          id?: string
          like_count?: number
          period: string
          post_count?: number
          quote_count?: number
          rank?: number
          region_id?: string | null
          scope: string
          tag: string
          trend_score?: number
          view_count?: number
        }
        Update: {
          comment_count?: number
          computed_at?: string
          id?: string
          like_count?: number
          period?: string
          post_count?: number
          quote_count?: number
          rank?: number
          region_id?: string | null
          scope?: string
          tag?: string
          trend_score?: number
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "trending_topics_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_videos: {
        Row: {
          category: Database["public"]["Enums"]["tv_video_category"]
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_featured: boolean
          mux_playback_id: string | null
          region_id: string | null
          thumbnail_url: string | null
          title: string
          view_count: number
        }
        Insert: {
          category: Database["public"]["Enums"]["tv_video_category"]
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean
          mux_playback_id?: string | null
          region_id?: string | null
          thumbnail_url?: string | null
          title: string
          view_count?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["tv_video_category"]
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean
          mux_playback_id?: string | null
          region_id?: string | null
          thumbnail_url?: string | null
          title?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tv_videos_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: Database["public"]["Enums"]["badge_type"]
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          banned_by: string
          created_at: string
          duration: Database["public"]["Enums"]["ban_duration"]
          expires_at: string | null
          id: string
          is_active: boolean
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          duration: Database["public"]["Enums"]["ban_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          duration?: Database["public"]["Enums"]["ban_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_lifted_by_fkey"
            columns: ["lifted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          is_restricted: boolean
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          is_restricted?: boolean
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          is_restricted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_kuru_balances: {
        Row: {
          balance: number
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_kuru_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mutes: {
        Row: {
          created_at: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_active_at: string | null
          last_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_active_at?: string | null
          last_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_active_at?: string | null
          last_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recent_music: {
        Row: {
          track_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          track_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          track_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recent_music_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_music_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_name: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_current: boolean
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          last_active_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          issued_by: string
          level: Database["public"]["Enums"]["warning_level"]
          reason: string
          report_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by: string
          level?: Database["public"]["Enums"]["warning_level"]
          reason: string
          report_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by?: string
          level?: Database["public"]["Enums"]["warning_level"]
          reason?: string
          report_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vcts_audit_ledger: {
        Row: {
          action: string
          author_id: string
          content_hash: string
          created_at: string
          id: string
          metadata: Json
          post_id: string
          publisher_key: string
          trust_code: string
        }
        Insert: {
          action: string
          author_id: string
          content_hash: string
          created_at?: string
          id?: string
          metadata?: Json
          post_id: string
          publisher_key: string
          trust_code: string
        }
        Update: {
          action?: string
          author_id?: string
          content_hash?: string
          created_at?: string
          id?: string
          metadata?: Json
          post_id?: string
          publisher_key?: string
          trust_code?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          owner_id: string
          region_id: string
          status: Database["public"]["Enums"]["video_status"]
          thumbnail_url: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          owner_id: string
          region_id: string
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_url?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          owner_id?: string
          region_id?: string
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_team_members: {
        Row: {
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "volunteer_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_teams: {
        Row: {
          category: Database["public"]["Enums"]["volunteer_team_category"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_suspended: boolean
          leader_id: string | null
          member_count: number
          name: string
          region_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["volunteer_team_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          leader_id?: string | null
          member_count?: number
          name: string
          region_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["volunteer_team_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          leader_id?: string | null
          member_count?: number
          name?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_teams_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      vora_studio_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          ffmpeg_commands: Json
          id: string
          manifest: Json
          output_storage_path: string | null
          source_storage_path: string | null
          status: string
          thumbnail_storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          ffmpeg_commands?: Json
          id?: string
          manifest?: Json
          output_storage_path?: string | null
          source_storage_path?: string | null
          status?: string
          thumbnail_storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          ffmpeg_commands?: Json
          id?: string
          manifest?: Json
          output_storage_path?: string | null
          source_storage_path?: string | null
          status?: string
          thumbnail_storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_studio_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_group_members: {
        Args: { p_conversation_id: string; p_member_ids: string[] }
        Returns: number
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      adjust_contribution_score: {
        Args: { p_delta: number; p_user_id: string }
        Returns: undefined
      }
      adjust_kuru_balance: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_idempotency_key?: string
          p_note?: string
          p_reference_id?: string
          p_source_key?: string
          p_source_type?: Database["public"]["Enums"]["kuru_source_type"]
          p_tx_type: Database["public"]["Enums"]["kuru_transaction_type"]
          p_user_id: string
        }
        Returns: number
      }
      adjust_trust_score: {
        Args: { p_delta: number; p_user_id: string }
        Returns: undefined
      }
      adjust_trust_score_test: {
        Args: { p_delta: number; p_user_id: string }
        Returns: undefined
      }
      admin_account_lifecycle_stats: { Args: never; Returns: Json }
      admin_adjust_kuru: {
        Args: { p_amount: number; p_note?: string; p_user_id: string }
        Returns: Json
      }
      admin_approve_identity_verification: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_ban_user: {
        Args: {
          p_duration: Database["public"]["Enums"]["ban_duration"]
          p_reason: string
          p_user_id: string
        }
        Returns: string
      }
      admin_cancel_delivery_order: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_cancel_scheduled_broadcast: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_cancel_stripe_subscription: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      admin_cancel_user_deletion: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_cancel_vora_studio_job: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      admin_center_stats: { Args: never; Returns: Json }
      admin_check_permission: {
        Args: { p_permission_key: string }
        Returns: boolean
      }
      admin_create_daily_task: {
        Args: {
          p_description: string
          p_key: string
          p_reward_key?: string
          p_reward_type: Database["public"]["Enums"]["task_reward_type"]
          p_reward_value: number
          p_sort_order?: number
          p_target_count: number
          p_title: string
        }
        Returns: undefined
      }
      admin_create_scheduled_broadcast: {
        Args: {
          p_body: string
          p_broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          p_region_id?: string
          p_scheduled_at: string
          p_title: string
        }
        Returns: string
      }
      admin_create_tv_video: {
        Args: {
          p_category: Database["public"]["Enums"]["tv_video_category"]
          p_description?: string
          p_mux_playback_id?: string
          p_region_id?: string
          p_thumbnail_url?: string
          p_title: string
        }
        Returns: string
      }
      admin_deactivate_local_deal: {
        Args: { p_deal_id: string }
        Returns: undefined
      }
      admin_deactivate_poll: { Args: { p_poll_id: string }; Returns: undefined }
      admin_deactivate_traffic_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      admin_delete_daily_agenda: { Args: { p_id: string }; Returns: undefined }
      admin_delete_scheduled_broadcast: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_user_account: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_emergency_quarantine_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_feature_discovery_item: {
        Args: {
          p_days?: number
          p_priority?: number
          p_region_id?: string
          p_scope?: string
          p_tab: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      admin_get_messaging_context: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: Json
      }
      admin_get_role_permissions: { Args: never; Returns: Json }
      admin_get_stripe_payment_for_refund: {
        Args: { p_payment_type: string; p_record_id: string }
        Returns: Json
      }
      admin_get_system_config: { Args: never; Returns: Json }
      admin_get_user_activity_timeline: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          detail: string
          event_type: string
          metadata: Json
          title: string
        }[]
      }
      admin_get_user_contact_fields: {
        Args: { p_user_id: string }
        Returns: {
          address: string
          bank_account_name: string
          bank_name: string
          iban: string
        }[]
      }
      admin_get_user_email: { Args: { p_user_id: string }; Returns: string }
      admin_get_user_kuru: { Args: { p_user_id: string }; Returns: Json }
      admin_grant_profile_boost: {
        Args: { p_days?: number; p_user_id: string }
        Returns: undefined
      }
      admin_kuru_stats: { Args: never; Returns: Json }
      admin_lift_ban: { Args: { p_user_id: string }; Returns: undefined }
      admin_list_account_lifecycle_requests: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          account_status_snapshot: string
          admin_note: string
          created_at: string
          current_account_status: string
          deleted_at: string
          deletion_requested_at: string
          full_name: string
          id: string
          message: string
          profile_created_at: string
          request_type: string
          resolved_at: string
          status: string
          user_id: string
          username: string
        }[]
      }
      admin_list_ai_moderation_queue: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          created_at: string
          flags: Json
          id: string
          provider: string
          score: number
          target_id: string
          target_type: string
          text_sample: string
          user_id: string
          username: string
        }[]
      }
      admin_list_anonymous_tips: {
        Args: {
          p_limit?: number
          p_status?: Database["public"]["Enums"]["tip_moderation_status"]
        }
        Returns: {
          category: Database["public"]["Enums"]["tip_category"]
          created_at: string
          description: string
          id: string
          moderation_status: Database["public"]["Enums"]["tip_moderation_status"]
          region_id: string
        }[]
      }
      admin_list_appeals: {
        Args: {
          p_limit?: number
          p_status?: Database["public"]["Enums"]["appeal_status"]
        }
        Returns: {
          appeal_type: Database["public"]["Enums"]["appeal_type"]
          created_at: string
          id: string
          reason: string
          reference_id: string
          reference_type: string
          status: Database["public"]["Enums"]["appeal_status"]
          user_id: string
          username: string
        }[]
      }
      admin_list_business_ads: {
        Args: {
          p_limit?: number
          p_status?: Database["public"]["Enums"]["ad_status"]
        }
        Returns: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          budget_cents: number
          clicks: number
          created_at: string
          description: string
          id: string
          impressions: number
          owner_id: string
          owner_username: string
          status: Database["public"]["Enums"]["ad_status"]
          title: string
        }[]
      }
      admin_list_business_campaigns: {
        Args: { p_limit?: number }
        Returns: {
          business_id: string
          business_name: string
          created_at: string
          description: string
          ends_at: string
          id: string
          owner_username: string
          starts_at: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
        }[]
      }
      admin_list_call_sessions: {
        Args: { p_limit?: number }
        Returns: {
          call_type: string
          callee_id: string
          callee_username: string
          caller_id: string
          caller_username: string
          channel_name: string
          created_at: string
          ended_at: string
          id: string
          started_at: string
          status: string
        }[]
      }
      admin_list_channels: {
        Args: { p_limit?: number }
        Returns: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          id: string
          is_suspended: boolean
          is_verified: boolean
          name: string
          owner_id: string
          owner_username: string
          region_id: string
          slug: string
          subscriber_count: number
        }[]
      }
      admin_list_city_scores: {
        Args: { p_limit?: number }
        Returns: {
          cleanliness_score: number
          id: string
          quality_score: number
          region_id: string
          security_score: number
          traffic_score: number
          updated_at: string
          vote_count: number
        }[]
      }
      admin_list_communities:
        | {
            Args: { p_limit?: number }
            Returns: {
              category: string
              created_at: string
              created_by: string
              id: string
              is_suspended: boolean
              member_count: number
              name: string
              owner_username: string
              post_count: number
              region_id: string
              slug: string
            }[]
          }
        | {
            Args: { p_limit?: number; p_offset?: number; p_search?: string }
            Returns: {
              category: string
              created_at: string
              created_by: string
              id: string
              is_suspended: boolean
              member_count: number
              name: string
              owner_username: string
              post_count: number
              region_id: string
              slug: string
            }[]
          }
      admin_list_content_trust_records: {
        Args: { p_limit?: number }
        Returns: {
          content_type: Database["public"]["Enums"]["vcts_content_type"]
          created_at: string
          id: string
          post_id: string
          publisher_key: string
          status: Database["public"]["Enums"]["vcts_trust_status"]
          trust_code: string
        }[]
      }
      admin_list_daily_agenda: {
        Args: { p_limit?: number }
        Returns: {
          agenda_date: string
          created_at: string
          id: string
          is_manual: boolean
          label: string
          priority: number
          region_id: string
          scope: string
          tag: string
        }[]
      }
      admin_list_daily_summaries: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          region_id: string
          summary_date: string
          summary_text: string
        }[]
      }
      admin_list_daily_tasks: {
        Args: never
        Returns: {
          description: string
          is_active: boolean
          key: string
          reward_key: string | null
          reward_type: Database["public"]["Enums"]["task_reward_type"]
          reward_value: number
          sort_order: number
          target_count: number
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "daily_task_definitions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_delivery_orders: {
        Args: { p_limit?: number }
        Returns: {
          business_id: string
          created_at: string
          customer_name: string
          id: string
          status: string
          tracking_code: string
        }[]
      }
      admin_list_discovery_featured: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          featured_by_username: string
          featured_until: string
          id: string
          priority: number
          region_id: string
          scope: string
          tab: string
          target_id: string
          target_label: string
          target_type: string
        }[]
      }
      admin_list_duty_listings: {
        Args: { p_limit?: number }
        Returns: {
          address: string
          created_at: string
          duty_date: string
          id: string
          is_open: boolean
          listing_type: string
          name: string
          phone: string
          region_id: string
        }[]
      }
      admin_list_event_checkins: {
        Args: { p_event_id: string; p_limit?: number }
        Returns: {
          checked_in_at: string
          id: string
          user_id: string
          username: string
        }[]
      }
      admin_list_event_tickets: {
        Args: { p_event_id?: string; p_limit?: number }
        Returns: {
          amount_cents: number
          created_at: string
          event_id: string
          event_title: string
          id: string
          status: string
          user_id: string
          username: string
        }[]
      }
      admin_list_hashtags:
        | {
            Args: { p_limit?: number }
            Returns: {
              created_at: string
              id: string
              is_featured: boolean
              is_hidden: boolean
              post_count: number
              tag: string
            }[]
          }
        | {
            Args: { p_limit?: number; p_offset?: number; p_search?: string }
            Returns: {
              created_at: string
              id: string
              is_featured: boolean
              is_hidden: boolean
              post_count: number
              tag: string
            }[]
          }
      admin_list_help_requests: {
        Args: { p_limit?: number }
        Returns: {
          author_username: string
          category: Database["public"]["Enums"]["help_request_category"]
          created_at: string
          id: string
          is_resolved: boolean
          region_id: string
          title: string
          urgency: Database["public"]["Enums"]["help_urgency"]
        }[]
      }
      admin_list_identity_verifications: {
        Args: {
          p_limit?: number
          p_status?: Database["public"]["Enums"]["identity_verification_status"]
        }
        Returns: {
          applicant_name: string
          birth_date: string
          created_at: string
          document_type: Database["public"]["Enums"]["identity_document_type"]
          full_name: string
          id: string
          id_back_path: string
          id_front_path: string
          rejection_reason: string
          selfie_path: string
          status: Database["public"]["Enums"]["identity_verification_status"]
          user_id: string
          username: string
        }[]
      }
      admin_list_job_seekers: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          is_ready: boolean
          is_visible_on_map: boolean
          occupation: string
          region_id: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          user_id: string
          username: string
        }[]
      }
      admin_list_kuru_transactions: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          note: string
          source_key: string
          source_type: Database["public"]["Enums"]["kuru_source_type"]
          tx_type: Database["public"]["Enums"]["kuru_transaction_type"]
          user_id: string
          username: string
        }[]
      }
      admin_list_local_deals: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          id: string
          is_active: boolean
          region_id: string
          title: string
        }[]
      }
      admin_list_marketplace_listings: {
        Args: { p_limit?: number }
        Returns: {
          author_id: string
          category: Database["public"]["Enums"]["marketplace_category"]
          content_status: Database["public"]["Enums"]["content_status"]
          created_at: string
          favorite_count: number
          id: string
          price: number
          region_id: string
          status: Database["public"]["Enums"]["marketplace_listing_status"]
          title: string
        }[]
      }
      admin_list_marketplace_orders: {
        Args: { p_filter?: string; p_limit?: number }
        Returns: {
          buyer_name: string
          commission_cents: number
          created_at: string
          gross_amount_cents: number
          id: string
          listing_title: string
          order_number: string
          paid_at: string
          payout_completed_at: string
          payout_due_at: string
          seller_name: string
          seller_net_cents: number
          status: Database["public"]["Enums"]["marketplace_order_status"]
        }[]
      }
      admin_list_marketplace_payout_profiles: {
        Args: { p_limit?: number }
        Returns: {
          account_holder: string
          bank_name: string
          iban: string
          seller_name: string
          seller_username: string
          updated_at: string
          user_id: string
          verified_at: string
        }[]
      }
      admin_list_messaging_reports: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reporter_username: string
          status: Database["public"]["Enums"]["report_queue_status"]
          target_id: string
          target_type: string
        }[]
      }
      admin_list_moderation_logs: {
        Args: { p_action?: string; p_limit?: number }
        Returns: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          moderator_username: string
          reason: string
          target_id: string
          target_type: string
        }[]
      }
      admin_list_news_verification_owners: {
        Args: { p_limit?: number }
        Returns: {
          author_id: string
          author_username: string
          correct_count: number
          incorrect_count: number
          last_verification_at: string
          total_verifications: number
        }[]
      }
      admin_list_news_verifications: {
        Args: { p_limit?: number }
        Returns: {
          author_id: string
          author_username: string
          content_correct_count: number
          content_incorrect_count: number
          content_snippet: string
          content_type: string
          created_at: string
          id: string
          note: string
          post_id: string
          reel_id: string
          reporter_id: string
          reporter_username: string
          result: Database["public"]["Enums"]["news_verification_result"]
          score_delta: number
        }[]
      }
      admin_list_pinned_posts: {
        Args: { p_limit?: number }
        Returns: {
          author_id: string
          author_username: string
          content: string
          like_count: number
          pin_priority: number
          pinned_at: string
          pinned_by: string
          pinned_by_username: string
          pinned_until: string
          post_id: string
          region_id: string
          title: string
          view_count: number
        }[]
      }
      admin_list_pinned_reels: {
        Args: { p_limit?: number }
        Returns: {
          author_id: string
          author_username: string
          caption: string
          like_count: number
          pin_priority: number
          pinned_at: string
          pinned_by: string
          pinned_by_username: string
          pinned_until: string
          reel_id: string
          region_id: string
          view_count: number
        }[]
      }
      admin_list_polls: {
        Args: { p_limit?: number }
        Returns: {
          author_username: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          region_id: string
          total_votes: number
        }[]
      }
      admin_list_post_verifications: {
        Args: {
          p_limit?: number
          p_status?: Database["public"]["Enums"]["verification_status"]
        }
        Returns: {
          created_at: string
          id: string
          misinfo_votes: number
          post_id: string
          region_id: string
          reviewing_votes: number
          status: Database["public"]["Enums"]["verification_status"]
          verified_votes: number
        }[]
      }
      admin_list_premium_subscriptions: {
        Args: { p_limit?: number }
        Returns: {
          apple_original_transaction_id: string
          apple_product_id: string
          created_at: string
          expires_at: string
          full_name: string
          id: string
          payment_provider: string
          plan: string
          starts_at: string
          status: string
          user_id: string
          username: string
        }[]
      }
      admin_list_price_data: {
        Args: { p_limit?: number }
        Returns: {
          change_pct: number
          label: string
          recorded_at: string
          symbol_id: string
          symbol_key: string
          unit: string
          value: number
        }[]
      }
      admin_list_profile_boosts: {
        Args: { p_limit?: number }
        Returns: {
          is_premium: boolean
          profile_boosted_until: string
          user_id: string
          username: string
        }[]
      }
      admin_list_reporter_applications: {
        Args: {
          p_limit?: number
          p_status?: Database["public"]["Enums"]["reporter_application_status"]
        }
        Returns: {
          created_at: string
          experience: string
          full_name: string
          id: string
          motivation: string
          region_id: string
          status: Database["public"]["Enums"]["reporter_application_status"]
          user_id: string
          username: string
        }[]
      }
      admin_list_revenue_records: {
        Args: { p_limit?: number; p_type?: string }
        Returns: {
          amount: number
          currency: string
          id: string
          recorded_at: string
          reference_label: string
          revenue_type: string
        }[]
      }
      admin_list_scheduled_broadcasts: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          created_at: string
          id: string
          is_cancelled: boolean
          is_sent: boolean
          region_id: string
          scheduled_at: string
          title: string
        }[]
      }
      admin_list_staff_requests: {
        Args: { p_limit?: number }
        Returns: {
          author_username: string
          created_at: string
          description: string
          id: string
          job_type: string
          region_id: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
        }[]
      }
      admin_list_stripe_payments: {
        Args: { p_limit?: number }
        Returns: {
          amount_cents: number
          created_at: string
          id: string
          label: string
          paid_at: string
          payment_type: string
          status: string
          stripe_payment_intent_id: string
          user_id: string
          username: string
        }[]
      }
      admin_list_stripe_subscriptions: {
        Args: { p_limit?: number }
        Returns: {
          cancel_at_period_end: boolean
          expires_at: string
          id: string
          plan: string
          starts_at: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          user_id: string
          username: string
        }[]
      }
      admin_list_support_tickets: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          admin_note: string
          category: string
          created_at: string
          full_name: string
          id: string
          lifecycle_request_id: string
          message: string
          resolved_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      admin_list_tourism_places: {
        Args: { p_limit?: number }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          is_featured: boolean
          name: string
          rating: number
          region_id: string
        }[]
      }
      admin_list_traffic_reports: {
        Args: { p_limit?: number }
        Returns: {
          author_username: string
          confirm_count: number
          created_at: string
          id: string
          is_active: boolean
          region_id: string
          report_type: Database["public"]["Enums"]["traffic_report_type"]
          title: string
        }[]
      }
      admin_list_tv_videos: {
        Args: { p_limit?: number }
        Returns: {
          category: Database["public"]["Enums"]["tv_video_category"]
          created_at: string
          id: string
          is_featured: boolean
          region_id: string
          title: string
          view_count: number
        }[]
      }
      admin_list_user_blocks: {
        Args: { p_limit?: number }
        Returns: {
          blocked_id: string
          blocked_username: string
          blocker_id: string
          blocker_username: string
          created_at: string
          is_restricted: boolean
        }[]
      }
      admin_list_user_close_friends: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          friend_id: string
          full_name: string
          username: string
        }[]
      }
      admin_list_user_mutes: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          muted_id: string
          muted_username: string
          muter_id: string
          muter_username: string
        }[]
      }
      admin_list_user_sessions: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          device_name: string
          device_type: string
          id: string
          ip_address: string
          is_current: boolean
          last_active_at: string
          user_id: string
          username: string
        }[]
      }
      admin_list_user_warnings: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          issued_by_username: string
          level: string
          reason: string
          user_id: string
          username: string
        }[]
      }
      admin_list_volunteer_teams: {
        Args: { p_limit?: number }
        Returns: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          is_suspended: boolean
          member_count: number
          name: string
          region_id: string
        }[]
      }
      admin_list_vora_studio_jobs: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          error_message: string
          id: string
          status: string
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      admin_lock_conversation: {
        Args: { p_conversation_id: string; p_lock: boolean; p_reason?: string }
        Returns: undefined
      }
      admin_mark_stripe_payment_refunded: {
        Args: { p_payment_type: string; p_record_id: string }
        Returns: undefined
      }
      admin_marketplace_mark_payout: {
        Args: { p_notes?: string; p_order_id: string; p_reference: string }
        Returns: Json
      }
      admin_marketplace_order_refunded: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      admin_marketplace_platform_approve: {
        Args: { p_order_id: string }
        Returns: Json
      }
      admin_moderate_anonymous_tip: {
        Args: { p_approve: boolean; p_tip_id: string }
        Returns: undefined
      }
      admin_moderate_business_campaign: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["content_status"]
        }
        Returns: undefined
      }
      admin_moderator_workload: { Args: never; Returns: Json }
      admin_nearby_region_stats: { Args: never; Returns: Json }
      admin_notification_stats: { Args: { p_days?: number }; Returns: Json }
      admin_override_news_verification: {
        Args: {
          p_id: string
          p_note?: string
          p_result: Database["public"]["Enums"]["news_verification_result"]
        }
        Returns: undefined
      }
      admin_pin_post: {
        Args: { p_days?: number; p_post_id: string; p_priority?: number }
        Returns: undefined
      }
      admin_pin_reel: {
        Args: { p_days?: number; p_priority?: number; p_reel_id: string }
        Returns: undefined
      }
      admin_platform_mute_user: {
        Args: { p_hours?: number; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_preview_broadcast_recipients: {
        Args: { p_region_id?: string; p_role?: string }
        Returns: number
      }
      admin_reactivate_account: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_reject_identity_verification: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      admin_release_quarantine_user: {
        Args: { p_note?: string; p_user_id: string }
        Returns: undefined
      }
      admin_remove_all_user_content: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_remove_close_friend: {
        Args: { p_friend_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_remove_duty_listing: { Args: { p_id: string }; Returns: undefined }
      admin_remove_event: { Args: { p_event_id: string }; Returns: undefined }
      admin_remove_lost_item: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      admin_remove_news_verification: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_remove_tourism_place: { Args: { p_id: string }; Returns: undefined }
      admin_remove_tv_video: {
        Args: { p_video_id: string }
        Returns: undefined
      }
      admin_remove_user_block: {
        Args: { p_blocked_id: string; p_blocker_id: string }
        Returns: undefined
      }
      admin_remove_user_mute: {
        Args: { p_muted_id: string; p_muter_id: string }
        Returns: undefined
      }
      admin_reset_city_score_votes: {
        Args: { p_region_id: string }
        Returns: undefined
      }
      admin_resolve_ai_moderation: {
        Args: { p_action: string; p_log_id: string; p_note?: string }
        Returns: undefined
      }
      admin_resolve_appeal: {
        Args: {
          p_appeal_id: string
          p_lift_ban?: boolean
          p_note?: string
          p_status: Database["public"]["Enums"]["appeal_status"]
        }
        Returns: undefined
      }
      admin_resolve_help_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_resolve_lifecycle_request: {
        Args: {
          p_admin_note?: string
          p_apply_action?: string
          p_request_id: string
          p_status: string
        }
        Returns: undefined
      }
      admin_resolve_report: {
        Args: {
          p_action?: Database["public"]["Enums"]["moderation_action_type"]
          p_report_id: string
          p_resolution_note?: string
          p_status: Database["public"]["Enums"]["report_queue_status"]
        }
        Returns: undefined
      }
      admin_retry_vora_studio_job: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      admin_review_business_ad: {
        Args: { p_ad_id: string; p_approve: boolean; p_note?: string }
        Returns: undefined
      }
      admin_revoke_all_user_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_revoke_profile_boost: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_revoke_user_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      admin_send_broadcast:
        | {
            Args: {
              p_body: string
              p_region_id?: string
              p_title: string
              p_type: Database["public"]["Enums"]["broadcast_type"]
            }
            Returns: number
          }
        | {
            Args: {
              p_body: string
              p_region_id?: string
              p_role?: string
              p_title: string
              p_type: Database["public"]["Enums"]["broadcast_type"]
            }
            Returns: number
          }
      admin_send_emergency: {
        Args: {
          p_body: string
          p_expires_hours?: number
          p_region_id?: string
          p_severity?: Database["public"]["Enums"]["incident_severity"]
          p_title: string
        }
        Returns: string
      }
      admin_set_content_trust_status: {
        Args: {
          p_record_id: string
          p_status: Database["public"]["Enums"]["vcts_trust_status"]
        }
        Returns: undefined
      }
      admin_set_event_promotion: {
        Args: {
          p_event_id: string
          p_is_featured?: boolean
          p_is_sponsored?: boolean
        }
        Returns: undefined
      }
      admin_set_hashtag_flags: {
        Args: { p_featured?: boolean; p_hashtag_id: string; p_hidden?: boolean }
        Returns: undefined
      }
      admin_set_lifecycle_in_progress: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_set_marketplace_listing_content_status: {
        Args: {
          p_listing_id: string
          p_status: Database["public"]["Enums"]["content_status"]
        }
        Returns: undefined
      }
      admin_set_news_verification_granted: {
        Args: { p_granted: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_set_post_verification_status: {
        Args: {
          p_status: Database["public"]["Enums"]["verification_status"]
          p_verification_id: string
        }
        Returns: undefined
      }
      admin_set_role_permission: {
        Args: {
          p_allowed: boolean
          p_permission_key: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      admin_set_tourism_featured: {
        Args: { p_featured: boolean; p_id: string }
        Returns: undefined
      }
      admin_set_tv_video_featured: {
        Args: { p_featured: boolean; p_video_id: string }
        Returns: undefined
      }
      admin_set_user_premium: {
        Args: { p_days?: number; p_is_premium: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_suspend_channel: {
        Args: { p_channel_id: string; p_reason?: string; p_suspend: boolean }
        Returns: undefined
      }
      admin_suspend_community: {
        Args: { p_community_id: string; p_reason?: string; p_suspend: boolean }
        Returns: undefined
      }
      admin_suspend_volunteer_team: {
        Args: { p_suspend: boolean; p_team_id: string }
        Returns: undefined
      }
      admin_terminate_all_call_sessions: { Args: never; Returns: number }
      admin_terminate_call_session: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_unfeature_discovery_item: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_unpin_post: { Args: { p_post_id: string }; Returns: undefined }
      admin_unpin_reel: { Args: { p_reel_id: string }; Returns: undefined }
      admin_update_daily_summary: {
        Args: { p_id: string; p_summary_text: string }
        Returns: undefined
      }
      admin_update_daily_task: {
        Args: {
          p_description: string
          p_is_active: boolean
          p_key: string
          p_reward_value: number
          p_target_count: number
          p_title: string
        }
        Returns: undefined
      }
      admin_update_job_seeker_status: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["content_status"]
        }
        Returns: undefined
      }
      admin_update_post_pin: {
        Args: { p_days?: number; p_post_id: string; p_priority?: number }
        Returns: undefined
      }
      admin_update_reel_pin: {
        Args: { p_days?: number; p_priority?: number; p_reel_id: string }
        Returns: undefined
      }
      admin_update_scheduled_broadcast: {
        Args: {
          p_body: string
          p_broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          p_id: string
          p_scheduled_at: string
          p_title: string
        }
        Returns: undefined
      }
      admin_update_staff_request_status: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["content_status"]
        }
        Returns: undefined
      }
      admin_update_support_ticket: {
        Args: { p_admin_note?: string; p_status: string; p_ticket_id: string }
        Returns: undefined
      }
      admin_update_system_config: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      admin_upsert_daily_agenda: {
        Args: {
          p_id?: string
          p_label?: string
          p_priority?: number
          p_region_id?: string
          p_scope?: string
          p_tag?: string
        }
        Returns: string
      }
      admin_upsert_price_snapshot: {
        Args: { p_change_pct?: number; p_symbol_key: string; p_value: number }
        Returns: undefined
      }
      admin_verify_channel: {
        Args: { p_channel_id: string; p_verified: boolean }
        Returns: undefined
      }
      admin_verify_marketplace_payout_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      archive_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      are_friends: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: boolean
      }
      assert_direct_communication_allowed: {
        Args: { p_from: string; p_to: string }
        Returns: undefined
      }
      award_achievement: {
        Args: { p_key: string; p_user_id: string }
        Returns: undefined
      }
      ban_expires_at: {
        Args: { p_duration: Database["public"]["Enums"]["ban_duration"] }
        Returns: string
      }
      can_user_call_me: {
        Args: { p_recipient_id: string; p_sender_id: string }
        Returns: boolean
      }
      can_user_message_me: {
        Args: { p_recipient_id: string; p_sender_id: string }
        Returns: boolean
      }
      can_view_post_audience: {
        Args: { p_post_id: string; p_viewer_id: string }
        Returns: boolean
      }
      can_view_profile_row: { Args: { p_profile_id: string }; Returns: boolean }
      can_vote_verification: { Args: { p_user_id: string }; Returns: boolean }
      cancel_account_deletion: { Args: never; Returns: undefined }
      cast_verification_vote: {
        Args: {
          p_post_id?: string
          p_region_id: string
          p_vote: Database["public"]["Enums"]["verification_vote"]
          p_voter_id: string
        }
        Returns: undefined
      }
      check_in_event: { Args: { p_qr_token: string }; Returns: Json }
      check_rate_limit: {
        Args: {
          p_action: string
          p_max_count?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      clear_conversation_history: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      clear_explorer_presence: { Args: never; Returns: undefined }
      confirm_guest_auth_email: { Args: { p_email: string }; Returns: boolean }
      create_content_trust_record: {
        Args: {
          p_assets?: Json
          p_content_hash: string
          p_content_type: Database["public"]["Enums"]["vcts_content_type"]
          p_device_platform?: string
          p_ip_hash?: string
          p_location_hash?: string
          p_post_id: string
        }
        Returns: Json
      }
      create_event_conversation: {
        Args: { p_event_id: string; p_organizer_id: string; p_title: string }
        Returns: string
      }
      create_group_conversation: {
        Args: { p_member_ids?: string[]; p_title: string }
        Returns: string
      }
      delete_conversation_for_user: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      discovery_trend_score: {
        Args: {
          p_comments: number
          p_completion_rate?: number
          p_created_at?: string
          p_follower_count?: number
          p_going_count?: number
          p_is_urgent?: boolean
          p_is_verified?: boolean
          p_likes: number
          p_period_hours?: number
          p_quotes: number
          p_saves: number
          p_shares: number
          p_views: number
        }
        Returns: number
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_current_user_profile: { Args: never; Returns: string }
      resolve_login_email: { Args: { p_username: string }; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      event_map_category_for: {
        Args: { p_category: Database["public"]["Enums"]["event_category"] }
        Returns: Database["public"]["Enums"]["event_map_category"]
      }
      expire_post_pins: { Args: never; Returns: undefined }
      expire_reel_pins: { Args: never; Returns: undefined }
      finalize_account_deletion: {
        Args: { p_deleted_by: string; p_user_id: string }
        Returns: undefined
      }
      fulfill_event_ticket: {
        Args: {
          p_amount_cents: number
          p_event_id: string
          p_payment_intent_id: string
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      fulfill_marketplace_order: {
        Args: {
          p_buyer_id: string
          p_gross_cents: number
          p_listing_id: string
          p_payment_intent_id: string
          p_session_id: string
        }
        Returns: string
      }
      fulfill_platform_contribution: {
        Args: {
          p_amount_cents: number
          p_payment_intent_id: string
          p_session_id: string
          p_tier: string
          p_user_id: string
        }
        Returns: undefined
      }
      generate_marketplace_order_number: { Args: never; Returns: string }
      generate_publisher_key: { Args: never; Returns: string }
      generate_trust_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_discovery_featured: {
        Args: { p_region_id: string; p_scope?: string; p_tab: string }
        Returns: {
          priority: number
          target_id: string
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_events: { Args: { p_limit?: number }; Returns: Json }
      get_admin_lost_items: { Args: { p_limit?: number }; Returns: Json }
      get_admin_marketplace_summary: { Args: never; Returns: Json }
      get_admin_revenue_summary: { Args: never; Returns: Json }
      get_admin_statistics: { Args: never; Returns: Json }
      get_admin_stripe_summary: { Args: never; Returns: Json }
      get_content_verification_summary: {
        Args: { p_post_id?: string; p_reel_id?: string }
        Returns: Json
      }
      get_conversation_detail: {
        Args: { p_conversation_id: string }
        Returns: {
          avatar_url: string
          conversation_type: Database["public"]["Enums"]["conversation_type"]
          id: string
          member_count: number
          my_role: Database["public"]["Enums"]["conversation_member_role"]
          other_avatar_url: string
          other_full_name: string
          other_is_verified: boolean
          other_last_read_at: string
          other_last_seen_at: string
          other_user_id: string
          other_username: string
          title: string
        }[]
      }
      get_conversation_members: {
        Args: { p_conversation_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          joined_at: string
          role: Database["public"]["Enums"]["conversation_member_role"]
          user_id: string
          username: string
        }[]
      }
      get_conversation_messages: {
        Args: { p_before?: string; p_conversation_id: string; p_limit?: number }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          deleted_for_all: boolean
          edited_at: string
          forwarded_from_id: string
          id: string
          is_read: boolean
          media_url: string
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json
          reply_to_id: string
          sender_id: string
        }[]
      }
      get_message_daily_remaining: { Args: never; Returns: number }
      get_my_conversation_role: {
        Args: { p_conversation_id: string }
        Returns: Database["public"]["Enums"]["conversation_member_role"]
      }
      get_nearby_summary: {
        Args: { p_lat: number; p_lng: number; p_radius_km?: number }
        Returns: Json
      }
      get_or_create_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      get_own_profile_contact_fields: {
        Args: never
        Returns: {
          address: string
          bank_account_name: string
          bank_name: string
          iban: string
        }[]
      }
      get_trending_music_tracks: {
        Args: { p_limit?: number; p_period?: string }
        Returns: {
          album: string
          artist: string
          audio_storage_path: string
          audio_url: string
          category_id: string
          cover_storage_path: string
          cover_url: string
          created_at: string
          created_by: string
          display_title: string
          duration_seconds: number
          id: string
          is_editor_pick: boolean
          is_featured: boolean
          is_trending: boolean
          last_used_at: string
          license_info: string
          license_status: Database["public"]["Enums"]["music_license_status"]
          period_usage_count: number
          publication_status: Database["public"]["Enums"]["music_publication_status"]
          sort_order: number
          title: string
          updated_at: string
          usage_count: number
          view_count: number
        }[]
      }
      get_trending_topics: {
        Args: {
          p_limit?: number
          p_period?: string
          p_region_id?: string
          p_scope?: string
        }
        Returns: {
          comment_count: number
          computed_at: string
          id: string
          like_count: number
          period: string
          post_count: number
          quote_count: number
          rank: number
          region_id: string | null
          scope: string
          tag: string
          trend_score: number
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "trending_topics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_conversations: {
        Args: { p_archived_only?: boolean }
        Returns: {
          avatar_url: string
          conversation_id: string
          conversation_type: Database["public"]["Enums"]["conversation_type"]
          is_archived: boolean
          is_muted: boolean
          is_pinned: boolean
          last_message_at: string
          last_message_preview: string
          member_count: number
          muted_until: string
          other_avatar_url: string
          other_full_name: string
          other_user_id: string
          other_username: string
          title: string
          unread_count: number
        }[]
      }
      get_user_kuru_balance: { Args: { p_user_id?: string }; Returns: number }
      get_user_kuru_summary: { Args: { p_user_id?: string }; Returns: Json }
      get_user_kuru_transactions: {
        Args: { p_limit?: number; p_offset?: number; p_user_id?: string }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          note: string
          source_key: string
          source_type: Database["public"]["Enums"]["kuru_source_type"]
          tx_type: Database["public"]["Enums"]["kuru_transaction_type"]
        }[]
      }
      get_viewer_demographics: { Args: never; Returns: Json }
      gettransactionid: { Args: never; Returns: unknown }
      increment_business_view_count: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      increment_event_view: {
        Args: { p_event_id: string; p_source?: string }
        Returns: boolean
      }
      increment_job_view_count: {
        Args: { listing_id: string }
        Returns: boolean
      }
      increment_lost_item_view: {
        Args: { p_item_id: string }
        Returns: boolean
      }
      increment_marketplace_view: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_guest_auth_email: { Args: { p_email: string }; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      is_user_blocked: {
        Args: { p_target_id: string; p_viewer_id: string }
        Returns: boolean
      }
      is_user_muted: {
        Args: { p_target_id: string; p_viewer_id: string }
        Returns: boolean
      }
      list_content_verification_notes: {
        Args: { p_limit?: number; p_post_id?: string; p_reel_id?: string }
        Returns: Json
      }
      list_explorers: {
        Args: { p_region_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          heading: number
          is_verified: boolean
          latitude: number
          longitude: number
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      log_marketplace_order_event: {
        Args: {
          p_actor_id?: string
          p_actor_role?: string
          p_event_type: string
          p_order_id: string
          p_payload?: Json
        }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_notification_delivery_opened: {
        Args: { p_outbox_id: string }
        Returns: undefined
      }
      marketplace_buyer_confirm_receipt: {
        Args: { p_order_id: string }
        Returns: Json
      }
      marketplace_buyer_open_dispute: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      marketplace_seller_mark_shipped: {
        Args: { p_order_id: string; p_tracking_number?: string }
        Returns: Json
      }
      moderator_issue_warning: {
        Args: {
          p_expires_hours?: number
          p_level: Database["public"]["Enums"]["warning_level"]
          p_reason: string
          p_report_id?: string
          p_user_id: string
        }
        Returns: string
      }
      mute_conversation: {
        Args: { p_conversation_id: string; p_duration_minutes?: number }
        Returns: boolean
      }
      notification_category_for: {
        Args: {
          p_event_type: Database["public"]["Enums"]["notification_event_type"]
        }
        Returns: Database["public"]["Enums"]["notification_category"]
      }
      notification_priority_for: {
        Args: {
          p_data?: Json
          p_event_type: Database["public"]["Enums"]["notification_event_type"]
        }
        Returns: Database["public"]["Enums"]["notification_priority"]
      }
      notify_admins_account_lifecycle: {
        Args: { p_body: string; p_data?: Json; p_title: string }
        Returns: number
      }
      notify_marketplace_user: {
        Args: {
          p_actor_id?: string
          p_body: string
          p_data?: Json
          p_event_type: Database["public"]["Enums"]["notification_event_type"]
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_profile_user: {
        Args: {
          p_body: string
          p_data?: Json
          p_event_type: Database["public"]["Enums"]["notification_event_type"]
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_user_account_reactivated: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_user_system: {
        Args: {
          p_actor_id?: string
          p_body: string
          p_data?: Json
          p_priority?: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      pin_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      post_media_video_ids: {
        Args: { p_media_urls: string[] }
        Returns: string[]
      }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_event_reminders: { Args: never; Returns: number }
      process_marketplace_payout_reminders: { Args: never; Returns: number }
      process_pending_account_deletions: { Args: never; Returns: number }
      record_music_usage: {
        Args: {
          p_music_end_sec?: number
          p_music_start_sec?: number
          p_music_volume?: number
          p_original_audio_volume?: number
          p_post_id?: string
          p_reel_id?: string
          p_track_id: string
        }
        Returns: string
      }
      record_post_view: { Args: { p_post_id: string }; Returns: boolean }
      record_profile_view: { Args: { p_profile_id: string }; Returns: boolean }
      record_reel_complete_view: {
        Args: { p_reel_id: string }
        Returns: boolean
      }
      record_reel_view: { Args: { p_reel_id: string }; Returns: boolean }
      refresh_trending_topics: {
        Args: { p_period?: string; p_region_id?: string; p_scope?: string }
        Returns: number
      }
      regional_subscription_matches: {
        Args: {
          p_district?: string
          p_neighborhood?: string
          p_profile: Database["public"]["Tables"]["profiles"]["Row"]
          p_subscription: Database["public"]["Tables"]["regional_alert_subscriptions"]["Row"]
        }
        Returns: boolean
      }
      register_user_session: {
        Args: {
          p_device_name?: string
          p_device_type?: string
          p_session_key?: string
        }
        Returns: Json
      }
      remove_follower: {
        Args: { p_follower_id: string }
        Returns: undefined
      }
      remove_group_member: {
        Args: { p_conversation_id: string; p_member_id: string }
        Returns: boolean
      }
      request_account_deletion: { Args: never; Returns: undefined }
      request_account_freeze: { Args: never; Returns: undefined }
      resolve_moderation_target_user: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: string
      }
      resolve_report_target_user: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: string
      }
      review_reporter_application: {
        Args: {
          p_application_id: string
          p_approve: boolean
          p_note?: string
          p_reviewer_id: string
        }
        Returns: undefined
      }
      search_marketplace_listings: {
        Args: {
          p_category?: Database["public"]["Enums"]["marketplace_category"]
          p_condition?: Database["public"]["Enums"]["marketplace_condition"]
          p_lat?: number
          p_limit?: number
          p_listing_type?: Database["public"]["Enums"]["marketplace_listing_type"]
          p_lng?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_query?: string
          p_radius_km?: number
          p_region_id: string
          p_sort?: string
        }
        Returns: {
          author_id: string
          business_id: string | null
          category: Database["public"]["Enums"]["marketplace_category"]
          comment_count: number
          condition: Database["public"]["Enums"]["marketplace_condition"]
          contact_phone: string | null
          content_status: Database["public"]["Enums"]["content_status"]
          cover_url: string | null
          created_at: string
          currency: string
          delivery_mode: Database["public"]["Enums"]["marketplace_delivery_mode"]
          description: string
          district: string
          favorite_count: number
          id: string
          latitude: number | null
          listing_type: Database["public"]["Enums"]["marketplace_listing_type"]
          location: unknown
          longitude: number | null
          media_urls: string[]
          price: number | null
          region_id: string
          search_vector: unknown
          shipping_note: string | null
          show_phone: boolean
          sold_at: string | null
          status: Database["public"]["Enums"]["marketplace_listing_status"]
          subcategory: string
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "marketplace_listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_messaging_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          is_verified: boolean
          username: string
        }[]
      }
      search_music_tracks: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          album: string | null
          artist: string
          audio_storage_path: string | null
          audio_url: string
          category_id: string | null
          cover_storage_path: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          display_title: string
          duration_seconds: number
          id: string
          is_editor_pick: boolean
          is_featured: boolean
          is_trending: boolean
          last_used_at: string | null
          license_info: string | null
          license_status: Database["public"]["Enums"]["music_license_status"]
          publication_status: Database["public"]["Enums"]["music_publication_status"]
          sort_order: number
          title: string
          updated_at: string
          usage_count: number
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "music_tracks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_message: {
        Args: {
          p_content?: string
          p_conversation_id: string
          p_forwarded_from_id?: string
          p_media_url?: string
          p_message_type?: Database["public"]["Enums"]["message_type"]
          p_metadata?: Json
          p_reply_to_id?: string
        }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          deleted_for_all: boolean
          edited_at: string
          forwarded_from_id: string
          id: string
          is_read: boolean
          media_url: string
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json
          reply_to_id: string
          sender_id: string
        }[]
      }
      set_event_location: {
        Args: { lat: number; lng: number; p_event_id: string }
        Returns: undefined
      }
      set_job_listing_location: {
        Args: { lat: number; listing_id: string; lng: number }
        Returns: undefined
      }
      set_lost_item_location: {
        Args: { lat: number; lng: number; p_item_id: string }
        Returns: undefined
      }
      set_marketplace_location: {
        Args: { lat: number; lng: number; p_listing_id: string }
        Returns: undefined
      }
      set_post_location: {
        Args: { lat: number; lng: number; p_post_id: string }
        Returns: undefined
      }
      set_staff_request_location: {
        Args: { lat: number; lng: number; request_id: string }
        Returns: undefined
      }
      show_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      smart_priority_boost: {
        Args: {
          p_base: Database["public"]["Enums"]["notification_priority"]
          p_content_tag: string
          p_interests: string[]
        }
        Returns: Database["public"]["Enums"]["notification_priority"]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      submit_account_lifecycle_request: {
        Args: { p_message: string; p_request_type: string }
        Returns: string
      }
      submit_identity_verification_request: {
        Args: {
          p_birth_date: string
          p_document_type: Database["public"]["Enums"]["identity_document_type"]
          p_full_name: string
          p_id_back_path: string
          p_id_front_path: string
          p_selfie_path: string
        }
        Returns: string
      }
      submit_support_ticket: {
        Args: {
          p_category: string
          p_lifecycle_request_id?: string
          p_message: string
          p_subject: string
        }
        Returns: string
      }
      sync_news_verification_permission: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sync_premium_status: { Args: { p_user_id: string }; Returns: undefined }
      sync_reporter_level: { Args: { p_user_id: string }; Returns: undefined }
      sync_reporter_level_test: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sync_reporter_level_test2: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      toggle_message_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: boolean
      }
      touch_user_session: {
        Args: { p_session_id?: string }
        Returns: undefined
      }
      unarchive_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      unlockrows: { Args: { "": string }; Returns: number }
      unmute_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      unpin_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      update_group_conversation: {
        Args: {
          p_avatar_url?: string
          p_conversation_id: string
          p_title?: string
        }
        Returns: boolean
      }
      update_group_member_role: {
        Args: {
          p_conversation_id: string
          p_member_id: string
          p_role: Database["public"]["Enums"]["conversation_member_role"]
        }
        Returns: boolean
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_explorer_presence: {
        Args: {
          p_heading?: number
          p_latitude: number
          p_longitude: number
          p_region_id: string
        }
        Returns: undefined
      }
      verify_content: {
        Args: {
          p_note?: string
          p_post_id?: string
          p_reel_id?: string
          p_reporter_id: string
          p_result: Database["public"]["Enums"]["news_verification_result"]
        }
        Returns: undefined
      }
      verify_content_trust: { Args: { p_trust_code: string }; Returns: Json }
      verify_news_post: {
        Args: {
          p_note?: string
          p_post_id: string
          p_reporter_id: string
          p_result: Database["public"]["Enums"]["news_verification_result"]
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "personal" | "business"
      ad_status: "draft" | "pending" | "active" | "paused" | "ended"
      ad_type: "feed" | "reels" | "map" | "business"
      appeal_status: "pending" | "reviewing" | "approved" | "rejected"
      appeal_type: "ban" | "content_removal" | "account_suspension" | "other"
      badge_type:
        | "verified_account"
        | "reporter"
        | "trusted_contributor"
        | "business"
        | "moderator"
        | "admin"
        | "premium"
        | "platform_supporter"
      ban_duration: "hours_24" | "days_7" | "days_30" | "permanent"
      broadcast_type: "system" | "emergency" | "update"
      business_registration_status: "pending" | "approved" | "rejected"
      call_status:
        | "ringing"
        | "accepted"
        | "declined"
        | "ended"
        | "missed"
        | "cancelled"
      call_type: "audio" | "video"
      channel_type: "news" | "municipality" | "emergency" | "business"
      community_member_role: "owner" | "admin" | "moderator" | "member"
      community_visibility: "public" | "private"
      content_status: "draft" | "published" | "hidden" | "removed"
      conversation_member_role: "member" | "moderator" | "admin" | "founder"
      conversation_type: "direct" | "group"
      deal_type: "discount" | "campaign" | "coupon"
      delivery_status: "preparing" | "on_the_way" | "delivered" | "cancelled"
      duty_listing_type: "pharmacy" | "veterinary" | "hospital" | "fuel"
      event_category:
        | "concert"
        | "festival"
        | "sports"
        | "tournament"
        | "meeting"
        | "seminar"
        | "education"
        | "wedding_venue"
        | "business"
        | "municipality"
        | "university"
        | "social_responsibility"
      event_map_category:
        | "entertainment"
        | "sports"
        | "education"
        | "municipality"
        | "business"
      event_rsvp_status: "going" | "maybe" | "not_going"
      event_ticket_type: "free" | "paid"
      friend_request_status: "pending" | "accepted" | "declined"
      gender_type: "female" | "male" | "other" | "prefer_not_to_say"
      help_request_category:
        | "blood"
        | "medicine"
        | "student"
        | "search"
        | "other"
      help_urgency: "low" | "medium" | "high" | "critical"
      identity_document_type: "national_id" | "passport" | "drivers_license"
      identity_verification_status:
        | "pending"
        | "in_review"
        | "approved"
        | "rejected"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_status: "open" | "verified" | "resolved" | "dismissed"
      incident_update_type:
        | "initial"
        | "update"
        | "photo"
        | "video"
        | "verification"
      job_application_status:
        | "sent"
        | "reviewing"
        | "interview"
        | "accepted"
        | "rejected"
      job_type:
        | "full_time"
        | "part_time"
        | "seasonal"
        | "remote"
        | "daily"
        | "weekly"
      kuru_source_type:
        | "daily_task"
        | "admin"
        | "profile_boost"
        | "deal_redeem"
        | "tip"
        | "signup_bonus"
        | "other"
      kuru_transaction_type:
        | "task_reward"
        | "admin_credit"
        | "admin_debit"
        | "spend"
        | "bonus"
        | "transfer_in"
        | "transfer_out"
      lost_item_category: "animal" | "person" | "item" | "document" | "other"
      lost_item_status: "open" | "resolved"
      lost_item_type: "lost" | "found"
      marketplace_category:
        | "electronics"
        | "home_living"
        | "furniture"
        | "clothing"
        | "baby_kids"
        | "sports"
        | "entertainment"
        | "books_media"
        | "vehicles"
        | "garden_agri"
        | "handmade"
        | "pets"
        | "office_business"
        | "collectibles"
        | "services"
        | "real_estate"
        | "other"
      marketplace_condition: "new" | "like_new" | "used" | "for_parts"
      marketplace_delivery_mode: "meetup" | "shipping"
      marketplace_listing_status:
        | "active"
        | "reserved"
        | "sold"
        | "removed"
        | "archived"
      marketplace_listing_type: "sale" | "negotiable" | "trade" | "free"
      marketplace_order_status:
        | "pending_payment"
        | "paid_escrow"
        | "seller_shipped"
        | "buyer_confirmed"
        | "platform_approved"
        | "payout_scheduled"
        | "payout_completed"
        | "closed"
        | "disputed"
        | "refund_pending"
        | "refunded"
        | "cancelled"
      message_type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "location"
        | "file"
        | "shared_post"
        | "shared_reel"
        | "shared_profile"
      military_status: "completed" | "exempt" | "postponed" | "not_applicable"
      misinfo_flag_type:
        | "wrong_info"
        | "incomplete_info"
        | "outdated"
        | "wrong_location"
      moderation_action_type: "warn" | "hide" | "remove" | "ban"
      music_license_status: "licensed" | "pending" | "unlicensed"
      music_publication_status: "active" | "hidden" | "blocked"
      news_verification_result: "correct" | "incorrect" | "unverified"
      notification_category:
        | "social"
        | "messages"
        | "jobs"
        | "businesses"
        | "emergency"
        | "system"
      notification_event_type:
        | "like"
        | "comment"
        | "comment_reply"
        | "quote"
        | "follow"
        | "friend_request"
        | "friend_accepted"
        | "message"
        | "mention"
        | "reel_like"
        | "emergency"
        | "job"
        | "event_nearby"
        | "incident_update"
        | "call_incoming"
        | "save"
        | "security_alert"
        | "trust_score_change"
        | "achievement_earned"
        | "badge_earned"
        | "regional_alert"
        | "share"
        | "group_message"
        | "call_video"
        | "call_missed"
        | "business_post"
        | "business_campaign"
        | "business_event"
        | "system"
        | "event_reminder"
        | "lost_item_nearby"
        | "lost_item_tip"
        | "channel_post"
        | "marketplace_order_paid"
        | "marketplace_ship_request"
        | "marketplace_buyer_confirm"
        | "marketplace_platform_approved"
        | "marketplace_payout_due"
        | "marketplace_payout_completed"
        | "marketplace_comment"
      notification_priority: "low" | "normal" | "high" | "critical"
      poi_category:
        | "hospital"
        | "pharmacy"
        | "police"
        | "fire"
        | "veterinary"
        | "afad"
        | "other"
      post_audience: "public" | "friends" | "close_friends"
      post_category:
        | "general"
        | "news"
        | "emergency"
        | "traffic"
        | "event"
        | "job"
        | "business"
        | "lost_found"
        | "entertainment"
        | "daily"
      post_type: "post" | "incident" | "quote" | "reel"
      premium_payment_provider: "stripe" | "apple"
      premium_plan: "monthly" | "yearly"
      price_symbol_key:
        | "hazelnut"
        | "gold"
        | "usd"
        | "eur"
        | "diesel"
        | "gasoline"
      profile_visibility: "public" | "members" | "friends"
      push_platform: "ios" | "android" | "web"
      report_queue_status: "pending" | "reviewing" | "approved" | "rejected"
      report_reason:
        | "spam"
        | "harassment"
        | "fraud"
        | "abuse"
        | "misinformation"
        | "child_safety"
        | "violence"
        | "fake_account"
        | "threat"
        | "hate_speech"
        | "inappropriate"
        | "personal_data"
      reporter_application_status: "pending" | "approved" | "rejected"
      revenue_type:
        | "premium_business"
        | "sponsored_content"
        | "job_listing"
        | "advertisement"
        | "event_ticket"
        | "marketplace_commission"
      salary_type: "net" | "range" | "negotiable"
      subscription_status: "active" | "cancelled" | "expired"
      task_reward_type:
        | "points"
        | "badge"
        | "premium_days"
        | "achievement"
        | "kuru"
      tip_category: "pollution" | "illegal_building" | "road_issue" | "other"
      tip_moderation_status: "pending" | "approved" | "rejected"
      tourism_category:
        | "place"
        | "waterfall"
        | "plateau"
        | "restaurant"
        | "hotel"
      traffic_report_type: "accident" | "roadwork" | "radar" | "congestion"
      tv_video_category: "news" | "interview" | "documentary" | "municipality"
      user_role:
        | "user"
        | "verified_reporter"
        | "moderator"
        | "admin"
        | "super_admin"
      vcts_content_type: "text" | "image" | "video" | "mixed"
      vcts_trust_status: "verified" | "disputed" | "tampered" | "pending"
      verification_status: "reviewing" | "verified" | "misinfo"
      verification_vote: "verified" | "reviewing" | "misinfo"
      video_status: "uploading" | "processing" | "ready" | "failed"
      volunteer_team_category:
        | "search_rescue"
        | "veterinary"
        | "blood_donation"
        | "relief"
      warning_level:
        | "warning"
        | "temp_restriction"
        | "temp_suspension"
        | "permanent_ban"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["personal", "business"],
      ad_status: ["draft", "pending", "active", "paused", "ended"],
      ad_type: ["feed", "reels", "map", "business"],
      appeal_status: ["pending", "reviewing", "approved", "rejected"],
      appeal_type: ["ban", "content_removal", "account_suspension", "other"],
      badge_type: [
        "verified_account",
        "reporter",
        "trusted_contributor",
        "business",
        "moderator",
        "admin",
        "premium",
        "platform_supporter",
      ],
      ban_duration: ["hours_24", "days_7", "days_30", "permanent"],
      broadcast_type: ["system", "emergency", "update"],
      business_registration_status: ["pending", "approved", "rejected"],
      call_status: [
        "ringing",
        "accepted",
        "declined",
        "ended",
        "missed",
        "cancelled",
      ],
      call_type: ["audio", "video"],
      channel_type: ["news", "municipality", "emergency", "business"],
      community_member_role: ["owner", "admin", "moderator", "member"],
      community_visibility: ["public", "private"],
      content_status: ["draft", "published", "hidden", "removed"],
      conversation_member_role: ["member", "moderator", "admin", "founder"],
      conversation_type: ["direct", "group"],
      deal_type: ["discount", "campaign", "coupon"],
      delivery_status: ["preparing", "on_the_way", "delivered", "cancelled"],
      duty_listing_type: ["pharmacy", "veterinary", "hospital", "fuel"],
      event_category: [
        "concert",
        "festival",
        "sports",
        "tournament",
        "meeting",
        "seminar",
        "education",
        "wedding_venue",
        "business",
        "municipality",
        "university",
        "social_responsibility",
      ],
      event_map_category: [
        "entertainment",
        "sports",
        "education",
        "municipality",
        "business",
      ],
      event_rsvp_status: ["going", "maybe", "not_going"],
      event_ticket_type: ["free", "paid"],
      friend_request_status: ["pending", "accepted", "declined"],
      gender_type: ["female", "male", "other", "prefer_not_to_say"],
      help_request_category: [
        "blood",
        "medicine",
        "student",
        "search",
        "other",
      ],
      help_urgency: ["low", "medium", "high", "critical"],
      identity_document_type: ["national_id", "passport", "drivers_license"],
      identity_verification_status: [
        "pending",
        "in_review",
        "approved",
        "rejected",
      ],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_status: ["open", "verified", "resolved", "dismissed"],
      incident_update_type: [
        "initial",
        "update",
        "photo",
        "video",
        "verification",
      ],
      job_application_status: [
        "sent",
        "reviewing",
        "interview",
        "accepted",
        "rejected",
      ],
      job_type: [
        "full_time",
        "part_time",
        "seasonal",
        "remote",
        "daily",
        "weekly",
      ],
      kuru_source_type: [
        "daily_task",
        "admin",
        "profile_boost",
        "deal_redeem",
        "tip",
        "signup_bonus",
        "other",
      ],
      kuru_transaction_type: [
        "task_reward",
        "admin_credit",
        "admin_debit",
        "spend",
        "bonus",
        "transfer_in",
        "transfer_out",
      ],
      lost_item_category: ["animal", "person", "item", "document", "other"],
      lost_item_status: ["open", "resolved"],
      lost_item_type: ["lost", "found"],
      marketplace_category: [
        "electronics",
        "home_living",
        "furniture",
        "clothing",
        "baby_kids",
        "sports",
        "entertainment",
        "books_media",
        "vehicles",
        "garden_agri",
        "handmade",
        "pets",
        "office_business",
        "collectibles",
        "services",
        "real_estate",
        "other",
      ],
      marketplace_condition: ["new", "like_new", "used", "for_parts"],
      marketplace_delivery_mode: ["meetup", "shipping"],
      marketplace_listing_status: [
        "active",
        "reserved",
        "sold",
        "removed",
        "archived",
      ],
      marketplace_listing_type: ["sale", "negotiable", "trade", "free"],
      marketplace_order_status: [
        "pending_payment",
        "paid_escrow",
        "seller_shipped",
        "buyer_confirmed",
        "platform_approved",
        "payout_scheduled",
        "payout_completed",
        "closed",
        "disputed",
        "refund_pending",
        "refunded",
        "cancelled",
      ],
      message_type: [
        "text",
        "image",
        "video",
        "audio",
        "location",
        "file",
        "shared_post",
        "shared_reel",
        "shared_profile",
      ],
      military_status: ["completed", "exempt", "postponed", "not_applicable"],
      misinfo_flag_type: [
        "wrong_info",
        "incomplete_info",
        "outdated",
        "wrong_location",
      ],
      moderation_action_type: ["warn", "hide", "remove", "ban"],
      music_license_status: ["licensed", "pending", "unlicensed"],
      music_publication_status: ["active", "hidden", "blocked"],
      news_verification_result: ["correct", "incorrect", "unverified"],
      notification_category: [
        "social",
        "messages",
        "jobs",
        "businesses",
        "emergency",
        "system",
      ],
      notification_event_type: [
        "like",
        "comment",
        "comment_reply",
        "quote",
        "follow",
        "friend_request",
        "friend_accepted",
        "message",
        "mention",
        "reel_like",
        "emergency",
        "job",
        "event_nearby",
        "incident_update",
        "call_incoming",
        "save",
        "security_alert",
        "trust_score_change",
        "achievement_earned",
        "badge_earned",
        "regional_alert",
        "share",
        "group_message",
        "call_video",
        "call_missed",
        "business_post",
        "business_campaign",
        "business_event",
        "system",
        "event_reminder",
        "lost_item_nearby",
        "lost_item_tip",
        "channel_post",
        "marketplace_order_paid",
        "marketplace_ship_request",
        "marketplace_buyer_confirm",
        "marketplace_platform_approved",
        "marketplace_payout_due",
        "marketplace_payout_completed",
        "marketplace_comment",
      ],
      notification_priority: ["low", "normal", "high", "critical"],
      poi_category: [
        "hospital",
        "pharmacy",
        "police",
        "fire",
        "veterinary",
        "afad",
        "other",
      ],
      post_audience: ["public", "friends", "close_friends"],
      post_category: [
        "general",
        "news",
        "emergency",
        "traffic",
        "event",
        "job",
        "business",
        "lost_found",
        "entertainment",
        "daily",
      ],
      post_type: ["post", "incident", "quote", "reel"],
      premium_payment_provider: ["stripe", "apple"],
      premium_plan: ["monthly", "yearly"],
      price_symbol_key: [
        "hazelnut",
        "gold",
        "usd",
        "eur",
        "diesel",
        "gasoline",
      ],
      profile_visibility: ["public", "members", "friends"],
      push_platform: ["ios", "android", "web"],
      report_queue_status: ["pending", "reviewing", "approved", "rejected"],
      report_reason: [
        "spam",
        "harassment",
        "fraud",
        "abuse",
        "misinformation",
        "child_safety",
        "violence",
        "fake_account",
        "threat",
        "hate_speech",
        "inappropriate",
        "personal_data",
      ],
      reporter_application_status: ["pending", "approved", "rejected"],
      revenue_type: [
        "premium_business",
        "sponsored_content",
        "job_listing",
        "advertisement",
        "event_ticket",
        "marketplace_commission",
      ],
      salary_type: ["net", "range", "negotiable"],
      subscription_status: ["active", "cancelled", "expired"],
      task_reward_type: [
        "points",
        "badge",
        "premium_days",
        "achievement",
        "kuru",
      ],
      tip_category: ["pollution", "illegal_building", "road_issue", "other"],
      tip_moderation_status: ["pending", "approved", "rejected"],
      tourism_category: [
        "place",
        "waterfall",
        "plateau",
        "restaurant",
        "hotel",
      ],
      traffic_report_type: ["accident", "roadwork", "radar", "congestion"],
      tv_video_category: ["news", "interview", "documentary", "municipality"],
      user_role: [
        "user",
        "verified_reporter",
        "moderator",
        "admin",
        "super_admin",
      ],
      vcts_content_type: ["text", "image", "video", "mixed"],
      vcts_trust_status: ["verified", "disputed", "tampered", "pending"],
      verification_status: ["reviewing", "verified", "misinfo"],
      verification_vote: ["verified", "reviewing", "misinfo"],
      video_status: ["uploading", "processing", "ready", "failed"],
      volunteer_team_category: [
        "search_rescue",
        "veterinary",
        "blood_donation",
        "relief",
      ],
      warning_level: [
        "warning",
        "temp_restriction",
        "temp_suspension",
        "permanent_ban",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
