/**
 * API endpoints for managing Shopify user credentials
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  addShopifyCredentials, 
  getUserShopifyCredentials, 
  updateShopifyCredentials, 
  deleteShopifyCredentials,
  getActiveShopifyCredentials
} from '@/lib/shopify/credentials';
import { z } from 'zod';

/**
 * Validation schemas
 */
const CreateCredentialSchema = z.object({
  store_domain: z.string().min(1, 'Store domain is required'),
  store_name: z.string().min(1, 'Store name is required'),
  access_token: z.string().min(1, 'Access token is required'),
  is_active: z.boolean().default(true),
});

const UpdateCredentialSchema = z.object({
  store_name: z.string().optional(),
  store_domain: z.string().optional(),
  access_token: z.string().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Get current user ID from session
 */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * GET /api/shopify/credentials
 * Get all Shopify credentials for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getUserShopifyCredentials(userId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ credentials: result.data });
  } catch (error) {
    console.error('Error fetching Shopify credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/shopify/credentials
 * Add new Shopify credentials for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateCredentialSchema.parse(body);
    
    const result = await addShopifyCredentials(userId, validatedData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ credential: result.data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Error adding Shopify credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/shopify/credentials/[id]
 * Update Shopify credentials
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdateCredentialSchema.parse(body);
    
    const result = await updateShopifyCredentials(userId, params.id, validatedData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ credential: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Error updating Shopify credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/shopify/credentials/[id]
 * Delete Shopify credentials
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await deleteShopifyCredentials(userId, params.id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Credentials deleted successfully' });
  } catch (error) {
    console.error('Error deleting Shopify credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
