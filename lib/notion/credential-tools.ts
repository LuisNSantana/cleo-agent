/**
 * Notion Credential Management Tools
 * Tools for adding, testing, and managing Notion API credentials
 * Following the same pattern as Skyvern credential tools
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/server/request-context';
import { 
  addNotionKey, 
  listNotionKeys, 
  testNotionKey,
  getActiveNotionKey,
  NotionCredentialInput
} from './credentials';

// Helper: validate UUID v4 (basic)
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
function ensureValidUserContext(): string | null {
  const uid = getCurrentUserId()
  if (!uid || !UUID_REGEX.test(uid)) return null
  return uid
}

/**
 * Tool: Add Notion Credentials
 */
export const addNotionCredentialsTool = tool({
  description: 'Add Notion API credentials for workspace management tasks',
  inputSchema: z.object({
    label: z.string().min(1).default('primary').describe('Label for this credential set'),
    api_key: z.string().min(20).describe('Notion API integration token (starts with ntn_ or secret_)'),
  }),
  execute: async (params) => {
    try {
  const userId = ensureValidUserContext();
  if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }

      // Test the API key first
      const testResult = await testNotionKey(params.api_key);
      if (!testResult.success) {
        return {
          success: false,
          error: `API key validation failed: ${testResult.error}`,
        };
      }

      const result = await addNotionKey(userId, {
        label: params.label || 'primary',
        api_key: params.api_key,
        is_active: true,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to add Notion credentials',
        };
      }

      return {
        success: true,
        message: 'Notion credentials added successfully',
        credential_id: result.data?.id,
        user_info: testResult.data,
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
 * Tool: Test Notion Connection
 */
export const testNotionConnectionTool = tool({
  description: 'Test Notion API connection and validate credentials',
  inputSchema: z.object({
    credential_id: z.string().optional().describe('Credential ID to test (uses active credential if not provided)'),
  }),
  execute: async (params) => {
    try {
  const userId = ensureValidUserContext();
  if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }
      
      // Get credentials
      const credentialsResult = await listNotionKeys(userId);
      if (!credentialsResult.success || !credentialsResult.data?.length) {
        return {
          success: false,
          error: 'No Notion credentials found. Please add credentials first.',
        };
      }

      // Find credential to test
      let credentialToTest = credentialsResult.data.find(c => c.is_active); // default to active
      if (params.credential_id) {
        const found = credentialsResult.data.find(c => c.id === params.credential_id);
        if (!found) {
          return {
            success: false,
            error: 'Credential not found',
          };
        }
        credentialToTest = found;
      }

      if (!credentialToTest) {
        return {
          success: false,
          error: 'No active credential found',
        };
      }

      // Get the actual API key for testing
      const activeKey = await getActiveNotionKey(userId);
      if (!activeKey) {
        return {
          success: false,
          error: 'Could not retrieve API key for testing',
        };
      }

      // Test connection
      const testResult = await testNotionKey(activeKey);
      
      return {
        success: true,
        valid: testResult.success,
        message: testResult.success ? 'Connection successful' : 'Connection failed',
        error: testResult.error,
        user_info: testResult.data,
        credential_label: credentialToTest.label,
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
 * Tool: List Notion Credentials
 */
export const listNotionCredentialsTool = tool({
  description: 'List all Notion API credentials for the current user',
  inputSchema: z.object({
    active_only: z.boolean().optional().default(false).describe('Only return active credentials'),
  }),
  execute: async (params) => {
    try {
  const userId = ensureValidUserContext();
  if (!userId) {
        return {
          success: false,
          error: 'No user context available',
        };
      }
      
      // Get credentials
      const credentialsResult = await listNotionKeys(userId);
      if (!credentialsResult.success) {
        return {
          success: false,
          error: credentialsResult.error || 'Failed to retrieve credentials',
        };
      }

      let credentials = credentialsResult.data || [];
      
      // Filter to active only if requested
      if (params.active_only) {
        credentials = credentials.filter(c => c.is_active);
      }

      return {
        success: true,
        credentials: credentials.map(c => ({
          id: c.id,
          label: c.label,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: c.updated_at,
          // Don't expose actual API key
        })),
        total_count: credentials.length,
        active_count: credentials.filter(c => c.is_active).length,
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
 * Export all Notion credential tools
 */
export const notionCredentialTools = [
  addNotionCredentialsTool,
  testNotionConnectionTool,
  listNotionCredentialsTool,
];
