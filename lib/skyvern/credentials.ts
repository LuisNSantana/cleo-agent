/**
 * Skyvern User Credentials Management
 * Provides secure storage and management of user-specific Skyvern API credentials
 * Following the same pattern as Shopify credentials system
 */

import { createClient } from '@/lib/supabase/server';
import { encryptKey, decryptKey } from '@/lib/encryption';
import { z } from 'zod';

/**
 * Skyvern credential validation schema
 */
const SkyvernCredentialSchema = z.object({
  credential_name: z.string().min(1, 'Credential name is required').default('default'),
  api_key: z.string().min(1, 'API key is required'),
  base_url: z.string().url('Valid base URL is required').default('https://api.skyvern.com'),
  organization_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type SkyvernCredential = z.infer<typeof SkyvernCredentialSchema>;

export interface SkyvernCredentialRecord {
  id: string;
  user_id: string;
  credential_name: string;
  api_key: string; // encrypted in database
  base_url: string;
  organization_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Normalize Skyvern base URL to ensure it's a valid API endpoint
 */
export function normalizeSkyvernBaseUrl(input: string): string {
  try {
    let url = (input || '').trim();
    if (!url) return 'https://api.skyvern.com';
    
    // If no protocol, assume https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // Remove trailing slash
    url = url.replace(/\/$/, '');
    
    // Validate URL format
    new URL(url);
    
    return url;
  } catch {
    return 'https://api.skyvern.com';
  }
}

/**
 * Add new Skyvern credentials for a user
 */
export async function addSkyvernCredentials(
  userId: string,
  credentials: SkyvernCredential
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Validate input
    const validatedCredentials = SkyvernCredentialSchema.parse(credentials);
    
    // Initialize Supabase client
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    // Encrypt the API key
    const { encrypted, iv } = encryptKey(validatedCredentials.api_key);
    const encryptedApiKey = `${encrypted}:${iv}`;
    
    console.log('🔐 Skyvern Debug - encryption format:', {
      encrypted_length: encrypted.length,
      iv_length: iv.length,
      encrypted_contains_colon: encrypted.includes(':'),
      final_token_colon_count: (encryptedApiKey.match(/:/g) || []).length,
      final_token_preview: encryptedApiKey.substring(0, 50) + '...'
    });
    
    // Normalize base URL
    const normalizedBaseUrl = normalizeSkyvernBaseUrl(validatedCredentials.base_url);
    
    // Insert the credential record
    const { data, error } = await supabase
      .from('skyvern_user_credentials')
      .insert({
        user_id: userId,
        credential_name: validatedCredentials.credential_name,
        api_key: encryptedApiKey,
        base_url: normalizedBaseUrl,
        organization_id: validatedCredentials.organization_id,
        is_active: validatedCredentials.is_active,
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Error adding Skyvern credentials:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Skyvern credentials added successfully for user:', userId);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Error in addSkyvernCredentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get all Skyvern credentials for a user
 */
export async function getSkyvernCredentials(
  userId: string
): Promise<{ success: boolean; credentials?: SkyvernCredentialRecord[]; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { data, error } = await supabase
      .from('skyvern_user_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching Skyvern credentials:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, credentials: data || [] };
    
  } catch (error) {
    console.error('❌ Error in getSkyvernCredentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get active Skyvern credentials for a user
 */
export async function getActiveSkyvernCredentials(
  userId: string
): Promise<{ success: boolean; credentials?: SkyvernCredentialRecord[]; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { data, error } = await supabase
      .from('skyvern_user_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching active Skyvern credentials:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, credentials: data || [] };
    
  } catch (error) {
    console.error('❌ Error in getActiveSkyvernCredentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get decrypted API key from encrypted credential
 */
export async function getDecryptedSkyvernApiKey(
  userId: string,
  credentialId: string
): Promise<{ success: boolean; apiKey?: string; baseUrl?: string; organizationId?: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { data, error } = await supabase
      .from('skyvern_user_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('❌ Error fetching Skyvern credential:', error);
      return { success: false, error: 'Credential not found' };
    }
    
    if (!data) {
      return { success: false, error: 'Credential not found' };
    }
    
    // Decrypt the API key
    // Expected format: encryptedData:authTag:iv
    const tokenRaw = (data.api_key || '').trim();
    console.log('🔐 Skyvern Debug - api_key format:', {
      token_length: tokenRaw.length,
      colon_count: (tokenRaw.match(/:/g) || []).length,
      token_preview: tokenRaw.substring(0, 50) + '...'
    });
    
    const parts = tokenRaw.split(':');
    let iv = '';
    let payload = tokenRaw;
    
    if (parts.length === 3) {
      // encrypted:authTag:iv (preferred)
      iv = parts[2];
      payload = data.api_key;
    } else if (parts.length === 2) {
      // encrypted:authTag (legacy). In this case, we cannot decrypt without a stored IV.
      console.error('🚨 Skyvern Token missing IV. Expected 3 parts (encrypted:authTag:iv). Please re-save credentials. Got:', {
        parts_count: parts.length,
        full_token: tokenRaw
      });
      return { success: false, error: 'Invalid token format - missing IV. Please re-save your credentials.' };
    } else {
      console.error('🚨 Skyvern Invalid token format:', {
        parts_count: parts.length,
        expected: 'encrypted:authTag:iv',
        full_token: tokenRaw
      });
      return { success: false, error: 'Invalid encrypted API key format' };
    }

    // Validate IV looks like hex
    if (!/^[0-9a-fA-F]+$/.test(iv) || iv.length % 2 !== 0) {
      console.error('🚨 Invalid IV format - expected hex string:', { 
        iv_length: iv.length, 
        iv_preview: iv.substring(0, 8) + '...' 
      });
      return { success: false, error: 'Invalid IV format in token' };
    }

    console.log('🔐 Skyvern Debug - calling decryptKey with:', {
      payload_length: payload.length,
      iv_length: iv.length
    });

    // Pass the full encrypted payload (which includes authTag)
    const decryptedApiKey = decryptKey(payload, iv);
    
    return {
      success: true,
      apiKey: decryptedApiKey,
      baseUrl: data.base_url,
      organizationId: data.organization_id,
    };
    
  } catch (error) {
    console.error('❌ Error in getDecryptedSkyvernApiKey:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Decryption failed' 
    };
  }
}

/**
 * Update Skyvern credentials
 */
export async function updateSkyvernCredentials(
  userId: string,
  credentialId: string,
  updates: Partial<SkyvernCredential>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    // Prepare the update object
    const updateData: any = {};
    
    if (updates.credential_name !== undefined) {
      updateData.credential_name = updates.credential_name;
    }
    
    if (updates.api_key !== undefined) {
      // Encrypt the new API key
      const { encrypted, iv } = encryptKey(updates.api_key);
      updateData.api_key = `${encrypted}:${iv}`;
    }
    
    if (updates.base_url !== undefined) {
      updateData.base_url = normalizeSkyvernBaseUrl(updates.base_url);
    }
    
    if (updates.organization_id !== undefined) {
      updateData.organization_id = updates.organization_id;
    }
    
    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }
    
    const { data, error } = await supabase
      .from('skyvern_user_credentials')
      .update(updateData)
      .eq('id', credentialId)
      .eq('user_id', userId)
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Error updating Skyvern credentials:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Skyvern credentials updated successfully');
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Error in updateSkyvernCredentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete Skyvern credentials
 */
export async function deleteSkyvernCredentials(
  userId: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { error } = await supabase
      .from('skyvern_user_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Error deleting Skyvern credentials:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Skyvern credentials deleted successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error in deleteSkyvernCredentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test Skyvern API connection with credentials
 */
export async function testSkyvernConnection(
  userId: string,
  credentialId: string
): Promise<{ success: boolean; valid?: boolean; error?: string; organizationInfo?: any }> {
  try {
    const credentialResult = await getDecryptedSkyvernApiKey(userId, credentialId);
    
    if (!credentialResult.success || !credentialResult.apiKey) {
      return { 
        success: false, 
        error: credentialResult.error || 'Failed to get API key' 
      };
    }
    
    // Test the connection by making a simple API call
    const testUrl = `${credentialResult.baseUrl}/api/v1/organizations`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'x-api-key': credentialResult.apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return {
        success: true,
        valid: false,
        error: `API test failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const organizationInfo = await response.json();
    
    return {
      success: true,
      valid: true,
      organizationInfo,
    };
    
  } catch (error) {
    console.error('❌ Error testing Skyvern connection:', error);
    return {
      success: true,
      valid: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}
