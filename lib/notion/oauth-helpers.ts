interface NotionOAuthParams {
  clientId: string
  redirectUri: string
  state: string
}

/**
 * Genera la URL de autorización de Notion OAuth 2.0
 */
export function generateNotionOAuthUrl(params: NotionOAuthParams): string {
  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  
  authUrl.searchParams.set('client_id', params.clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('owner', 'user')
  authUrl.searchParams.set('redirect_uri', params.redirectUri)
  authUrl.searchParams.set('state', params.state)
  
  return authUrl.toString()
}

/**
 * Intercambia el código de autorización por un access_token de Notion
 */
export async function exchangeNotionCode(params: {
  code: string
  redirectUri: string
  clientId: string
  clientSecret: string
}): Promise<{
  access_token: string
  workspace_id: string
  workspace_name: string
  workspace_icon: string | null
  bot_id: string
  owner: {
    type: string
    user?: {
      id: string
      name: string | null
      avatar_url: string | null
      type: string
      person: {
        email: string
      }
    }
  }
}> {
  const tokenUrl = 'https://api.notion.com/v1/oauth/token'
  
  const credentials = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Token exchange failed: ${errorData}`)
  }

  return response.json()
}
