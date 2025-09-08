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
          agent_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string
          title?: string
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