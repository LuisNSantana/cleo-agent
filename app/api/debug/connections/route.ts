import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Failed to create Supabase client' }, { status: 500 })
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Get all service connections for this user
    const { data: connections, error } = await (supabase as any)
      .from('user_service_connections')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching connections:', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    // Safe data for debugging (don't expose tokens)
    const safeConnections = connections?.map((conn: any) => ({
      id: conn.id,
      service_id: conn.service_id,
      connected: conn.connected,
      hasAccessToken: !!conn.access_token,
      hasRefreshToken: !!conn.refresh_token,
      tokenExpiresAt: conn.token_expires_at,
      isExpired: conn.token_expires_at ? new Date() >= new Date(conn.token_expires_at) : null,
      accountInfo: conn.account_info,
      scopes: conn.scopes,
      createdAt: conn.created_at,
      updatedAt: conn.updated_at
    }))

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      connections: safeConnections,
      googleCalendarConnection: safeConnections?.find((c: any) => c.service_id === 'google-calendar')
    })

  } catch (error) {
    console.error('Debug connections error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
