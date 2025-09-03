/**
 * Shopify User Credentials Management
 * Provides secure storage and management of user-specific Shopify store credentials
 */

import { createClient } from '@/lib/supabase/server';
import { encryptKey, decryptKey } from '@/lib/encryption';
import { z } from 'zod';

/**
 * Shopify credential validation schema
 */
const ShopifyCredentialSchema = z.object({
  store_domain: z.string().min(1, 'Store domain is required'),
  store_name: z.string().min(1, 'Store name is required'),
  access_token: z.string().min(1, 'Access token is required'),
  is_active: z.boolean().default(true),
});

export type ShopifyCredential = z.infer<typeof ShopifyCredentialSchema>;

export interface ShopifyCredentialRecord {
  id: string;
  user_id: string;
  store_domain: string;
  store_name: string;
  store_identifier: string;
  access_token: string; // encrypted in database
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Add new Shopify credentials for a user
 */
export async function addShopifyCredentials(
  userId: string,
  credentials: ShopifyCredential
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Validate input
    const validatedCredentials = ShopifyCredentialSchema.parse(credentials);
    
    // Initialize Supabase client
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    // Encrypt the access token
    const { encrypted, iv } = encryptKey(validatedCredentials.access_token);
    const encryptedToken = `${encrypted}:${iv}`;
    
    // Create store identifier from domain
    const storeIdentifier = validatedCredentials.store_domain
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com$/, '')
      .toLowerCase();
    
    // Insert the credential record
    const { data, error } = await supabase
      .from('shopify_user_credentials')
      .insert({
        user_id: userId,
        store_domain: validatedCredentials.store_domain,
        store_name: validatedCredentials.store_name,
        store_identifier: storeIdentifier,
        access_token: encryptedToken,
        is_active: validatedCredentials.is_active,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding Shopify credentials:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in addShopifyCredentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all Shopify credentials for a user
 */
export async function getUserShopifyCredentials(
  userId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { data, error } = await supabase
      .from('shopify_user_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching Shopify credentials:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getUserShopifyCredentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get decrypted access token for a specific store
 */
export async function getDecryptedAccessToken(
  userId: string,
  storeId: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { data, error } = await supabase
      .from('shopify_user_credentials')
      .select('access_token')
      .eq('user_id', userId)
      .eq('id', storeId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Error fetching access token:', error);
      return { success: false, error: error.message };
    }
    
    if (!data?.access_token) {
      return { success: false, error: 'Access token not found' };
    }
    
    // Decrypt the access token
    const [encryptedData, iv] = data.access_token.split(':');
    if (!encryptedData || !iv) {
      return { success: false, error: 'Invalid encrypted token format' };
    }
    
    const decryptedToken = decryptKey(encryptedData, iv);
    
    return { success: true, accessToken: decryptedToken };
  } catch (error) {
    console.error('Error in getDecryptedAccessToken:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update Shopify credentials
 */
export async function updateShopifyCredentials(
  userId: string,
  storeId: string,
  updates: Partial<ShopifyCredential>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    // Handle selective updates
    if (updates.store_name !== undefined) {
      updateData.store_name = updates.store_name;
    }
    
    if (updates.store_domain !== undefined) {
      updateData.store_domain = updates.store_domain;
      updateData.store_identifier = updates.store_domain
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com$/, '')
        .toLowerCase();
    }
    
    if (updates.access_token !== undefined) {
      const { encrypted, iv } = encryptKey(updates.access_token);
      updateData.access_token = `${encrypted}:${iv}`;
    }
    
    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }
    
    const { data, error } = await supabase
      .from('shopify_user_credentials')
      .update(updateData)
      .eq('user_id', userId)
      .eq('id', storeId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating Shopify credentials:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateShopifyCredentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete Shopify credentials
 */
export async function deleteShopifyCredentials(
  userId: string,
  storeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { error } = await supabase
      .from('shopify_user_credentials')
      .delete()
      .eq('user_id', userId)
      .eq('id', storeId);
    
    if (error) {
      console.error('Error deleting Shopify credentials:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteShopifyCredentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get active Shopify credentials for a user (for use in tools)
 */
export async function getActiveShopifyCredentials(
  userId: string
): Promise<{ success: boolean; credentials?: Array<{
  id: string;
  store_domain: string;
  store_name: string;
  store_identifier: string;
}>; error?: string }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    const { data, error } = await supabase
      .from('shopify_user_credentials')
      .select('id, store_domain, store_name, store_identifier')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching active Shopify credentials:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, credentials: data || [] };
  } catch (error) {
    console.error('Error in getActiveShopifyCredentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
