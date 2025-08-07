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
          id: string
          model: string | null
          project_id: string | null
          public: boolean
          system_prompt: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          model?: string | null
          project_id?: string | null
          public?: boolean
          system_prompt?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          model?: string | null
          project_id?: string | null
          public?: boolean
          system_prompt?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
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
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string | null
          experimental_attachments: Json | null
          id: number
          message_group_id: string | null
          model: string | null
          parts: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string | null
          experimental_attachments?: Json | null
          id?: number
          message_group_id?: string | null
          model?: string | null
          parts?: Json | null
          role: string
          user_id?: string | null
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string | null
          experimental_attachments?: Json | null
          id?: number
          message_group_id?: string | null
          model?: string | null
          parts?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
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
          created_at: string | null
          hidden_models: string[] | null
          layout: string | null
          multi_model_enabled: boolean | null
          prompt_suggestions: boolean | null
          show_conversation_previews: boolean | null
          show_tool_invocations: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hidden_models?: string[] | null
          layout?: string | null
          multi_model_enabled?: boolean | null
          prompt_suggestions?: boolean | null
          show_conversation_previews?: boolean | null
          show_tool_invocations?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hidden_models?: string[] | null
          layout?: string | null
          multi_model_enabled?: boolean | null
          prompt_suggestions?: boolean | null
          show_conversation_previews?: boolean | null
          show_tool_invocations?: boolean | null
          updated_at?: string | null
          user_id?: string
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
      users: {
        Row: {
          anonymous: boolean | null
          created_at: string | null
          daily_message_count: number | null
          daily_pro_message_count: number | null
          daily_pro_reset: string | null
          daily_reset: string | null
          display_name: string | null
          email: string
          favorite_models: string[] | null
          id: string
          last_active_at: string | null
          message_count: number | null
          premium: boolean | null
          profile_image: string | null
          system_prompt: string | null
        }
        Insert: {
          anonymous?: boolean | null
          created_at?: string | null
          daily_message_count?: number | null
          daily_pro_message_count?: number | null
          daily_pro_reset?: string | null
          daily_reset?: string | null
          display_name?: string | null
          email: string
          favorite_models?: string[] | null
          id: string
          last_active_at?: string | null
          message_count?: number | null
          premium?: boolean | null
          profile_image?: string | null
          system_prompt?: string | null
        }
        Update: {
          anonymous?: boolean | null
          created_at?: string | null
          daily_message_count?: number | null
          daily_pro_message_count?: number | null
          daily_pro_reset?: string | null
          daily_reset?: string | null
          display_name?: string | null
          email?: string
          favorite_models?: string[] | null
          id?: string
          last_active_at?: string | null
          message_count?: number | null
          premium?: boolean | null
          profile_image?: string | null
          system_prompt?: string | null
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
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
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
