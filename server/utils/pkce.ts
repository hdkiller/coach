import { randomBytes, createHash } from 'node:crypto'

/**
 * Generates a random code verifier for PKCE
 * @param length Length of the verifier (43-128 characters)
 */
export function generateCodeVerifier(length: number = 64): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length)
}

/**
 * Generates a code challenge from a code verifier using SHA-256
 * @param verifier The code verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
