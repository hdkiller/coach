import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const DEFAULT_UNSUB_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

type UnsubscribeTokenPayload = {
  sub: string
  purpose: 'email_unsubscribe'
  iat: number
  exp: number
  nonce: string
}

/**
 * Generates a secure, cryptographic unsubscribe token for a user.
 * Encodes the userId and signs it with the INTERNAL_API_TOKEN.
 */
export function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.INTERNAL_API_TOKEN
  if (!secret) {
    throw new Error('INTERNAL_API_TOKEN is not defined')
  }

  const now = Math.floor(Date.now() / 1000)
  const ttlSeconds = Number(
    process.env.EMAIL_UNSUBSCRIBE_TOKEN_TTL_SECONDS || DEFAULT_UNSUB_TOKEN_TTL_SECONDS
  )
  const payload: UnsubscribeTokenPayload = {
    sub: userId,
    purpose: 'email_unsubscribe',
    iat: now,
    exp: now + Math.max(300, ttlSeconds),
    nonce: randomBytes(8).toString('hex')
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = createHmac('sha256', secret)
  hmac.update(payloadB64)
  const signature = hmac.digest('hex')

  return `${payloadB64}.${signature}`
}

/**
 * Verifies an unsubscribe token and returns the userId if valid.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const secret = process.env.INTERNAL_API_TOKEN
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
    ) as UnsubscribeTokenPayload
    if (payload.purpose !== 'email_unsubscribe') return null
    if (!payload.sub) return null

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp <= now) return null

    return payload.sub
  } catch (err) {
    console.error('[UnsubscribeToken] Verification failed:', err)
    return null
  }
}
