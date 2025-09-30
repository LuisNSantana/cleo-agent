import type { JsonObject, JsonValue } from "@/types/json"

export type AgentTaskStatus =
  | "pending"
  | "scheduled"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

export interface AgentTask {
  id: string
  task_id: string
  user_id: string
  agent_id: string
  agent_name: string
  agent_avatar: string | null
  task_type: string
  title: string
  description: string
  priority: number | null
  task_config: JsonObject | null
  context_data: JsonObject | null
  schedule_config: JsonObject | null
  scheduled_at: string | null
  scheduled_for: string | null
  cron_expression: string | null
  timezone: string | null
  status: AgentTaskStatus
  started_at: string | null
  completed_at: string | null
  result_data: JsonValue | null
  error_message: string | null
  execution_time_ms: number | null
  retry_count: number
  max_retries: number | null
  last_retry_at: string | null
  notify_on_completion: boolean | null
  notify_on_failure: boolean | null
  notification_sent: boolean | null
  notification_sent_at: string | null
  created_at: string
  updated_at: string
  last_run_at: string | null
  next_run_at: string | null
  tags: string[] | null
}

export interface AgentTaskInsert {
  id?: string
  task_id?: string | null
  user_id: string
  agent_id: string
  agent_name: string
  agent_avatar?: string | null
  task_type?: string
  title: string
  description: string
  priority?: number | null
  task_config?: JsonObject | null
  context_data?: JsonObject | null
  schedule_config?: JsonObject | null
  scheduled_at?: string | null
  scheduled_for?: string | null
  cron_expression?: string | null
  timezone?: string | null
  status?: AgentTaskStatus
  started_at?: string | null
  completed_at?: string | null
  result_data?: JsonValue | null
  error_message?: string | null
  execution_time_ms?: number | null
  retry_count?: number | null
  max_retries?: number | null
  last_retry_at?: string | null
  notify_on_completion?: boolean | null
  notify_on_failure?: boolean | null
  notification_sent?: boolean | null
  notification_sent_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_run_at?: string | null
  next_run_at?: string | null
  tags?: string[] | null
}

export type AgentTaskUpdate = Partial<Omit<AgentTaskInsert, "user_id" | "agent_id" | "agent_name" | "title" | "description">>

export interface AgentTaskExecution {
  id: string
  task_id: string
  started_at: string
  completed_at: string | null
  status: "running" | "completed" | "failed"
  agent_messages: JsonObject[] | null
  tool_calls: JsonObject[] | null
  result_data: JsonValue | null
  error_message: string | null
  error_stack: string | null
  execution_time_ms: number | null
  memory_usage_mb: number | null
  created_at: string
  updated_at: string | null
}

export interface AgentTaskExecutionInsert {
  id?: string
  task_id: string
  started_at?: string | null
  completed_at?: string | null
  status?: "running" | "completed" | "failed"
  agent_messages?: JsonObject[] | null
  tool_calls?: JsonObject[] | null
  result_data?: JsonValue | null
  error_message?: string | null
  error_stack?: string | null
  execution_time_ms?: number | null
  memory_usage_mb?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type AgentTaskExecutionUpdate = Partial<Omit<AgentTaskExecutionInsert, "task_id">>

export interface NotificationAction {
  id: string
  label: string
  action_type: "open_chat" | "view_result" | "retry_task" | "dismiss" | "schedule_followup"
  action_data?: JsonObject
  style?: "primary" | "secondary" | "success" | "warning" | "danger"
}

export interface TaskNotification {
  id: string
  user_id: string
  task_id: string
  agent_id: string
  agent_name: string
  agent_avatar: string | null
  notification_type: "task_completed" | "task_failed" | "task_scheduled" | "task_reminder"
  title: string
  message: string
  task_result: JsonValue | null
  error_details: string | null
  priority: "low" | "medium" | "high" | "urgent"
  read: boolean
  read_at: string | null
  action_buttons: NotificationAction[] | null
  metadata: JsonObject | null
  expires_at: string | null
  created_at: string
  updated_at: string
}
