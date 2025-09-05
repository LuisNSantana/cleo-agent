/**
 * API endpoint for testing Skyvern connection
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { testSkyvernConnection } from '@/lib/skyvern/credentials';
import { z } from 'zod';

/**
 * Validation schema
 */
const TestConnectionSchema = z.object({
  credential_id: z.string().min(1, 'Credential ID is required'),
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
 * POST /api/skyvern/test
 * Test Skyvern API connection with specific credentials
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = TestConnectionSchema.parse(body);

    const result = await testSkyvernConnection(userId, validatedData.credential_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      valid: result.valid,
      organization_info: result.organizationInfo,
      message: result.valid ? 'Connection successful' : 'Connection failed',
      error: result.error
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error testing Skyvern connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
