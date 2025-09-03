/**
 * API endpoints for managing individual Shopify credentials
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  updateShopifyCredentials, 
  deleteShopifyCredentials
} from '@/lib/shopify/credentials';
import { z } from 'zod';

const UpdateCredentialSchema = z.object({
  store_name: z.string().optional(),
  store_domain: z.string().optional(),
  access_token: z.string().optional(),
  is_active: z.boolean().optional(),
});

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdateCredentialSchema.parse(body);
    const { id } = await context.params;
    const result = await updateShopifyCredentials(userId, id, validatedData);
    
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;
    const result = await deleteShopifyCredentials(userId, id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Credentials deleted successfully' });
  } catch (error) {
    console.error('Error deleting Shopify credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
