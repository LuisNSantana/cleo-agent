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

// Convenience alias to match common import pattern in app code
export type Tables = Database['public']['Tables']

