import crypto from 'crypto'

/**
 * Genera un code_verifier aleatorio para PKCE (32 bytes)
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Genera un code_challenge a partir del code_verifier (SHA-256)
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

interface TwitterOAuthParams {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
  scopes: string[]
}

/**
 * Genera la URL de autorización de Twitter OAuth 2.0 con PKCE
 */
export function generateTwitterOAuthUrl(params: TwitterOAuthParams): string {
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize')
  
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', params.clientId)
  authUrl.searchParams.set('redirect_uri', params.redirectUri)
  authUrl.searchParams.set('scope', params.scopes.join(' '))
  authUrl.searchParams.set('state', params.state)
  authUrl.searchParams.set('code_challenge', params.codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  
  return authUrl.toString()
}

/**
 * Intercambia el código de autorización por un access_token
 */
export async function exchangeTwitterCode(params: {
  code: string
  codeVerifier: string
  redirectUri: string
  clientId: string
  clientSecret: string
}): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}> {
  const tokenUrl = 'https://api.twitter.com/2/oauth2/token'
  
  // Twitter requiere autenticación Basic: base64(client_id:client_secret)
  const basicAuth = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')
  
  const tokenParams = new URLSearchParams({
    code: params.code,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    },
    body: tokenParams.toString()
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Token exchange failed: ${errorData}`)
  }

  return response.json()
}

/**
 * Obtiene información del usuario autenticado de Twitter
 */
export async function getTwitterUserInfo(accessToken: string): Promise<any> {
  const response = await fetch('https://api.twitter.com/2/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Failed to fetch user info: ${errorData}`)
  }

  const data = await response.json()
  return data.data
}
