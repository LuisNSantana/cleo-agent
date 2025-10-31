/**
 * Instagram OAuth 2.0 Helpers
 * Instagram usa OAuth 2.0 con código de autorización (sin PKCE)
 */

/**
 * Genera la URL de autorización de Instagram
 */
export function generateInstagramOAuthUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  scopes: string[]
}): string {
  const authUrl = new URL('https://www.instagram.com/oauth/authorize')
  
  authUrl.searchParams.set('client_id', params.clientId)
  authUrl.searchParams.set('redirect_uri', params.redirectUri)
  authUrl.searchParams.set('scope', params.scopes.join(','))
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', params.state)
  
  return authUrl.toString()
}

/**
 * Intercambia el código de autorización por un access_token de Instagram
 */
export async function exchangeInstagramCode(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<{
  access_token: string
  user_id: number
}> {
  const tokenUrl = 'https://api.instagram.com/oauth/access_token'
  
  const formData = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
    code: params.code
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Instagram token exchange failed: ${errorData}`)
  }

  return response.json()
}

/**
 * Convierte un short-lived token en long-lived token (60 días)
 */
export async function exchangeInstagramForLongLivedToken(params: {
  accessToken: string
  clientSecret: string
}): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const url = new URL('https://graph.instagram.com/access_token')
  
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', params.clientSecret)
  url.searchParams.set('access_token', params.accessToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Instagram long-lived token exchange failed: ${errorData}`)
  }

  return response.json()
}

/**
 * Obtiene información del usuario de Instagram
 */
export async function getInstagramUserInfo(accessToken: string): Promise<any> {
  const url = new URL('https://graph.instagram.com/me')
  url.searchParams.set('fields', 'id,username,account_type,media_count')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Failed to fetch Instagram user info: ${errorData}`)
  }

  return response.json()
}
