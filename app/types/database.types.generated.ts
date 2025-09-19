/* AUTO-GENERATED: Do not edit. Sync source: Supabase */
// Generated on 2025-08-16

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12.2.12 (cd3cf9e)" }
  public: {
    Tables: {
      chat_attachments: {
        Row: { chat_id: string; created_at: string | null; file_name: string | null; file_size: number | null; file_type: string | null; file_url: string; id: string; user_id: string }
        Insert: { chat_id: string; created_at?: string | null; file_name?: string | null; file_size?: number | null; file_type?: string | null; file_url: string; id?: string; user_id: string }
        Update: { chat_id?: string; created_at?: string | null; file_name?: string | null; file_size?: number | null; file_type?: string | null; file_url?: string; id?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "fk_chat"; columns: ["chat_id"]; isOneToOne: false; referencedRelation: "chats"; referencedColumns: ["id"] }, { foreignKeyName: "fk_user"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      chats: {
        Row: { created_at: string | null; engagement_score: number | null; id: string; last_message_at: string | null; message_count: number | null; model: string | null; project_id: string | null; public: boolean; system_prompt: string | null; title: string | null; total_tokens: number | null; updated_at: string | null; user_id: string }
        Insert: { created_at?: string | null; engagement_score?: number | null; id?: string; last_message_at?: string | null; message_count?: number | null; model?: string | null; project_id?: string | null; public?: boolean; system_prompt?: string | null; title?: string | null; total_tokens?: number | null; updated_at?: string | null; user_id: string }
        Update: { created_at?: string | null; engagement_score?: number | null; id?: string; last_message_at?: string | null; message_count?: number | null; model?: string | null; project_id?: string | null; public?: boolean; system_prompt?: string | null; title?: string | null; total_tokens?: number | null; updated_at?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "chats_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }, { foreignKeyName: "chats_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      conversation_analytics: {
        Row: { assistant_messages: number | null; avg_response_length: number | null; chat_id: string; complexity_score: number | null; conversation_duration_minutes: number | null; created_at: string | null; id: string; models_switched: number | null; personality_changes: number | null; satisfaction_rating: number | null; tools_used: string[] | null; total_messages: number | null; updated_at: string | null; user_id: string; user_messages: number | null }
        Insert: { assistant_messages?: number | null; avg_response_length?: number | null; chat_id: string; complexity_score?: number | null; conversation_duration_minutes?: number | null; created_at?: string | null; id?: string; models_switched?: number | null; personality_changes?: number | null; satisfaction_rating?: number | null; tools_used?: string[] | null; total_messages?: number | null; updated_at?: string | null; user_id: string; user_messages?: number | null }
        Update: { assistant_messages?: number | null; avg_response_length?: number | null; chat_id?: string; complexity_score?: number | null; conversation_duration_minutes?: number | null; created_at?: string | null; id?: string; models_switched?: number | null; personality_changes?: number | null; satisfaction_rating?: number | null; tools_used?: string[] | null; total_messages?: number | null; updated_at?: string | null; user_id?: string; user_messages?: number | null }
        Relationships: [{ foreignKeyName: "conversation_analytics_chat_id_fkey"; columns: ["chat_id"]; isOneToOne: true; referencedRelation: "chats"; referencedColumns: ["id"] }, { foreignKeyName: "conversation_analytics_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      document_chunks: {
        Row: { chunk_index: number; chunk_version: string | null; content: string; content_tokens: number | null; created_at: string | null; document_id: string; embedding: string | null; id: string; metadata: Json | null; user_id: string }
        Insert: { chunk_index: number; chunk_version?: string | null; content: string; content_tokens?: number | null; created_at?: string | null; document_id: string; embedding?: string | null; id?: string; metadata?: Json | null; user_id: string }
        Update: { chunk_index?: number; chunk_version?: string | null; content?: string; content_tokens?: number | null; created_at?: string | null; document_id?: string; embedding?: string | null; id?: string; metadata?: Json | null; user_id?: string }
        Relationships: [{ foreignKeyName: "document_chunks_document_id_fkey"; columns: ["document_id"]; isOneToOne: false; referencedRelation: "documents"; referencedColumns: ["id"] }, { foreignKeyName: "document_chunks_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      documents: {
        Row: { chat_id: string | null; content_html: string | null; content_md: string; created_at: string; filename: string; id: string; project_id: string | null; title: string | null; tokens_estimated: number | null; updated_at: string; user_id: string }
        Insert: { chat_id?: string | null; content_html?: string | null; content_md?: string; created_at?: string; filename: string; id?: string; project_id?: string | null; title?: string | null; tokens_estimated?: number | null; updated_at?: string; user_id: string }
        Update: { chat_id?: string | null; content_html?: string | null; content_md?: string; created_at?: string; filename?: string; id?: string; project_id?: string | null; title?: string | null; tokens_estimated?: number | null; updated_at?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "documents_chat_id_fkey"; columns: ["chat_id"]; isOneToOne: false; referencedRelation: "chats"; referencedColumns: ["id"] }, { foreignKeyName: "documents_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }, { foreignKeyName: "documents_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      feature_usage_analytics: {
        Row: { created_at: string | null; feature_name: string; id: string; metadata: Json | null; success_rate: number | null; total_time_spent_minutes: number | null; updated_at: string | null; usage_count: number | null; usage_date: string; user_id: string }
        Insert: { created_at?: string | null; feature_name: string; id?: string; metadata?: Json | null; success_rate?: number | null; total_time_spent_minutes?: number | null; updated_at?: string | null; usage_count?: number | null; usage_date?: string; user_id: string }
        Update: { created_at?: string | null; feature_name?: string; id?: string; metadata?: Json | null; success_rate?: number | null; total_time_spent_minutes?: number | null; updated_at?: string | null; usage_count?: number | null; usage_date?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "feature_usage_analytics_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      feedback: {
        Row: { created_at: string | null; id: string; message: string; user_id: string }
        Insert: { created_at?: string | null; id?: string; message: string; user_id: string }
        Update: { created_at?: string | null; id?: string; message?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "feedback_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      ingestion_jobs: {
        Row: { created_at: string | null; document_id: string; error_message: string | null; id: string; status: string; updated_at: string | null; user_id: string }
        Insert: { created_at?: string | null; document_id: string; error_message?: string | null; id?: string; status?: string; updated_at?: string | null; user_id: string }
        Update: { created_at?: string | null; document_id?: string; error_message?: string | null; id?: string; status?: string; updated_at?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "ingestion_jobs_document_id_fkey"; columns: ["document_id"]; isOneToOne: false; referencedRelation: "documents"; referencedColumns: ["id"] }, { foreignKeyName: "ingestion_jobs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      messages: {
        Row: { chat_id: string; content: string | null; created_at: string | null; experimental_attachments: Json | null; id: number; input_tokens: number | null; message_group_id: string | null; model: string | null; output_tokens: number | null; parts: Json | null; personality_snapshot: Json | null; response_time_ms: number | null; role: string; tools_invoked: string[] | null; user_id: string | null }
        Insert: { chat_id: string; content?: string | null; created_at?: string | null; experimental_attachments?: Json | null; id?: number; input_tokens?: number | null; message_group_id?: string | null; model?: string | null; output_tokens?: number | null; parts?: Json | null; personality_snapshot?: Json | null; response_time_ms?: number | null; role: string; tools_invoked?: string[] | null; user_id?: string | null }
        Update: { chat_id?: string; content?: string | null; created_at?: string | null; experimental_attachments?: Json | null; id?: number; input_tokens?: number | null; message_group_id?: string | null; model?: string | null; output_tokens?: number | null; parts?: Json | null; personality_snapshot?: Json | null; response_time_ms?: number | null; role?: string; tools_invoked?: string[] | null; user_id?: string | null }
        Relationships: [{ foreignKeyName: "messages_chat_id_fkey"; columns: ["chat_id"]; isOneToOne: false; referencedRelation: "chats"; referencedColumns: ["id"] }, { foreignKeyName: "messages_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      model_usage_analytics: {
        Row: { average_response_time_ms: number | null; created_at: string | null; failed_requests: number | null; id: string; message_count: number | null; model_name: string; personality_type: string | null; reasoning_requests: number | null; successful_requests: number | null; tool_calls_count: number | null; total_cost_estimate: number | null; total_input_tokens: number | null; total_output_tokens: number | null; updated_at: string | null; usage_date: string; user_id: string }
        Insert: { average_response_time_ms?: number | null; created_at?: string | null; failed_requests?: number | null; id?: string; message_count?: number | null; model_name: string; personality_type?: string | null; reasoning_requests?: number | null; successful_requests?: number | null; tool_calls_count?: number | null; total_cost_estimate?: number | null; total_input_tokens?: number | null; total_output_tokens?: number | null; updated_at?: string | null; usage_date?: string; user_id: string }
        Update: { average_response_time_ms?: number | null; created_at?: string | null; failed_requests?: number | null; id?: string; message_count?: number | null; model_name?: string; personality_type?: string | null; reasoning_requests?: number | null; successful_requests?: number | null; tool_calls_count?: number | null; total_cost_estimate?: number | null; total_input_tokens?: number | null; total_output_tokens?: number | null; updated_at?: string | null; usage_date?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "model_usage_analytics_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      projects: {
        Row: { color: string | null; created_at: string | null; description: string | null; id: string; name: string; notes: string | null; user_id: string }
        Insert: { color?: string | null; created_at?: string | null; description?: string | null; id?: string; name: string; notes?: string | null; user_id: string }
        Update: { color?: string | null; created_at?: string | null; description?: string | null; id?: string; name?: string; notes?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "projects_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      tool_usage_analytics: {
        Row: { avg_execution_time_ms: number | null; created_at: string | null; error_count: number | null; error_types: string[] | null; id: string; invocation_count: number | null; popular_parameters: Json | null; success_count: number | null; tool_name: string; total_execution_time_ms: number | null; updated_at: string | null; usage_date: string; user_id: string }
        Insert: { avg_execution_time_ms?: number | null; created_at?: string | null; error_count?: number | null; error_types?: string[] | null; id?: string; invocation_count?: number | null; popular_parameters?: Json | null; success_count?: number | null; tool_name: string; total_execution_time_ms?: number | null; updated_at?: string | null; usage_date?: string; user_id: string }
        Update: { avg_execution_time_ms?: number | null; created_at?: string | null; error_count?: number | null; error_types?: string[] | null; id?: string; invocation_count?: number | null; popular_parameters?: Json | null; success_count?: number | null; tool_name?: string; total_execution_time_ms?: number | null; updated_at?: string | null; usage_date?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "tool_usage_analytics_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      user_keys: {
        Row: { created_at: string | null; encrypted_key: string; iv: string; provider: string; updated_at: string | null; user_id: string }
        Insert: { created_at?: string | null; encrypted_key: string; iv: string; provider: string; updated_at?: string | null; user_id: string }
        Update: { created_at?: string | null; encrypted_key?: string; iv?: string; provider?: string; updated_at?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "user_keys_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      user_preferences: {
        Row: { created_at: string | null; language: string | null; personality_settings: Json | null; sidebar_state: string | null; theme: string | null; updated_at: string | null; user_id: string }
        Insert: { created_at?: string | null; language?: string | null; personality_settings?: Json | null; sidebar_state?: string | null; theme?: string | null; updated_at?: string | null; user_id: string }
        Update: { created_at?: string | null; language?: string | null; personality_settings?: Json | null; sidebar_state?: string | null; theme?: string | null; updated_at?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "user_preferences_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      user_service_connections: {
        Row: { access_token: string | null; account_info: Json | null; connected: boolean | null; created_at: string | null; id: string; refresh_token: string | null; scopes: string[] | null; service_id: string; token_expires_at: string | null; updated_at: string | null; user_id: string }
        Insert: { access_token?: string | null; account_info?: Json | null; connected?: boolean | null; created_at?: string | null; id?: string; refresh_token?: string | null; scopes?: string[] | null; service_id: string; token_expires_at?: string | null; updated_at?: string | null; user_id: string }
        Update: { access_token?: string | null; account_info?: Json | null; connected?: boolean | null; created_at?: string | null; id?: string; refresh_token?: string | null; scopes?: string[] | null; service_id?: string; token_expires_at?: string | null; updated_at?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "user_service_connections_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      user_session_analytics: {
        Row: { canvas_interactions: number | null; created_at: string | null; files_uploaded: number | null; id: string; messages_received: number | null; messages_sent: number | null; models_used: string[] | null; personality_used: Json | null; rag_queries: number | null; session_duration_minutes: number | null; session_end: string | null; session_start: string; tools_invoked: string[] | null; updated_at: string | null; user_id: string }
        Insert: { canvas_interactions?: number | null; created_at?: string | null; files_uploaded?: number | null; id?: string; messages_received?: number | null; messages_sent?: number | null; models_used?: string[] | null; personality_used?: Json | null; rag_queries?: number | null; session_duration_minutes?: number | null; session_end?: string | null; session_start?: string; tools_invoked?: string[] | null; updated_at?: string | null; user_id: string }
        Update: { canvas_interactions?: number | null; created_at?: string | null; files_uploaded?: number | null; id?: string; messages_received?: number | null; messages_sent?: number | null; models_used?: string[] | null; personality_used?: Json | null; rag_queries?: number | null; session_duration_minutes?: number | null; session_end?: string | null; session_start?: string; tools_invoked?: string[] | null; updated_at?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "user_session_analytics_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
      users: {
        Row: { anonymous: boolean | null; avg_daily_messages: number | null; created_at: string | null; daily_message_count: number | null; daily_pro_message_count: number | null; daily_pro_reset: string | null; daily_reset: string | null; display_name: string | null; email: string; favorite_features: string[] | null; favorite_models: string[] | null; id: string; last_active_at: string | null; longest_streak: number | null; message_count: number | null; premium: boolean | null; profile_image: string | null; streak_days: number | null; system_prompt: string | null; total_session_time_minutes: number | null }
        Insert: { anonymous?: boolean | null; avg_daily_messages?: number | null; created_at?: string | null; daily_message_count?: number | null; daily_pro_message_count?: number | null; daily_pro_reset?: string | null; daily_reset?: string | null; display_name?: string | null; email: string; favorite_features?: string[] | null; favorite_models?: string[] | null; id: string; last_active_at?: string | null; longest_streak?: number | null; message_count?: number | null; premium?: boolean | null; profile_image?: string | null; streak_days?: number | null; system_prompt?: string | null; total_session_time_minutes?: number | null }
        Update: { anonymous?: boolean | null; avg_daily_messages?: number | null; created_at?: string | null; daily_message_count?: number | null; daily_pro_message_count?: number | null; daily_pro_reset?: string | null; daily_reset?: string | null; display_name?: string | null; email?: string; favorite_features?: string[] | null; favorite_models?: string[] | null; id?: string; last_active_at?: string | null; longest_streak?: number | null; message_count?: number | null; premium?: boolean | null; profile_image?: string | null; streak_days?: number | null; system_prompt?: string | null; total_session_time_minutes?: number | null }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R } ? R : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R } ? R : never : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends | keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I } ? I : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I } ? I : never : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends | keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U } ? U : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U } ? U : never : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends | keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends | keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never

export const Constants = { public: { Enums: {} } } as const
