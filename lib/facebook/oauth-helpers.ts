/**
 * Facebook OAuth 2.0 Helpers
 * Facebook usa OAuth 2.0 estándar con código de autorización
 */

/**
 * Genera la URL de autorización de Facebook
 */
export function generateFacebookOAuthUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  scopes: string[]
}): string {
  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  
  authUrl.searchParams.set('client_id', params.clientId)
  authUrl.searchParams.set('redirect_uri', params.redirectUri)
  authUrl.searchParams.set('scope', params.scopes.join(','))
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', params.state)
  
  return authUrl.toString()
}

/**
 * Intercambia el código de autorización por un access_token
 */
export async function exchangeFacebookCode(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<{
  access_token: string
  token_type: string
  expires_in?: number
}> {
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  
  tokenUrl.searchParams.set('client_id', params.clientId)
  tokenUrl.searchParams.set('client_secret', params.clientSecret)
  tokenUrl.searchParams.set('redirect_uri', params.redirectUri)
  tokenUrl.searchParams.set('code', params.code)

  const response = await fetch(tokenUrl.toString())

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Facebook token exchange failed: ${errorData}`)
  }

  return response.json()
}

/**
 * Convierte un short-lived token en long-lived token (60 días)
 */
export async function exchangeFacebookForLongLivedToken(params: {
  accessToken: string
  clientId: string
  clientSecret: string
}): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('client_secret', params.clientSecret)
  url.searchParams.set('fb_exchange_token', params.accessToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Facebook long-lived token exchange failed: ${errorData}`)
  }

  return response.json()
}

/**
 * Obtiene información del usuario de Facebook
 */
export async function getFacebookUserInfo(accessToken: string): Promise<any> {
  const url = new URL('https://graph.facebook.com/v21.0/me')
  url.searchParams.set('fields', 'id,name,email,picture')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Failed to fetch Facebook user info: ${errorData}`)
  }

  return response.json()
}
