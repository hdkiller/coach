import { getE2eBaseUrl } from './app.ts'

export async function mintE2eAccessToken(
  optionsOrEmail?:
    | string
    | {
        email?: string
        scopes?: string[]
        clientId?: string
        baseUrl?: string
      },
  clientIdParam?: string
) {
  const opts =
    typeof optionsOrEmail === 'string'
      ? { email: optionsOrEmail, clientId: clientIdParam }
      : optionsOrEmail

  const baseUrl = (opts?.baseUrl ?? getE2eBaseUrl()).replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/__e2e/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: opts?.email ?? process.env.E2E_TEST_USER_EMAIL,
      scopes: opts?.scopes,
      clientId: opts?.clientId ?? process.env.E2E_MOBILE_CLIENT_ID
    })
  })

  if (!response.ok) {
    throw new Error(`E2E token mint failed (${response.status}): ${await response.text()}`)
  }

  return response.json() as Promise<{
    access_token: string
    token_type: string
    expires_in: number
    refresh_token: string | null
    scope: string
    userId: string
    email: string
    clientId: string
  }>
}
