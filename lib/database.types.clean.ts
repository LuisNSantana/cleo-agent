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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agent_threads: {
        Row: {
          agent_key: string
          agent_name: string | null
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_key: string
          agent_name?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_key?: string
          agent_name?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          thread_id: string
          tool_calls: Json | null
          tool_results: Json | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          thread_id: string
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          thread_id?: string
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          anonymous: boolean | null
          avg_daily_messages: number | null
          created_at: string | null
          daily_message_count: number | null
          daily_pro_message_count: number | null
          daily_pro_reset: string | null
          daily_reset: string | null
          display_name: string | null
          email: string
          favorite_features: string[] | null
          favorite_models: string[] | null
          id: string
          last_active_at: string | null
          longest_streak: number | null
          message_count: number | null
          premium: boolean | null
          profile_image: string | null
          streak_days: number | null
          system_prompt: string | null
          total_session_time_minutes: number | null
        }
        Insert: {
          anonymous?: boolean | null
          avg_daily_messages?: number | null
          created_at?: string | null
          daily_message_count?: number | null
          daily_pro_message_count?: number | null
          daily_pro_reset?: string | null
          daily_reset?: string | null
          display_name?: string | null
          email: string
          favorite_features?: string[] | null
          favorite_models?: string[] | null
          id: string
          last_active_at?: string | null
          longest_streak?: number | null
          message_count?: number | null
          premium?: boolean | null
          profile_image?: string | null
          streak_days?: number | null
          system_prompt?: string | null
          total_session_time_minutes?: number | null
        }
        Update: {
          anonymous?: boolean | null
          avg_daily_messages?: number | null
          created_at?: string | null
          daily_message_count?: number | null
          daily_pro_message_count?: number | null
          daily_pro_reset?: string | null
          daily_reset?: string | null
          display_name?: string | null
          email?: string
          favorite_features?: string[] | null
          favorite_models?: string[] | null
          id?: string
          last_active_at?: string | null
          longest_streak?: number | null
          message_count?: number | null
          premium?: boolean | null
          profile_image?: string | null
          streak_days?: number | null
          system_prompt?: string | null
          total_session_time_minutes?: number | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string | null
          engagement_score: number | null
          id: string
          last_message_at: string | null
          message_count: number | null
          model: string | null
          project_id: string | null
          public: boolean
          system_prompt: string | null
          title: string | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          model?: string | null
          project_id?: string | null
          public?: boolean
          system_prompt?: string | null
          title?: string | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          model?: string | null
          project_id?: string | null
          public?: boolean
          system_prompt?: string | null
          title?: string | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string | null
          experimental_attachments: Json | null
          id: number
          input_tokens: number | null
          message_group_id: string | null
          model: string | null
          output_tokens: number | null
          parts: Json | null
          personality_snapshot: Json | null
          response_time_ms: number | null
          role: string
          tools_invoked: string[] | null
          user_id: string | null
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string | null
          experimental_attachments?: Json | null
          id?: number
          input_tokens?: number | null
          message_group_id?: string | null
          model?: string | null
          output_tokens?: number | null
          parts?: Json | null
          personality_snapshot?: Json | null
          response_time_ms?: number | null
          role: string
          tools_invoked?: string[] | null
          user_id?: string | null
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string | null
          experimental_attachments?: Json | null
          id?: number
          input_tokens?: number | null
          message_group_id?: string | null
          model?: string | null
          output_tokens?: number | null
          parts?: Json | null
          personality_snapshot?: Json | null
          response_time_ms?: number | null
          role?: string
          tools_invoked?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          iv: string
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          iv: string
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          iv?: string
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          language: string | null
          personality_settings: Json | null
          sidebar_state: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          language?: string | null
          personality_settings?: Json | null
          sidebar_state?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          language?: string | null
          personality_settings?: Json | null
          sidebar_state?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_service_connections: {
        Row: {
          access_token: string | null
          account_info: Json | null
          connected: boolean | null
          created_at: string | null
          id: string
          refresh_token: string | null
          scopes: string[] | null
          service_id: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_info?: Json | null
          connected?: boolean | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          service_id: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_info?: Json | null
          connected?: boolean | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          service_id?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          error_message: string
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          error_message: string
          id?: string
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_attachments: {
        Row: {
          chat_id: string
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      model_usage_analytics: {
        Row: {
          agent_id: string | null
          average_response_time_ms: number | null
          created_at: string | null
          execution_id: string | null
          failed_requests: number | null
          id: string
          message_count: number | null
          model_name: string
          personality_type: string | null
          reasoning_requests: number | null
          successful_requests: number | null
          tool_calls_count: number | null
          total_cost_estimate: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          updated_at: string | null
          usage_date: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          average_response_time_ms?: number | null
          created_at?: string | null
          execution_id?: string | null
          failed_requests?: number | null
          id?: string
          message_count?: number | null
          model_name: string
          personality_type?: string | null
          reasoning_requests?: number | null
          successful_requests?: number | null
          tool_calls_count?: number | null
          total_cost_estimate?: number | null
          total_input_tokens?: number | null
          total_output_tokens?: number | null
          updated_at?: string | null
          usage_date?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          average_response_time_ms?: number | null
          created_at?: string | null
          execution_id?: string | null
          failed_requests?: number | null
          id?: string
          message_count?: number | null
          model_name?: string
          personality_type?: string | null
          reasoning_requests?: number | null
          successful_requests?: number | null
          tool_calls_count?: number | null
          total_cost_estimate?: number | null
          total_input_tokens?: number | null
          total_output_tokens?: number | null
          updated_at?: string | null
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_usage_analytics: {
        Row: {
          created_at: string | null
          feature_name: string
          id: string
          metadata: Json | null
          success_rate: number | null
          total_time_spent_minutes: number | null
          updated_at: string | null
          usage_count: number | null
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_name: string
          id?: string
          metadata?: Json | null
          success_rate?: number | null
          total_time_spent_minutes?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_name?: string
          id?: string
          metadata?: Json | null
          success_rate?: number | null
          total_time_spent_minutes?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_usage_analytics: {
        Row: {
          avg_execution_time_ms: number | null
          created_at: string | null
          error_count: number | null
          error_types: string[] | null
          id: string
          invocation_count: number | null
          popular_parameters: Json | null
          success_count: number | null
          tool_name: string
          total_execution_time_ms: number | null
          updated_at: string | null
          usage_date: string
          user_id: string
        }
        Insert: {
          avg_execution_time_ms?: number | null
          created_at?: string | null
          error_count?: number | null
          error_types?: string[] | null
          id?: string
          invocation_count?: number | null
          popular_parameters?: Json | null
          success_count?: number | null
          tool_name: string
          total_execution_time_ms?: number | null
          updated_at?: string | null
          usage_date?: string
          user_id: string
        }
        Update: {
          avg_execution_time_ms?: number | null
          created_at?: string | null
          error_count?: number | null
          error_types?: string[] | null
          id?: string
          invocation_count?: number | null
          popular_parameters?: Json | null
          success_count?: number | null
          tool_name?: string
          total_execution_time_ms?: number | null
          updated_at?: string | null
          usage_date?: string
          user_id?: string
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
        Relationships: []
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
      skyvern_user_credentials: {
        Row: {
          api_key: string
          base_url: string
          created_at: string
          credential_name: string
          id: string
          is_active: boolean
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          base_url?: string
          created_at?: string
          credential_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string
          credential_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skyvern_task_history: {
        Row: {
          completed_at: string | null
          created_at: string
          credential_id: string
          error_message: string | null
          id: string
          request_data: Json | null
          response_data: Json | null
          started_at: string | null
          status: string
          task_id: string
          task_type: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credential_id: string
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          started_at?: string | null
          status: string
          task_id: string
          task_type: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credential_id?: string
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          started_at?: string | null
          status?: string
          task_id?: string
          task_type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skyvern_task_history_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "skyvern_user_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
