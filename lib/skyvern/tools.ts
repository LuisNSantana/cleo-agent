/**
 * Skyvern Tools - Web Automation Tools for Wex Agent
 * Provides tools for automated web navigation, data extraction, and task execution
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/server/request-context';
import { 
  getSkyvernCredentials, 
  getDecryptedSkyvernApiKey,
  addSkyvernCredentials,
  testSkyvernConnection,
  SkyvernCredential
} from './credentials';
import { createSkyvernTaskRecord, updateSkyvernTaskRecord, createSkyvernTaskNotification } from './tasks-db';
import { startTaskPolling } from './task-polling';

/**
 * Skyvern Task Types
 */
export const SkyvernTaskTypes = {
  GENERAL: 'general',
  VALIDATION: 'validation', 
  ACTION: 'action',
} as const;

export type SkyvernTaskType = typeof SkyvernTaskTypes[keyof typeof SkyvernTaskTypes];

/**
 * Skyvern API Client
 */
export class SkyvernClient {
  private apiKey: string;
  private baseUrl: string;
  private organizationId?: string | null;

  constructor(apiKey: string, baseUrl: string, organizationId?: string | null) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.organizationId = organizationId;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };

    if (this.organizationId) {
      headers['x-org-id'] = this.organizationId;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Skyvern API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Skyvern API request failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createTask(taskData: {
    url: string;
    task_type: SkyvernTaskType;
    instructions: string;
    max_steps?: number;
    webhook_callback_url?: string;
    proxy_location?: string;
  }) {
    return this.makeRequest('/api/v1/tasks', 'POST', taskData);
  }

  async getTask(taskId: string) {
    return this.makeRequest(`/api/v1/tasks/${taskId}`);
  }

  async listTasks() {
    return this.makeRequest('/api/v1/tasks');
  }

  async getTaskSteps(taskId: string) {
    return this.makeRequest(`/api/v1/tasks/${taskId}/steps`);
  }

  async getTaskArtifacts(taskId: string) {
    return this.makeRequest(`/api/v1/tasks/${taskId}/artifacts`);
  }

  async takeScreenshot(url: string) {
    // Note: Skyvern may not have a direct screenshot endpoint
    // Screenshots are typically generated as part of task execution
    return {
      success: false,
      error: 'Direct screenshot endpoint not available. Screenshots are generated during task execution.'
    };
  }

  async getOrganizations() {
    return this.makeRequest('/api/v1/organizations');
  }
}

/**
 * Tool: Add Skyvern Credentials
 */
export const addSkyvernCredentialsTool = tool({
  description: 'Add Skyvern API credentials for web automation tasks',
  inputSchema: z.object({
    credential_name: z.string().min(1).default('default').describe('Name for this credential set'),
    api_key: z.string().min(1).describe('Skyvern API key'),
    base_url: z.string().url().default('https://api.skyvern.com').describe('Skyvern API base URL'),
    organization_id: z.string().optional().describe('Organization ID (optional)'),
  }),
  execute: async (params) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }

      const result = await addSkyvernCredentials(userId, {
        credential_name: params.credential_name || 'default',
        api_key: params.api_key,
        base_url: params.base_url || 'https://api.skyvern.com',
        organization_id: params.organization_id,
        is_active: true,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to add Skyvern credentials',
        };
      }

      return {
        success: true,
        message: 'Skyvern credentials added successfully',
        credential_id: result.data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: Test Skyvern Connection
 */
export const testSkyvernConnectionTool = tool({
  description: 'Test Skyvern API connection and validate credentials',
  inputSchema: z.object({
    credential_id: z.string().optional().describe('Credential ID to test (uses default if not provided)'),
  }),
  execute: async (params) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }
      
      // Get credentials
      const credentialsResult = await getSkyvernCredentials(userId);
      if (!credentialsResult.success || !credentialsResult.credentials?.length) {
        return {
          success: false,
          error: 'No Skyvern credentials found. Please add credentials first.',
        };
      }

      // Find credential to test
      let credentialToTest = credentialsResult.credentials[0]; // default to first
      if (params.credential_id) {
        const found = credentialsResult.credentials.find(c => c.id === params.credential_id);
        if (!found) {
          return {
            success: false,
            error: 'Credential not found',
          };
        }
        credentialToTest = found;
      }

      // Test connection
      const testResult = await testSkyvernConnection(userId, credentialToTest.id);
      
      return {
        success: true,
        valid: testResult.valid,
        message: testResult.valid ? 'Connection successful' : 'Connection failed',
        error: testResult.error,
        organization_info: testResult.organizationInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: Create Skyvern Task
 */
export const createSkyvernTaskTool = tool({
  description: 'Create a web automation task using Skyvern with optimized prompts for form filling and complex workflows',
  inputSchema: z.object({
    url: z.string().url().describe('Target URL to automate'),
    task_type: z.enum(['general', 'validation', 'action'] as const)
      .default('action').describe('Type of task: "action" for deterministic form filling, "general" for broader automation, "validation" for form validation'),
    instructions: z.string().min(1).describe(`Detailed instructions for the automation task. 

FORM FILLING BEST PRACTICES:
Structure your prompt with:
1. Clear main goal
2. Specific completion criteria  
3. Information payload
4. Visual indicators

EXAMPLE - Contact Form:
"Your goal is to fill out the contact form completely with the provided business information. Only fill out required fields that you have information for.

Here is the information you need:
Company: Acme Corp
Email: contact@acme.com
Phone: (555) 123-4567

IMPORTANT DETAILS:
- For dropdown menus, select 'General Inquiry'
- Use phone format: (XXX) XXX-XXXX
- Take screenshots after filling but before submitting

Your goal is complete when you have filled out all required fields and successfully submitted the form. You will know your goal is complete when you see a confirmation message or are redirected to a confirmation page."

EXAMPLE - Multi-step Application:
"Your goal is to complete the application form to request a quote. This may be a multi-step process.

Here is the information: [your data]

IMPORTANT DETAILS:
- Complete each step fully before proceeding
- For address information, click 'Add Address' button for popup modal
- Select standard/basic options for coverage unless specified
- If you encounter CAPTCHA, solve it before proceeding

Your goal is complete when you have completed all steps and received a quote summary or confirmation number."

Use clear termination criteria like: "You will know your goal is complete when you see [specific confirmation message]"`),
    max_steps: z.number().int().positive().optional().default(25).describe('Maximum number of steps to execute (default: 25, increase for complex multi-step forms)'),
    webhook_callback_url: z.string().url().optional().describe('Webhook URL for task completion notifications'),
    proxy_location: z.string().optional().describe('Proxy location for the task'),
    credential_id: z.string().optional().describe('Credential ID to use (uses default if not provided)'),
  }),
  execute: async (params) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }
      
      // Get credentials
      const credentialsResult = await getSkyvernCredentials(userId);
      if (!credentialsResult.success || !credentialsResult.credentials?.length) {
        return {
          success: false,
          error: 'No Skyvern credentials found. Please add credentials first.',
        };
      }

      // Find credential to use
      let credentialToUse = credentialsResult.credentials[0]; // default to first
      if (params.credential_id) {
        const found = credentialsResult.credentials.find(c => c.id === params.credential_id);
        if (!found) {
          return {
            success: false,
            error: 'Credential not found',
          };
        }
        credentialToUse = found;
      }

      // Get decrypted API key
      const keyResult = await getDecryptedSkyvernApiKey(userId, credentialToUse.id);
      if (!keyResult.success || !keyResult.apiKey) {
        return {
          success: false,
          error: keyResult.error || 'Failed to get API key',
        };
      }

      // Create Skyvern client
      const client = new SkyvernClient(keyResult.apiKey, keyResult.baseUrl!, keyResult.organizationId);
      
      // Create task
      const taskResult = await client.createTask({
        url: params.url,
        task_type: params.task_type || 'general',
        instructions: params.instructions,
        max_steps: params.max_steps || 25,
        webhook_callback_url: params.webhook_callback_url,
        proxy_location: params.proxy_location,
      });

      if (!taskResult.success) {
        return {
          success: false,
          error: taskResult.error || 'Failed to create Skyvern task',
        };
      }

      // Register task in our database for tracking
      const taskId = taskResult.data?.task_id;
      if (taskId) {
        await createSkyvernTaskRecord({
          task_id: taskId,
          title: `${params.task_type} automation on ${new URL(params.url).hostname}`,
          url: params.url,
          instructions: params.instructions,
          task_type: params.task_type || 'general',
          max_steps: params.max_steps || 25,
          live_url: `https://app.skyvern.com/tasks/${taskId}/actions`,
          recording_url: `https://app.skyvern.com/tasks/${taskId}/recording`,
          dashboard_url: `https://app.skyvern.com/tasks/${taskId}`,
        });

        // Send task started notification
        await createSkyvernTaskNotification({
          task_id: taskId,
          notification_type: 'task_started',
          message: `Skyvern task "${params.task_type} automation" has been started on ${new URL(params.url).hostname}. Monitor progress at: https://app.skyvern.com/tasks/${taskId}/actions`
        });

        // Start simple polling for status tracking
        try {
          await startTaskPolling(taskId, userId);
        } catch (pollingError) {
          console.warn('Failed to start task polling:', pollingError);
          // Continue execution - this is not critical for task creation
        }
      }

      return {
        success: true,
        message: 'Skyvern task created successfully',
        task_id: taskResult.data?.task_id,
        task_data: taskResult.data,
        execution_details: {
          url: params.url,
          task_type: params.task_type || 'general',
          instructions: params.instructions,
          max_steps: params.max_steps || 25,
          created_at: new Date().toISOString()
        },
        // Add direct monitoring links
        monitoring: {
          live_url: `https://app.skyvern.com/tasks/${taskResult.data?.task_id}/actions`,
          recording_url: `https://app.skyvern.com/tasks/${taskResult.data?.task_id}/recording`,
          dashboard_url: `https://app.skyvern.com/tasks/${taskResult.data?.task_id}`,
          status_check: `Use get_skyvern_task tool with task_id: ${taskResult.data?.task_id}`
        },
        // Include visual progress if available
        attachments: taskResult.data?.screenshots ? 
          taskResult.data.screenshots.map((screenshot: any, index: number) => ({
            name: `task-step-${index + 1}.png`,
            contentType: 'image/png',
            url: screenshot.url
          })) : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: Get Skyvern Task Status
 */
export const getSkyvernTaskTool = tool({
  description: 'Get the status and details of a Skyvern task',
  inputSchema: z.object({
    task_id: z.string().min(1).describe('Skyvern task ID to check'),
    credential_id: z.string().optional().describe('Credential ID to use (uses default if not provided)'),
  }),
  execute: async (params) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }
      
      // Get credentials
      const credentialsResult = await getSkyvernCredentials(userId);
      if (!credentialsResult.success || !credentialsResult.credentials?.length) {
        return {
          success: false,
          error: 'No Skyvern credentials found. Please add credentials first.',
        };
      }

      // Find credential to use
      let credentialToUse = credentialsResult.credentials[0]; // default to first
      if (params.credential_id) {
        const found = credentialsResult.credentials.find(c => c.id === params.credential_id);
        if (!found) {
          return {
            success: false,
            error: 'Credential not found',
          };
        }
        credentialToUse = found;
      }

      // Get decrypted API key
      const keyResult = await getDecryptedSkyvernApiKey(userId, credentialToUse.id);
      if (!keyResult.success || !keyResult.apiKey) {
        return {
          success: false,
          error: keyResult.error || 'Failed to get API key',
        };
      }

      // Create Skyvern client
      const client = new SkyvernClient(keyResult.apiKey, keyResult.baseUrl!, keyResult.organizationId);
      
      // Get task
      const taskResult = await client.getTask(params.task_id);

      if (!taskResult.success) {
        return {
          success: false,
          error: taskResult.error || 'Failed to get Skyvern task',
        };
      }

      // Update our database with latest task status
      const taskStatus = taskResult.data?.request?.status;
      const stepsCount = taskResult.data?.steps?.length || 0;
      
      if (taskStatus) {
        await updateSkyvernTaskRecord(params.task_id, {
          status: taskStatus,
          steps_count: stepsCount,
          result_data: taskResult.data
        });

        // Send notification for completed or failed tasks
        if (['completed', 'failed', 'terminated'].includes(taskStatus)) {
          const notificationType = taskStatus === 'completed' ? 'task_completed' : 'task_failed';
          const message = taskStatus === 'completed' 
            ? `✅ Skyvern task completed successfully! View results: https://app.skyvern.com/tasks/${params.task_id}/recording`
            : `❌ Skyvern task ${taskStatus}. Check details: https://app.skyvern.com/tasks/${params.task_id}/recording`;
          
          await createSkyvernTaskNotification({
            task_id: params.task_id,
            notification_type: notificationType,
            message: message
          });
        }
      }

      return {
        success: true,
        task_data: taskResult.data,
        // Add enhanced monitoring info
        monitoring: {
          live_url: `https://app.skyvern.com/tasks/${params.task_id}/actions`,
          recording_url: `https://app.skyvern.com/tasks/${params.task_id}/recording`,
          dashboard_url: `https://app.skyvern.com/tasks/${params.task_id}`,
          status: taskResult.data?.request?.status || 'unknown'
        },
        // Enhanced status information
        status_info: {
          current_status: taskResult.data?.request?.status || 'unknown',
          created_at: taskResult.data?.request?.created_at,
          updated_at: taskResult.data?.request?.updated_at,
          progress: taskResult.data?.steps?.length || 0,
          is_completed: ['completed', 'failed', 'terminated'].includes(taskResult.data?.request?.status || ''),
          can_watch_live: taskResult.data?.request?.status === 'running'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: Take Screenshot
 */
export const takeSkyvernScreenshotTool = tool({
  description: 'Take a screenshot of a web page using Skyvern (via task automation)',
  inputSchema: z.object({
    url: z.string().url().describe('URL of the page to screenshot'),
    credential_id: z.string().optional().describe('Credential ID to use (uses default if not provided)'),
    additional_instructions: z.string().optional().describe('Additional instructions for screenshot capture (e.g., "scroll down to capture full page", "click accept cookies first")'),
  }),
  execute: async (params) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }
      
      // Get credentials
      const credentialsResult = await getSkyvernCredentials(userId);
      if (!credentialsResult.success || !credentialsResult.credentials?.length) {
        return {
          success: false,
          error: 'No Skyvern credentials found. Please add credentials first.',
        };
      }

      // Find credential to use
      let credentialToUse = credentialsResult.credentials[0]; // default to first
      if (params.credential_id) {
        const found = credentialsResult.credentials.find(c => c.id === params.credential_id);
        if (!found) {
          return {
            success: false,
            error: 'Credential not found',
          };
        }
        credentialToUse = found;
      }

      // Get decrypted API key
      const keyResult = await getDecryptedSkyvernApiKey(userId, credentialToUse.id);
      if (!keyResult.success || !keyResult.apiKey) {
        return {
          success: false,
          error: keyResult.error || 'Failed to get API key',
        };
      }

      // Create Skyvern client
      const client = new SkyvernClient(keyResult.apiKey, keyResult.baseUrl!, keyResult.organizationId);
      
      // Create a screenshot task instead of direct screenshot
      const screenshotInstructions = `Navigate to ${params.url} and take comprehensive screenshots. ${params.additional_instructions ? params.additional_instructions + ' ' : ''}Capture the current state of the page for visual analysis. Do not interact with forms or buttons unless specified in additional instructions.`;
      
      const taskResult = await client.createTask({
        url: params.url,
        task_type: 'validation', // Use validation for screenshot-only tasks
        instructions: screenshotInstructions,
        max_steps: 5, // Limited steps for screenshot tasks
      });

      if (!taskResult.success) {
        return {
          success: false,
          error: taskResult.error || 'Failed to create screenshot task',
        };
      }

      // Register task in our database for tracking
      const taskId = taskResult.data?.task_id;
      if (taskId) {
        await createSkyvernTaskRecord({
          task_id: taskId,
          title: `Screenshot capture of ${new URL(params.url).hostname}`,
          url: params.url,
          instructions: screenshotInstructions,
          task_type: 'validation',
          max_steps: 5,
          live_url: `https://app.skyvern.com/tasks/${taskId}/actions`,
          recording_url: `https://app.skyvern.com/tasks/${taskId}/recording`,
          dashboard_url: `https://app.skyvern.com/tasks/${taskId}`,
        });

        // Send task started notification
        await createSkyvernTaskNotification({
          task_id: taskId,
          notification_type: 'task_started',
          message: `Screenshot capture task started for ${new URL(params.url).hostname}. Monitor progress at: https://app.skyvern.com/tasks/${taskId}/actions`
        });

        // Start simple polling for status tracking
        try {
          await startTaskPolling(taskId, userId);
        } catch (pollingError) {
          console.warn('Failed to start screenshot task polling:', pollingError);
        }
      }

      return {
        success: true,
        message: 'Screenshot task created successfully. Screenshots will be captured automatically during task execution.',
        task_id: taskResult.data?.task_id,
        monitoring: {
          live_url: `https://app.skyvern.com/tasks/${taskResult.data?.task_id}/actions`,
          recording_url: `https://app.skyvern.com/tasks/${taskResult.data?.task_id}/recording`,
          dashboard_url: `https://app.skyvern.com/tasks/${taskResult.data?.task_id}`,
        },
        note: 'Screenshots will be available in task artifacts once the task completes. Use get_skyvern_task to check status and retrieve screenshots.',
        instructions_used: screenshotInstructions
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: List Skyvern Tasks
 */
export const listSkyvernTasksTool = tool({
  description: 'List all Skyvern automation tasks with enhanced monitoring and organization features',
  inputSchema: z.object({
    credential_id: z.string().optional().describe('Credential ID to use (uses default if not provided)'),
    status_filter: z.enum(['active', 'completed', 'all']).optional().default('all').describe('Filter tasks by status: active (running/queued), completed (done/failed), or all tasks'),
  }),
  execute: async (params) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }
      
      // Get credentials
      const credentialsResult = await getSkyvernCredentials(userId);
      if (!credentialsResult.success || !credentialsResult.credentials?.length) {
        return {
          success: false,
          error: 'No Skyvern credentials found. Please add credentials first.',
        };
      }

      // Find credential to use
      let credentialToUse = credentialsResult.credentials[0]; // default to first
      if (params.credential_id) {
        const found = credentialsResult.credentials.find(c => c.id === params.credential_id);
        if (!found) {
          return {
            success: false,
            error: 'Credential not found',
          };
        }
        credentialToUse = found;
      }

      // Get decrypted API key
      const keyResult = await getDecryptedSkyvernApiKey(userId, credentialToUse.id);
      if (!keyResult.success || !keyResult.apiKey) {
        return {
          success: false,
          error: keyResult.error || 'Failed to get API key',
        };
      }

      // Create Skyvern client
      const client = new SkyvernClient(keyResult.apiKey, keyResult.baseUrl!, keyResult.organizationId);
      
      // List tasks
      const tasksResult = await client.listTasks();

      if (!tasksResult.success) {
        return {
          success: false,
          error: tasksResult.error || 'Failed to list Skyvern tasks',
        };
      }

      // Enhance task data with monitoring links and better organization
      const enhancedTasks = (tasksResult.data?.tasks || []).map((task: any) => ({
        ...task,
        monitoring: {
          live_url: `https://app.skyvern.com/tasks/${task.task_id}/actions`,
          recording_url: `https://app.skyvern.com/tasks/${task.task_id}/recording`,
          dashboard_url: `https://app.skyvern.com/tasks/${task.task_id}`,
        },
        status_info: {
          is_active: ['created', 'queued', 'running'].includes(task.request?.status),
          is_completed: ['completed', 'failed', 'terminated'].includes(task.request?.status),
          can_watch_live: task.request?.status === 'running',
          created_date: task.request?.created_at ? new Date(task.request.created_at).toLocaleDateString() : null,
        }
      }));

      // Organize tasks by status for better overview
      const tasksByStatus = {
        active: enhancedTasks.filter((task: any) => task.status_info.is_active),
        completed: enhancedTasks.filter((task: any) => task.status_info.is_completed),
        total_count: enhancedTasks.length
      };

      // Apply status filter if specified
      let filteredTasks = enhancedTasks;
      if (params.status_filter === 'active') {
        filteredTasks = tasksByStatus.active;
      } else if (params.status_filter === 'completed') {
        filteredTasks = tasksByStatus.completed;
      }

      return {
        success: true,
        tasks: filteredTasks,
        filter_applied: params.status_filter || 'all',
        organized_view: tasksByStatus,
        summary: {
          total_tasks: enhancedTasks.length,
          active_tasks: tasksByStatus.active.length,
          completed_tasks: tasksByStatus.completed.length,
          showing_count: filteredTasks.length,
          task_management_url: 'Visit /agents/tasks in the platform for complete task management interface'
        },
        quick_access: {
          note: 'Use task_id with get_skyvern_task tool to check specific task status',
          live_monitoring: 'Click live_url in any task to watch automation in real-time',
          recordings: 'Use recording_url to replay completed automations'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Export all Skyvern tools
 */
export const skyvernTools = [
  addSkyvernCredentialsTool,
  testSkyvernConnectionTool,
  createSkyvernTaskTool,
  getSkyvernTaskTool,
  takeSkyvernScreenshotTool,
  listSkyvernTasksTool,
];
