import type { Attachment } from "@/lib/file-handling"

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_threads: {
        Row: {
          id: string
          user_id: string
          agent_key: string | null
          agent_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          agent_key?: string | null
          agent_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          agent_key?: string | null
          agent_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          role: 'user' | 'assistant' | 'tool' | 'system'
          content: string
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          role: 'user' | 'assistant' | 'tool' | 'system'
          content: string
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'tool' | 'system'
          content?: string
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_service_connections: {
        Row: {
          id: string
          user_id: string
          service_id: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          scopes: string[] | null
          connected: boolean | null
          account_info: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          connected?: boolean | null
          account_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          connected?: boolean | null
          account_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_service_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          id: string
          user_id: string | null
          error_type: string
          error_message: string
          error_context: Json | null
          severity_level: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          error_type: string
          error_message: string
          error_context?: Json | null
          severity_level?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          error_type?: string
          error_message?: string
          error_context?: Json | null
          severity_level?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      model_usage_analytics: {
        Row: {
          id: string
          user_id: string
          model_name: string
          usage_date: string
          message_count: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_cost_estimate: number | null
          average_response_time_ms: number | null
          successful_requests: number | null
          failed_requests: number | null
          personality_type: string | null
          tool_calls_count: number | null
          reasoning_requests: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          model_name: string
          usage_date?: string
          message_count?: number | null
          total_input_tokens?: number | null
          total_output_tokens?: number | null
          total_cost_estimate?: number | null
          average_response_time_ms?: number | null
          successful_requests?: number | null
          failed_requests?: number | null
          personality_type?: string | null
          tool_calls_count?: number | null
          reasoning_requests?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          model_name?: string
          usage_date?: string
          message_count?: number | null
          total_input_tokens?: number | null
          total_output_tokens?: number | null
          total_cost_estimate?: number | null
          average_response_time_ms?: number | null
          successful_requests?: number | null
          failed_requests?: number | null
          personality_type?: string | null
          tool_calls_count?: number | null
          reasoning_requests?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_usage_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage_analytics: {
        Row: {
          id: string
          user_id: string
          feature_name: string
          usage_date: string
          usage_count: number | null
          total_time_spent_minutes: number | null
          success_rate: number | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          feature_name: string
          usage_date?: string
          usage_count?: number | null
          total_time_spent_minutes?: number | null
          success_rate?: number | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          feature_name?: string
          usage_date?: string
          usage_count?: number | null
          total_time_spent_minutes?: number | null
          success_rate?: number | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_usage_analytics: {
        Row: {
          id: string
          user_id: string
          tool_name: string
          usage_date: string
          invocation_count: number | null
          success_count: number | null
          error_count: number | null
          avg_execution_time_ms: number | null
          total_execution_time_ms: number | null
          popular_parameters: Json | null
          error_types: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tool_name: string
          usage_date?: string
          invocation_count?: number | null
          success_count?: number | null
          error_count?: number | null
          avg_execution_time_ms?: number | null
          total_execution_time_ms?: number | null
          popular_parameters?: Json | null
          error_types?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tool_name?: string
          usage_date?: string
          invocation_count?: number | null
          success_count?: number | null
          error_count?: number | null
          avg_execution_time_ms?: number | null
          total_execution_time_ms?: number | null
          popular_parameters?: Json | null
          error_types?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_usage_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_session_analytics: {
        Row: {
          id: string
          user_id: string
          session_start: string
          session_end: string | null
          session_duration_minutes: number | null
          messages_sent: number | null
          messages_received: number | null
          models_used: string[] | null
          tools_invoked: string[] | null
          personality_used: Json | null
          canvas_interactions: number | null
          files_uploaded: number | null
          rag_queries: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_start?: string
          session_end?: string | null
          session_duration_minutes?: number | null
          messages_sent?: number | null
          messages_received?: number | null
          models_used?: string[] | null
          tools_invoked?: string[] | null
          personality_used?: Json | null
          canvas_interactions?: number | null
          files_uploaded?: number | null
          rag_queries?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_start?: string
          session_end?: string | null
          session_duration_minutes?: number | null
          messages_sent?: number | null
          messages_received?: number | null
          models_used?: string[] | null
          tools_invoked?: string[] | null
          personality_used?: Json | null
          canvas_interactions?: number | null
          files_uploaded?: number | null
          rag_queries?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_session_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_analytics: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          total_messages: number | null
          user_messages: number | null
          assistant_messages: number | null
          conversation_duration_minutes: number | null
          models_switched: number | null
          personality_changes: number | null
          tools_used: string[] | null
          avg_response_length: number | null
          complexity_score: number | null
          satisfaction_rating: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          total_messages?: number | null
          user_messages?: number | null
          assistant_messages?: number | null
          conversation_duration_minutes?: number | null
          models_switched?: number | null
          personality_changes?: number | null
          tools_used?: string[] | null
          avg_response_length?: number | null
          complexity_score?: number | null
          satisfaction_rating?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string
          total_messages?: number | null
          user_messages?: number | null
          assistant_messages?: number | null
          conversation_duration_minutes?: number | null
          models_switched?: number | null
          personality_changes?: number | null
          tools_used?: string[] | null
          avg_response_length?: number | null
          complexity_score?: number | null
          satisfaction_rating?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analytics_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          chat_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string | null
          updated_at: string | null
          id: string
          model: string | null
          project_id: string | null
          title: string | null
          user_id: string
          public: boolean
        }
        Insert: {
          created_at?: string | null
          updated_at?: string | null
          id?: string
          model?: string | null
          project_id?: string | null
          title?: string | null
          user_id: string
          public?: boolean
        }
        Update: {
          created_at?: string | null
          updated_at?: string | null
          id?: string
          model?: string | null
          project_id?: string | null
          title?: string | null
          user_id?: string
          public?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          experimental_attachments: Attachment[]
          chat_id: string
          content: string | null
          created_at: string | null
          id: number
          role: "system" | "user" | "assistant" | "data"
          parts: Json | null
          user_id?: string | null
          message_group_id: string | null
          model: string | null
          response_time_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          tools_invoked?: string[] | null
          personality_snapshot?: Json | null
        }
        Insert: {
          experimental_attachments?: Attachment[]
          chat_id: string
          content: string | null
          created_at?: string | null
          id?: number
          role: "system" | "user" | "assistant" | "data"
          parts?: Json
          user_id?: string | null
          message_group_id?: string | null
          model?: string | null
          response_time_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          tools_invoked?: string[] | null
          personality_snapshot?: Json | null
        }
        Update: {
          experimental_attachments?: Attachment[]
          chat_id?: string
          content?: string | null
          created_at?: string | null
          id?: number
          role?: "system" | "user" | "assistant" | "data"
          parts?: Json
          user_id?: string | null
          message_group_id?: string | null
          model?: string | null
          response_time_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          tools_invoked?: string[] | null
          personality_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_user_credentials: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          is_active: boolean
          store_domain: string
          store_identifier: string
          store_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          store_domain: string
          store_identifier?: string
          store_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          store_domain?: string
          store_identifier?: string
          store_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          anonymous: boolean | null
          created_at: string | null
          daily_message_count: number | null
          daily_reset: string | null
          display_name: string | null
          email: string
          favorite_models: string[] | null
          id: string
          message_count: number | null
          premium: boolean | null
          profile_image: string | null
          last_active_at: string | null
          daily_pro_message_count: number | null
          daily_pro_reset: string | null
          system_prompt: string | null
        }
        Insert: {
          anonymous?: boolean | null
          created_at?: string | null
          daily_message_count?: number | null
          daily_reset?: string | null
          display_name?: string | null
          email: string
          favorite_models?: string[] | null
          id: string
          message_count?: number | null
          premium?: boolean | null
          profile_image?: string | null
          last_active_at?: string | null
          daily_pro_message_count?: number | null
          daily_pro_reset?: string | null
          system_prompt?: string | null
        }
        Update: {
          anonymous?: boolean | null
          created_at?: string | null
          daily_message_count?: number | null
          daily_reset?: string | null
          display_name?: string | null
          email?: string
          favorite_models?: string[] | null
          id?: string
          message_count?: number | null
          premium?: boolean | null
          profile_image?: string | null
          last_active_at?: string | null
          daily_pro_message_count?: number | null
          daily_pro_reset?: string | null
          system_prompt?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string | null
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_keys: {
        Row: {
          user_id: string
          provider: string
          encrypted_key: string
          iv: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          provider: string
          encrypted_key: string
          iv: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          provider?: string
          encrypted_key?: string
          iv?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          user_id: string
          layout: string | null
          prompt_suggestions: boolean | null
          show_tool_invocations: boolean | null
          show_conversation_previews: boolean | null
          multi_model_enabled: boolean | null
          hidden_models: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          layout?: string | null
          prompt_suggestions?: boolean | null
          show_tool_invocations?: boolean | null
          show_conversation_previews?: boolean | null
          multi_model_enabled?: boolean | null
          hidden_models?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          layout?: string | null
          prompt_suggestions?: boolean | null
          show_tool_invocations?: boolean | null
          show_conversation_previews?: boolean | null
          multi_model_enabled?: boolean | null
          hidden_models?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analytics_daily_summary: {
        Row: {
          usage_date: string | null
          active_users: number | null
          total_messages: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          models_used: number | null
          avg_response_time: number | null
        }
        Relationships: []
      }
      analytics_model_popularity: {
        Row: {
          model_name: string | null
          unique_users: number | null
          total_messages: number | null
          total_tokens: number | null
          avg_response_time: number | null
          successful_requests: number | null
          failed_requests: number | null
        }
        Relationships: []
      }
      analytics_user_engagement: {
        Row: {
          id: string | null
          email: string | null
          user_since: string | null
          streak_days: number | null
          longest_streak: number | null
          avg_daily_messages: number | null
          total_chats: number | null
          total_messages: number | null
          last_activity: string | null
          models_tried: number | null
        }
        Relationships: []
      }
      user_daily_summary: {
        Row: {
          user_id: string
          display_name: string | null
          email: string
          usage_date: string | null
          messages_sent: number | null
          messages_received: number | null
          conversations: number | null
          models_used: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          avg_response_time_ms: number | null
        }
        Relationships: []
      }
      model_performance_summary: {
        Row: {
          model: string | null
          total_messages: number | null
          unique_users: number | null
          avg_response_time_ms: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          usage_date: string | null
        }
        Relationships: []
      }
      popular_features_summary: {
        Row: {
          feature_name: string | null
          total_usage: number | null
          unique_users: number | null
          avg_success_rate: number | null
          total_time_minutes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_update_model_analytics: {
        Args: {
          p_user_id: string
          p_model_name: string
          p_input_tokens: number
          p_output_tokens: number
          p_response_time_ms: number
          p_success: boolean
          p_cost_usd: number
        }
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
