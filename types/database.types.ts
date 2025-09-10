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
      // ... resto de tablas (omitido por brevedad)
      agents: {
        Row: {
          can_delegate: boolean | null
          color: string | null
          created_at: string | null
          delegated_by: Json | null
          delegation_tool_name: string | null
          description: string | null
          dynamic: boolean | null
          icon: string | null
          id: string
          immutable: boolean | null
          is_active: boolean | null
          is_default: boolean | null
          is_sub_agent: boolean | null
          max_tokens: number | null
          model: string
          name: string
          parent_agent_id: string | null
          predefined: boolean | null
          priority: number | null
          role: string
          sub_agent_config: Json | null
          system_prompt: string
          tags: string[] | null
          temperature: number | null
          tools: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_delegate?: boolean | null
          color?: string | null
          created_at?: string | null
          delegated_by?: Json | null
          delegation_tool_name?: string | null
          description?: string | null
          dynamic?: boolean | null
          icon?: string | null
          id?: string
          immutable?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_sub_agent?: boolean | null
          max_tokens?: number | null
          model?: string
          name: string
          parent_agent_id?: string | null
          predefined?: boolean | null
          priority?: number | null
          role: string
          sub_agent_config?: Json | null
          system_prompt: string
          tags?: string[] | null
          temperature?: number | null
          tools?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_delegate?: boolean | null
          color?: string | null
          created_at?: string | null
          delegated_by?: Json | null
          delegation_tool_name?: string | null
          description?: string | null
          dynamic?: boolean | null
          icon?: string | null
          id?: string
          immutable?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_sub_agent?: boolean | null
          max_tokens?: number | null
          model?: string
          name?: string
          parent_agent_id?: string | null
          predefined?: boolean | null
          priority?: number | null
          role?: string
          sub_agent_config?: Json | null
          system_prompt?: string
          tags?: string[] | null
          temperature?: number | null
          tools?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
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
      // ... resto de tablas
    }
    Views: {
      // ... vistas (omitido por brevedad)
    }
    Functions: {
      get_all_active_agents: {
        Args: { p_user_id: string }
        Returns: {
          can_delegate: boolean | null
          color: string | null
          created_at: string | null
          delegated_by: Json | null
          delegation_tool_name: string | null
          description: string | null
          dynamic: boolean | null
          icon: string | null
          id: string
          immutable: boolean | null
          is_active: boolean | null
          is_default: boolean | null
          is_sub_agent: boolean | null
          max_tokens: number | null
          model: string
          name: string
          parent_agent_id: string | null
          predefined: boolean | null
          priority: number | null
          role: string
          sub_agent_config: Json | null
          system_prompt: string
          tags: string[] | null
          temperature: number | null
          tools: string[] | null
          updated_at: string | null
          user_id: string | null
        }[]
      }
      // ... otras funciones
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ... resto de tipos de utilidad
