import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { tokenHasScopes } from './oauth/scopes'

const WS_TOKEN_TTL_MS = 10 * 1000

type WsTokenPayload = {
  sub: string
  purpose: 'websocket_auth'
  exp: number
  nonce: string
  /**
   * Granted OAuth scopes captured at mint time.
   * `null` = unrestricted (cookie session / API key).
   * Missing on legacy tokens is treated as `[]` (deny privileged ops).
   */
  scopes: string[] | null
}

export type WsAuthResult = {
  userId: string
  /** `null` = unrestricted (session / API key). */
  scopes: string[] | null
}

function getWsAuthSecret() {
  return process.env.INTERNAL_API_TOKEN || process.env.NUXT_SESSION_PASSWORD || null
}

/**
 * @param scopes - OAuth scopes to embed, or `null` for unrestricted session/API-key access.
 */
export function generateWsToken(userId: string, scopes: string[] | null = null): string {
  const secret = getWsAuthSecret()
  if (!secret) {
    throw new Error('WS auth secret is not configured')
  }

  const payload: WsTokenPayload = {
    sub: userId,
    purpose: 'websocket_auth',
    exp: Date.now() + WS_TOKEN_TTL_MS,
    nonce: randomBytes(8).toString('hex'),
    scopes
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = createHmac('sha256', secret)
  hmac.update(payloadB64)
  const signature = hmac.digest('hex')

  return `${payloadB64}.${signature}`
}

export function verifyWsToken(token: string): WsAuthResult | null {
  try {
    const secret = getWsAuthSecret()
    if (!secret) return null

    const [payloadB64, signature] = token.split('.')
    if (!payloadB64 || !signature) return null

    const hmac = createHmac('sha256', secret)
    hmac.update(payloadB64)
    const expectedSignature = hmac.digest('hex')

    if (signature.length !== expectedSignature.length) return null

    const isValid = timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
    if (!isValid) return null

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as WsTokenPayload

    if (payload.purpose !== 'websocket_auth' || !payload.sub) return null
    if (Date.now() > payload.exp) return null

    // Legacy tokens (no scopes field) → empty grants, not unrestricted.
    const scopes = Object.prototype.hasOwnProperty.call(payload, 'scopes') ? payload.scopes : []

    return {
      userId: payload.sub,
      scopes: scopes === null ? null : Array.isArray(scopes) ? scopes : []
    }
  } catch {
    return null
  }
}

/** Whether a WS auth result includes the required scope (`null` scopes = unrestricted). */
export function wsAuthHasScopes(
  scopes: string[] | null | undefined,
  requiredScopes: string[]
): boolean {
  if (scopes === null) return true
  if (!scopes) return requiredScopes.length === 0
  return tokenHasScopes(scopes, requiredScopes)
}
