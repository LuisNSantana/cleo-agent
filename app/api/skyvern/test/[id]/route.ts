/**
 * API endpoint for testing Skyvern credentials
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { testSkyvernConnection } from '@/lib/skyvern/credentials';

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
 * POST /api/skyvern/test/[id]
 * Test a specific Skyvern credential by ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: credentialId } = await params;
    if (!credentialId) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    // Test the connection
    const result = await testSkyvernConnection(userId, credentialId);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: result.valid || false, 
      message: result.valid ? 'Skyvern connection test successful' : 'Connection test failed',
      error: result.error,
      organizationInfo: result.organizationInfo
    });

  } catch (error) {
    console.error('Error testing Skyvern connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
