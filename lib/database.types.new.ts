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
      agent_execution_steps: {
        Row: {
          duration_ms: number | null
          error_details: string | null
          execution_id: string
          id: string
          step_data: Json
          step_number: number
          step_type: string
          success: boolean | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          duration_ms?: number | null
          error_details?: string | null
          execution_id: string
          id?: string
          step_data?: Json
          step_number: number
          step_type: string
          success?: boolean | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          duration_ms?: number | null
          error_details?: string | null
          execution_id?: string
          id?: string
          step_data?: Json
          step_number?: number
          step_type?: string
          success?: boolean | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_execution_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "analytics_user_engagement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_execution_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_daily_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_execution_steps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_executions: {
        Row: {
          agent_id: string
          chat_id: string | null
          completed_at: string | null
          created_at: string | null
          delegated_to: string | null
          delegation_reason: string | null
          error_message: string | null
          execution_metadata: Json | null
          id: string
          input_message: string
          input_tokens: number | null
          output_message: string | null
          output_tokens: number | null
          parent_execution_id: string | null
          response_time_ms: number | null
          started_at: string | null
          status: string
          tools_used: string[] | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          chat_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          delegated_to?: string | null
          delegation_reason?: string | null
          error_message?: string | null
          execution_metadata?: Json | null
          id?: string
          input_message: string
          input_tokens?: number | null
          output_message?: string | null
          output_tokens?: number | null
          parent_execution_id?: string | null
          response_time_ms?: number | null
          started_at?: string | null
          status?: string
          tools_used?: string[] | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          chat_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          delegated_to?: string | null
          delegation_reason?: string | null
          error_message?: string | null
          execution_metadata?: Json | null
          id?: string
          input_message?: string
          input_tokens?: number | null
          output_message?: string | null
          output_tokens?: number | null
          parent_execution_id?: string | null
          response_time_ms?: number | null
          started_at?: string | null
          status?: string
          tools_used?: string[] | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_delegated_to_fkey"
            columns: ["delegated_to"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_parent_execution_id_fkey"
            columns: ["parent_execution_id"]
            isOneToOne: false
            referencedRelation: "agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "analytics_user_engagement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_daily_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_executions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "analytics_user_engagement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_daily_summary"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "agent_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "analytics_user_engagement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_daily_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          can_delegate: boolean | null
          color: string | null
          created_at: string | null
          delegated_by: Json | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_tokens: number | null
          model: string
          name: string
          priority: number | null
          role: string
          system_prompt: string
          tags: string[] | null
          temperature: number | null
          tools: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_delegate?: boolean | null
          color?: string | null
          created_at?: string | null
          delegated_by?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_tokens?: number | null
          model?: string
          name: string
          priority?: number | null
          role: string
          system_prompt: string
          tags?: string[] | null
          temperature?: number | null
          tools?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_delegate?: boolean | null
          color?: string | null
          created_at?: string | null
          delegated_by?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_tokens?: number | null
          model?: string
          name?: string
          priority?: number | null
          role?: string
          system_prompt?: string
          tags?: string[] | null
          temperature?: number | null
          tools?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "analytics_user_engagement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_daily_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      // ... (other tables remain the same)
    }
    Views: {
      // ... (views remain the same)
    }
    Functions: {
      // ... (functions remain the same)
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
