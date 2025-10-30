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
          id?: string
          name: string
          role: string
          system_prompt: string
          model?: string | null
          can_delegate?: boolean | null
          color?: string | null
          created_at?: string | null
          delegated_by?: Json | null
          delegation_tool_name?: string | null
          description?: string | null
          dynamic?: boolean | null
          icon?: string | null
          immutable?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_sub_agent?: boolean | null
          max_tokens?: number | null
          parent_agent_id?: string | null
          predefined?: boolean | null
          priority?: number | null
          sub_agent_config?: Json | null
          tags?: string[] | null
          temperature?: number | null
          tools?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          role?: string
          system_prompt?: string
          model?: string | null
          can_delegate?: boolean | null
          color?: string | null
          created_at?: string | null
          delegated_by?: Json | null
          delegation_tool_name?: string | null
          description?: string | null
          dynamic?: boolean | null
          icon?: string | null
          immutable?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_sub_agent?: boolean | null
          max_tokens?: number | null
          parent_agent_id?: string | null
          predefined?: boolean | null
          priority?: number | null
          sub_agent_config?: Json | null
          tags?: string[] | null
          temperature?: number | null
          tools?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          agent_id: string
          title: string
          status?: string
          priority?: string | null
          description?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          agent_id?: string
          title?: string
          status?: string
          priority?: string | null
          description?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_interrupts: {
        Row: {
          agent_id: string
          created_at: string
          execution_id: string
          id: string
          interrupt_payload: Json
          resolved_at: string | null
          response: Json | null
          status: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          execution_id: string
          id?: string
          interrupt_payload: Json
          resolved_at?: string | null
          response?: Json | null
          status: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          execution_id?: string
          id?: string
          interrupt_payload?: Json
          resolved_at?: string | null
          response?: Json | null
          status?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      // Add other tables as needed
      [key: string]: any
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