/**
 * API endpoints for managing Skyvern user credentials
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  addSkyvernCredentials, 
  getSkyvernCredentials, 
  updateSkyvernCredentials, 
  deleteSkyvernCredentials,
  getActiveSkyvernCredentials,
  testSkyvernConnection
} from '@/lib/skyvern/credentials';
import { z } from 'zod';

/**
 * Validation schemas
 */
const CreateCredentialSchema = z.object({
  credential_name: z.string().min(1, 'Credential name is required').default('default'),
  api_key: z.string().min(1, 'API key is required'),
  base_url: z.string().url('Valid base URL is required').default('https://api.skyvern.com'),
  organization_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

const UpdateCredentialSchema = z.object({
  credential_name: z.string().optional(),
  api_key: z.string().optional(),
  base_url: z.string().url().optional(),
  organization_id: z.string().optional(),
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
 * GET /api/skyvern/credentials
 * Get all Skyvern credentials for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const active_only = url.searchParams.get('active_only') === 'true';

    let result;
    if (active_only) {
      result = await getActiveSkyvernCredentials(userId);
    } else {
      result = await getSkyvernCredentials(userId);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      credentials: result.credentials 
    });

  } catch (error) {
    console.error('Error fetching Skyvern credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/skyvern/credentials
 * Create new Skyvern credentials for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateCredentialSchema.parse(body);

    const result = await addSkyvernCredentials(userId, validatedData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      credential: result.data,
      message: 'Skyvern credentials added successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating Skyvern credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/skyvern/credentials
 * Update existing Skyvern credentials for the current user
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { credential_id, ...updateData } = body;

    if (!credential_id) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const validatedData = UpdateCredentialSchema.parse(updateData);

    const result = await updateSkyvernCredentials(userId, credential_id, validatedData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      credential: result.data,
      message: 'Skyvern credentials updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating Skyvern credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/skyvern/credentials
 * Delete Skyvern credentials for the current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const credential_id = url.searchParams.get('credential_id');

    if (!credential_id) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const result = await deleteSkyvernCredentials(userId, credential_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Skyvern credentials deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting Skyvern credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
