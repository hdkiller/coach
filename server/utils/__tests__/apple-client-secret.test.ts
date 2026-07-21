import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createAppleClientSecret } from '../apple-client-secret'

describe('createAppleClientSecret', () => {
  it('builds an ES256 JWT with Apple claims', () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const jwt = createAppleClientSecret({
      teamId: 'TEAM123',
      clientId: 'com.example.web',
      keyId: 'KEY1',
      privateKeyPem: pem,
      expiresInSeconds: 3600
    })

    const parts = jwt.split('.')
    expect(parts).toHaveLength(3)
    const [headerB64, payloadB64, sig] = parts as [string, string, string]
    expect(sig).toBeTruthy()
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'))
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    expect(header).toEqual({ alg: 'ES256', kid: 'KEY1' })
    expect(payload.iss).toBe('TEAM123')
    expect(payload.sub).toBe('com.example.web')
    expect(payload.aud).toBe('https://appleid.apple.com')
    expect(payload.exp).toBeGreaterThan(payload.iat)
  })
})
