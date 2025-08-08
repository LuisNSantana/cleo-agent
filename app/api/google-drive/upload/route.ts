import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type UploadBody = {
  filename: string
  content: string
  mimeType?: string
  folderId?: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })

    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as UploadBody
    const { filename, content, mimeType = 'text/markdown', folderId } = body

    if (!filename || !content) {
      return NextResponse.json({ error: 'filename and content are required' }, { status: 400 })
    }

    // Get Google Drive connection for this user
    const { data: connection, error } = await (supabase as any)
      .from('user_service_connections')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('service_id', 'google-drive')
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch connection', details: error }, { status: 500 })
    }

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'not_connected', message: 'Google Drive is not connected for this user.' }, { status: 400 })
    }

    // Helper to refresh token if possible
    async function refreshIfNeeded(conn: any): Promise<any> {
      const skewMs = 60_000 // 60s skew
      const now = Date.now()
      const exp = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : null
      const isExpiredOrNear = exp ? (exp - now) <= skewMs : false

      if (!isExpiredOrNear) {
        return conn
      }

      if (!conn.refresh_token) {
        throw new Error('token_expired_no_refresh')
      }

      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET
      if (!clientId || !clientSecret) {
        const err = new Error('missing_google_client_config')
        ;(err as any).status = 500
        throw err
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
        }).toString(),
      })

      if (!tokenRes.ok) {
        const txt = await tokenRes.text().catch(() => '')
        const e = new Error(`refresh_failed: ${txt}`)
        ;(e as any).status = 401
        throw e
      }

      const tokenJson = await tokenRes.json() as { access_token: string; expires_in?: number; token_type?: string }
      const newAccessToken = tokenJson.access_token
      const expiresIn = tokenJson.expires_in ? tokenJson.expires_in * 1000 : 3600_000
      const newExpiry = new Date(Date.now() + expiresIn).toISOString()

      // Persist new token
      const { error: upErr, data: updated } = await (supabase as any)
        .from('user_service_connections')
        .update({ access_token: newAccessToken, token_expires_at: newExpiry })
        .eq('id', conn.id)
        .select('*')
        .single()
      if (upErr) {
        throw new Error(`failed_to_update_token: ${upErr.message}`)
      }
      return updated
    }

    // Ensure we have a fresh token if needed
    let usableConnection = await refreshIfNeeded(connection)

    const boundary = 'gcpmultipart' + Math.random().toString(36).slice(2)
    const metadata: Record<string, any> = {
      name: filename,
    }
    if (folderId) metadata.parents = [folderId]

    // Build multipart body
    const bodyParts = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}; charset=UTF-8\r\n\r\n${content}\r\n`,
      `--${boundary}--`
    ]
    const multipartBody = bodyParts.join('')

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType,parents'
    let res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${usableConnection.access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    // If token invalid, try refresh once and retry
    if (res.status === 401 || res.status === 403) {
      try {
        usableConnection = await refreshIfNeeded({ ...usableConnection, token_expires_at: new Date(0).toISOString() })
        res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${usableConnection.access_token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        })
      } catch {}
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return NextResponse.json({ error: 'drive_upload_failed', status: res.status, details: errText }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, file: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'internal_error' }, { status: 500 })
  }
}
