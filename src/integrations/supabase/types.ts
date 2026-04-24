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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      ai_chats: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          chat_id: string | null
          completion_tokens: number
          created_at: string
          id: string
          is_premium: boolean
          model: string
          prompt_tokens: number
          total_tokens: number
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          completion_tokens?: number
          created_at?: string
          id?: string
          is_premium?: boolean
          model: string
          prompt_tokens?: number
          total_tokens?: number
          user_id: string
        }
        Update: {
          chat_id?: string | null
          completion_tokens?: number
          created_at?: string
          id?: string
          is_premium?: boolean
          model?: string
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      art_therapy_sessions: {
        Row: {
          analysis: string | null
          created_at: string
          emotions: string[] | null
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          emotions?: string[] | null
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          emotions?: string[] | null
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          reply_to_id: string | null
          room: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          room?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          room?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rules_accepted: {
        Row: {
          accepted_at: string
          id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      consent_log: {
        Row: {
          action: string
          consent_type: string
          context: string
          created_at: string
          document_version: string
          id: string
          ip_address: string | null
          payment_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action?: string
          consent_type: string
          context: string
          created_at?: string
          document_version: string
          id?: string
          ip_address?: string | null
          payment_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          consent_type?: string
          context?: string
          created_at?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          payment_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crisis_sessions: {
        Row: {
          created_at: string
          id: string
          intensity: string | null
          notes: string | null
          outcome: string | null
          techniques_used: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intensity?: string | null
          notes?: string | null
          outcome?: string | null
          techniques_used?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intensity?: string | null
          notes?: string | null
          outcome?: string | null
          techniques_used?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          mood_score: number | null
          note: string | null
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          mood_score?: number | null
          note?: string | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          mood_score?: number | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      emotion_calendar: {
        Row: {
          created_at: string
          emotion: string
          entry_date: string
          id: string
          intensity: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emotion: string
          entry_date?: string
          id?: string
          intensity?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          emotion?: string
          entry_date?: string
          id?: string
          intensity?: number | null
          user_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string
          daily_count: number
          feature: string
          id: string
          last_warning_at: string | null
          monthly_count: number
          updated_at: string
          usage_date: string
          user_id: string
          warnings_count: number
        }
        Insert: {
          created_at?: string
          daily_count?: number
          feature: string
          id?: string
          last_warning_at?: string | null
          monthly_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
          warnings_count?: number
        }
        Update: {
          created_at?: string
          daily_count?: number
          feature?: string
          id?: string
          last_warning_at?: string | null
          monthly_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
          warnings_count?: number
        }
        Relationships: []
      }
      friendships: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      jiva_embed_cache: {
        Row: {
          created_at: string
          embedding: string
          hash: string
        }
        Insert: {
          created_at?: string
          embedding: string
          hash: string
        }
        Update: {
          created_at?: string
          embedding?: string
          hash?: string
        }
        Relationships: []
      }
      jiva_embed_usage: {
        Row: {
          created_at: string
          id: string
          items: number
          meta: Json | null
          model: string
          prompt_tokens: number
          provider: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: number
          meta?: Json | null
          model: string
          prompt_tokens?: number
          provider?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: number
          meta?: Json | null
          model?: string
          prompt_tokens?: number
          provider?: string
        }
        Relationships: []
      }
      jiva_memory_chunks: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jiva_sessions_v2: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          session_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          session_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          session_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      llm_usage: {
        Row: {
          cost_rub: number | null
          cost_usd: number | null
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          cost_rub?: number | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          cost_rub?: number | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          message_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          message_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_history: {
        Row: {
          action_type: string
          content_preview: string | null
          content_type: string | null
          created_at: string | null
          id: string
          moderator_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          content_preview?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: string
          moderator_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          content_preview?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: string
          moderator_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          created_at: string
          emotions: string[] | null
          entry_date: string
          id: string
          mood: string | null
          mood_score: number | null
          note: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emotions?: string[] | null
          entry_date?: string
          id?: string
          mood?: string | null
          mood_score?: number | null
          note?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emotions?: string[] | null
          entry_date?: string
          id?: string
          mood?: string | null
          mood_score?: number | null
          note?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          aggregate_reactions: boolean | null
          created_at: string | null
          email_weekly_digest: boolean | null
          id: string
          push_comments: boolean | null
          push_friend_requests: boolean | null
          push_mentions: boolean | null
          push_private_messages: boolean | null
          push_reactions: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          aggregate_reactions?: boolean | null
          created_at?: string | null
          email_weekly_digest?: boolean | null
          id?: string
          push_comments?: boolean | null
          push_friend_requests?: boolean | null
          push_mentions?: boolean | null
          push_private_messages?: boolean | null
          push_reactions?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          aggregate_reactions?: boolean | null
          created_at?: string | null
          email_weekly_digest?: boolean | null
          id?: string
          push_comments?: boolean | null
          push_friend_requests?: boolean | null
          push_mentions?: boolean | null
          push_private_messages?: boolean | null
          push_reactions?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          post_id: string | null
          reaction_type: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          post_id?: string | null
          reaction_type?: string | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          post_id?: string | null
          reaction_type?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          canceled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string | null
          external_id: string | null
          id: string
          meta: Json | null
          product_type: string | null
          provider: string | null
          refunded_at: string | null
          status: string | null
          user_id: string
          yookassa_confirmation_url: string | null
          yookassa_payment_id: string | null
        }
        Insert: {
          amount: number
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          external_id?: string | null
          id?: string
          meta?: Json | null
          product_type?: string | null
          provider?: string | null
          refunded_at?: string | null
          status?: string | null
          user_id: string
          yookassa_confirmation_url?: string | null
          yookassa_payment_id?: string | null
        }
        Update: {
          amount?: number
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          external_id?: string | null
          id?: string
          meta?: Json | null
          product_type?: string | null
          provider?: string | null
          refunded_at?: string | null
          status?: string | null
          user_id?: string
          yookassa_confirmation_url?: string | null
          yookassa_payment_id?: string | null
        }
        Relationships: []
      }
      pinned_community_messages: {
        Row: {
          id: string
          message_id: string
          pinned_at: string
          pinned_by: string
        }
        Insert: {
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by: string
        }
        Update: {
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_community_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_moments: {
        Row: {
          id: string
          pinned_at: string
          pinned_by: string
          post_id: string
        }
        Insert: {
          id?: string
          pinned_at?: string
          pinned_by: string
          post_id: string
        }
        Update: {
          id?: string
          pinned_at?: string
          pinned_by?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_moments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_jiva: boolean
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_jiva?: boolean
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_jiva?: boolean
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
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
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          emotion: string | null
          emotion_wave: string | null
          id: string
          is_anonymous: boolean | null
          moderation_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          emotion?: string | null
          emotion_wave?: string | null
          id?: string
          is_anonymous?: boolean | null
          moderation_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          emotion?: string | null
          emotion_wave?: string | null
          id?: string
          is_anonymous?: boolean | null
          moderation_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      private_chat_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      private_conversations: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id_1: string
          user_id_2: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "private_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          abuse_warnings_count: number | null
          ai_memory_enabled: boolean
          allow_friend_requests: string
          allow_private_messages: string | null
          avatar_url: string | null
          bio: string | null
          birth_year: number | null
          blocked_at: string | null
          city: string | null
          community_restricted_until: string | null
          community_warnings_count: number | null
          consent_ip: string | null
          country: string | null
          created_at: string
          creator_letter_shown: boolean | null
          disclaimer_accepted_at: string | null
          disclaimer_version: string | null
          display_name: string | null
          friend_intro_shown: boolean | null
          gender: string | null
          gender_extended: string | null
          id: string
          immediate_service_accepted_at: string | null
          immediate_service_version: string | null
          last_community_warning_at: string | null
          last_daily_reset: string | null
          last_diary_pdf_export_at: string | null
          last_diary_pdf_export_url: string | null
          last_smer_pdf_export_at: string | null
          last_smer_pdf_export_url: string | null
          offer_accepted_at: string | null
          offer_version: string | null
          onboarding_completed: boolean | null
          onboarding_state: Json | null
          plan: string | null
          premium_until: string | null
          privacy_accepted_at: string | null
          privacy_version: string | null
          role: string | null
          soft_banned_features: string[] | null
          temp_bans_count: number | null
          timezone: string | null
          trial_ended_at: string | null
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          username: string | null
          welcome_shown: boolean | null
        }
        Insert: {
          abuse_warnings_count?: number | null
          ai_memory_enabled?: boolean
          allow_friend_requests?: string
          allow_private_messages?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          blocked_at?: string | null
          city?: string | null
          community_restricted_until?: string | null
          community_warnings_count?: number | null
          consent_ip?: string | null
          country?: string | null
          created_at?: string
          creator_letter_shown?: boolean | null
          disclaimer_accepted_at?: string | null
          disclaimer_version?: string | null
          display_name?: string | null
          friend_intro_shown?: boolean | null
          gender?: string | null
          gender_extended?: string | null
          id?: string
          immediate_service_accepted_at?: string | null
          immediate_service_version?: string | null
          last_community_warning_at?: string | null
          last_daily_reset?: string | null
          last_diary_pdf_export_at?: string | null
          last_diary_pdf_export_url?: string | null
          last_smer_pdf_export_at?: string | null
          last_smer_pdf_export_url?: string | null
          offer_accepted_at?: string | null
          offer_version?: string | null
          onboarding_completed?: boolean | null
          onboarding_state?: Json | null
          plan?: string | null
          premium_until?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          role?: string | null
          soft_banned_features?: string[] | null
          temp_bans_count?: number | null
          timezone?: string | null
          trial_ended_at?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          welcome_shown?: boolean | null
        }
        Update: {
          abuse_warnings_count?: number | null
          ai_memory_enabled?: boolean
          allow_friend_requests?: string
          allow_private_messages?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          blocked_at?: string | null
          city?: string | null
          community_restricted_until?: string | null
          community_warnings_count?: number | null
          consent_ip?: string | null
          country?: string | null
          created_at?: string
          creator_letter_shown?: boolean | null
          disclaimer_accepted_at?: string | null
          disclaimer_version?: string | null
          display_name?: string | null
          friend_intro_shown?: boolean | null
          gender?: string | null
          gender_extended?: string | null
          id?: string
          immediate_service_accepted_at?: string | null
          immediate_service_version?: string | null
          last_community_warning_at?: string | null
          last_daily_reset?: string | null
          last_diary_pdf_export_at?: string | null
          last_diary_pdf_export_url?: string | null
          last_smer_pdf_export_at?: string | null
          last_smer_pdf_export_url?: string | null
          offer_accepted_at?: string | null
          offer_version?: string | null
          onboarding_completed?: boolean | null
          onboarding_state?: Json | null
          plan?: string | null
          premium_until?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          role?: string | null
          soft_banned_features?: string[] | null
          temp_bans_count?: number | null
          timezone?: string | null
          trial_ended_at?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          welcome_shown?: boolean | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals_v2: {
        Row: {
          code: string
          created_at: string
          id: string
          invited_reward_days: number | null
          invited_user_id: string | null
          inviter_reward_days: number | null
          inviter_user_id: string
          status: string | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          invited_reward_days?: number | null
          invited_user_id?: string | null
          inviter_reward_days?: number | null
          inviter_user_id: string
          status?: string | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          invited_reward_days?: number | null
          invited_user_id?: string | null
          inviter_reward_days?: number | null
          inviter_user_id?: string
          status?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      smer_entries: {
        Row: {
          alternative_reaction: string | null
          created_at: string
          emotions: string[] | null
          entry_date: string
          id: string
          reactions: string | null
          situation: string | null
          thoughts: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alternative_reaction?: string | null
          created_at?: string
          emotions?: string[] | null
          entry_date?: string
          id?: string
          reactions?: string | null
          situation?: string | null
          thoughts?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alternative_reaction?: string | null
          created_at?: string
          emotions?: string[] | null
          entry_date?: string
          id?: string
          reactions?: string | null
          situation?: string | null
          thoughts?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          reply_to_id: string | null
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          reply_to_id?: string | null
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          reply_to_id?: string | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_interval: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          external_id: string | null
          id: string
          payment_provider: string | null
          plan: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_interval?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_id?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_interval?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_id?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      training_examples: {
        Row: {
          conversion_quality_score: number | null
          converted_at: string | null
          created_at: string
          cta_clicked: boolean | null
          cta_clicked_at: string | null
          id: string
          is_validated: boolean | null
          label: string
          messages: Json
          prompt_variant: string | null
          purchased_within_1h: boolean | null
          session_ended_at: string | null
          session_id: string | null
          session_started_at: string | null
          third_ai_message_at: string | null
          time_to_conversion_sec: number | null
          user_context: Json | null
          validator_notes: string | null
        }
        Insert: {
          conversion_quality_score?: number | null
          converted_at?: string | null
          created_at?: string
          cta_clicked?: boolean | null
          cta_clicked_at?: string | null
          id?: string
          is_validated?: boolean | null
          label: string
          messages: Json
          prompt_variant?: string | null
          purchased_within_1h?: boolean | null
          session_ended_at?: string | null
          session_id?: string | null
          session_started_at?: string | null
          third_ai_message_at?: string | null
          time_to_conversion_sec?: number | null
          user_context?: Json | null
          validator_notes?: string | null
        }
        Update: {
          conversion_quality_score?: number | null
          converted_at?: string | null
          created_at?: string
          cta_clicked?: boolean | null
          cta_clicked_at?: string | null
          id?: string
          is_validated?: boolean | null
          label?: string
          messages?: Json
          prompt_variant?: string | null
          purchased_within_1h?: boolean | null
          session_ended_at?: string | null
          session_id?: string | null
          session_started_at?: string | null
          third_ai_message_at?: string | null
          time_to_conversion_sec?: number | null
          user_context?: Json | null
          validator_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_examples_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_messages: {
        Row: {
          contains_cta_hint: boolean | null
          content: string
          created_at: string
          cta_softness_score: number | null
          detected_emotion: string | null
          detected_topics: string[] | null
          emotion_intensity: number | null
          empathy_score: number | null
          id: string
          is_conversion_trigger: boolean | null
          message_number: number
          response_time_ms: number | null
          role: string
          sentiment_score: number | null
          session_id: string
          token_count: number | null
          training_label: string | null
          user_id: string
          user_intent: string | null
        }
        Insert: {
          contains_cta_hint?: boolean | null
          content: string
          created_at?: string
          cta_softness_score?: number | null
          detected_emotion?: string | null
          detected_topics?: string[] | null
          emotion_intensity?: number | null
          empathy_score?: number | null
          id?: string
          is_conversion_trigger?: boolean | null
          message_number: number
          response_time_ms?: number | null
          role: string
          sentiment_score?: number | null
          session_id: string
          token_count?: number | null
          training_label?: string | null
          user_id: string
          user_intent?: string | null
        }
        Update: {
          contains_cta_hint?: boolean | null
          content?: string
          created_at?: string
          cta_softness_score?: number | null
          detected_emotion?: string | null
          detected_topics?: string[] | null
          emotion_intensity?: number | null
          empathy_score?: number | null
          id?: string
          is_conversion_trigger?: boolean | null
          message_number?: number
          response_time_ms?: number | null
          role?: string
          sentiment_score?: number | null
          session_id?: string
          token_count?: number | null
          training_label?: string | null
          user_id?: string
          user_intent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_sessions: {
        Row: {
          avg_assistant_msg_length: number | null
          avg_response_time_sec: number | null
          avg_user_msg_length: number | null
          completed_at: string | null
          created_at: string
          crisis_detected: boolean | null
          cta_clicked_at: string | null
          cta_dismissed_at: string | null
          cta_shown_at: string | null
          days_since_registration: number | null
          dominant_emotion: string | null
          emotion_trajectory: string | null
          id: string
          messages_count: number | null
          plan_purchased: string | null
          prompt_variant: string | null
          purchase_amount_rub: number | null
          purchased_at: string | null
          session_duration_sec: number | null
          started_at: string
          system_prompt_hash: string | null
          third_ai_message_at: string | null
          user_birth_year: number | null
          user_city: string | null
          user_country: string | null
          user_gender: string | null
          user_id: string
          user_onboarding_state: Json | null
          user_timezone: string | null
        }
        Insert: {
          avg_assistant_msg_length?: number | null
          avg_response_time_sec?: number | null
          avg_user_msg_length?: number | null
          completed_at?: string | null
          created_at?: string
          crisis_detected?: boolean | null
          cta_clicked_at?: string | null
          cta_dismissed_at?: string | null
          cta_shown_at?: string | null
          days_since_registration?: number | null
          dominant_emotion?: string | null
          emotion_trajectory?: string | null
          id?: string
          messages_count?: number | null
          plan_purchased?: string | null
          prompt_variant?: string | null
          purchase_amount_rub?: number | null
          purchased_at?: string | null
          session_duration_sec?: number | null
          started_at?: string
          system_prompt_hash?: string | null
          third_ai_message_at?: string | null
          user_birth_year?: number | null
          user_city?: string | null
          user_country?: string | null
          user_gender?: string | null
          user_id: string
          user_onboarding_state?: Json | null
          user_timezone?: string | null
        }
        Update: {
          avg_assistant_msg_length?: number | null
          avg_response_time_sec?: number | null
          avg_user_msg_length?: number | null
          completed_at?: string | null
          created_at?: string
          crisis_detected?: boolean | null
          cta_clicked_at?: string | null
          cta_dismissed_at?: string | null
          cta_shown_at?: string | null
          days_since_registration?: number | null
          dominant_emotion?: string | null
          emotion_trajectory?: string | null
          id?: string
          messages_count?: number | null
          plan_purchased?: string | null
          prompt_variant?: string | null
          purchase_amount_rub?: number | null
          purchased_at?: string | null
          session_duration_sec?: number | null
          started_at?: string
          system_prompt_hash?: string | null
          third_ai_message_at?: string | null
          user_birth_year?: number | null
          user_city?: string | null
          user_country?: string | null
          user_gender?: string | null
          user_id?: string
          user_onboarding_state?: Json | null
          user_timezone?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          ai_messages_day: number | null
          art_analyses_month: number | null
          art_analyses_month_reset: string | null
          art_sessions_week: number | null
          created_at: string
          id: string
          jiva_extra_sessions_purchased: number | null
          jiva_sessions_week: number | null
          navigator_messages_day: number | null
          period_end: string | null
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_messages_day?: number | null
          art_analyses_month?: number | null
          art_analyses_month_reset?: string | null
          art_sessions_week?: number | null
          created_at?: string
          id?: string
          jiva_extra_sessions_purchased?: number | null
          jiva_sessions_week?: number | null
          navigator_messages_day?: number | null
          period_end?: string | null
          period_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_messages_day?: number | null
          art_analyses_month?: number | null
          art_analyses_month_reset?: string | null
          art_sessions_week?: number | null
          created_at?: string
          id?: string
          jiva_extra_sessions_purchased?: number | null
          jiva_sessions_week?: number | null
          navigator_messages_day?: number | null
          period_end?: string | null
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_art_therapy_entries: {
        Row: {
          analysis_text: string | null
          created_at: string
          id: string
          image_base64: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          analysis_text?: string | null
          created_at?: string
          id?: string
          image_base64?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          analysis_text?: string | null
          created_at?: string
          id?: string
          image_base64?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_navigator_progress: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          practice_count: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          practice_count?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          practice_count?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stories: {
        Row: {
          comment_count: number | null
          content: string
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          is_hidden: boolean | null
          last_comment_at: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_hidden?: boolean | null
          last_comment_at?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_hidden?: boolean | null
          last_comment_at?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          art_used: number
          created_at: string
          expires_at: string
          messages_used: number
          started_at: string
          user_id: string
        }
        Insert: {
          art_used?: number
          created_at?: string
          expires_at?: string
          messages_used?: number
          started_at?: string
          user_id: string
        }
        Update: {
          art_used?: number
          created_at?: string
          expires_at?: string
          messages_used?: number
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          ai_messages_count: number | null
          ai_minutes_used: number | null
          created_at: string
          id: string
          last_reset_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_messages_count?: number | null
          ai_minutes_used?: number | null
          created_at?: string
          id?: string
          last_reset_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_messages_count?: number | null
          ai_minutes_used?: number | null
          created_at?: string
          id?: string
          last_reset_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          gender: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      v_finetune_conversations: {
        Row: {
          conversion_quality_score: number | null
          converted_at: string | null
          created_at: string | null
          crisis_detected: boolean | null
          cta_clicked: boolean | null
          cta_clicked_at: string | null
          dominant_emotion: string | null
          id: string | null
          label: string | null
          messages: Json | null
          messages_count: number | null
          prompt_variant: string | null
          purchased_within_1h: boolean | null
          session_ended_at: string | null
          session_id: string | null
          session_started_at: string | null
          third_ai_message_at: string | null
          time_to_conversion_sec: number | null
          user_birth_year: number | null
          user_city: string | null
          user_context: Json | null
          user_country: string | null
          user_gender: string | null
          user_onboarding_state: Json | null
          user_timezone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_examples_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trial_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trial_analytics: {
        Row: {
          avg_duration_sec: number | null
          avg_messages: number | null
          conversion_rate: number | null
          conversions: number | null
          prompt_variant: string | null
          total_revenue_rub: number | null
          total_sessions: number | null
          yearly_conversions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_feature_limit: {
        Args: {
          p_daily_limit: number
          p_feature: string
          p_monthly_limit: number
          p_user_id: string
        }
        Returns: Json
      }
      extend_all_premium_subscriptions: {
        Args: { hours_to_add: number }
        Returns: number
      }
      get_date_immutable: { Args: { ts: string }; Returns: string }
      get_premium_user_ids: { Args: { user_ids: string[] }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_feature_usage: {
        Args: {
          p_daily_limit: number
          p_feature: string
          p_monthly_limit: number
          p_user_id: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_moderator_or_admin: { Args: never; Returns: boolean }
      is_premium: { Args: { p_user_id: string }; Returns: boolean }
      search_jiva_memories: {
        Args: {
          match_count?: number
          query_embedding: string
          query_user_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          metadata: Json
          score: number
          source_type: string
        }[]
      }
      send_community_message: {
        Args: {
          p_content: string
          p_media_type?: string
          p_media_url?: string
          p_reply_to_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
