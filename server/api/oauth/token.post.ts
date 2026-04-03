import { oauthRepository } from '../../utils/repositories/oauthRepository'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'Exchange Code for Token',
    description: 'Exchanges an authorization code or refresh token for an access token.',
    requestBody: {
      content: {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            required: ['grant_type', 'client_id'],
            properties: {
              grant_type: { type: 'string', enum: ['authorization_code', 'refresh_token'] },
              client_id: { type: 'string' },
              client_secret: { type: 'string' },
              code: { type: 'string' },
              redirect_uri: { type: 'string', format: 'uri' },
              refresh_token: { type: 'string' },
              code_verifier: { type: 'string' }
            }
          }
        },
        'application/json': {
          schema: {
            $ref: '#/components/schemas/TokenRequest'
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                access_token: { type: 'string' },
                token_type: { type: 'string' },
                expires_in: { type: 'integer' },
                refresh_token: { type: 'string' },
                refresh_token_expires_in: { type: 'integer', nullable: true },
                scope: { type: 'string' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid Request' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token, code_verifier } =
    body

  // 1. Authorization Code Grant
  if (grant_type === 'authorization_code') {
    if (!code || !client_id) {
      return sendOAuthError(event, 'invalid_request', 'Missing code or client_id')
    }

    const authCode = await oauthRepository.getAuthCode(code)
    if (!authCode) {
      return sendOAuthError(event, 'invalid_grant', 'Invalid authorization code')
    }

    if (authCode.expiresAt < new Date()) {
      await oauthRepository.deleteAuthCode(code)
      return sendOAuthError(event, 'invalid_grant', 'Authorization code expired')
    }

    const app = authCode.app
    if (app.clientId !== client_id) {
      return sendOAuthError(event, 'invalid_client', 'Client ID mismatch')
    }

    // Client Authentication
    if (client_secret) {
      const isValid = await oauthRepository.verifyClient(client_id, client_secret)
      if (!isValid) {
        return sendOAuthError(event, 'invalid_client', 'Invalid client secret')
      }
    } else if (!authCode.codeChallenge) {
      // Non-PKCE public clients are not allowed if they don't have a secret
      return sendOAuthError(event, 'invalid_client', 'Client secret required for non-PKCE flow')
    }

    // PKCE Verification
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        return sendOAuthError(event, 'invalid_request', 'code_verifier is required for PKCE')
      }

      const crypto = await import('node:crypto')
      let expectedChallenge: string
      if (authCode.codeChallengeMethod === 'S256') {
        expectedChallenge = crypto.createHash('sha256').update(code_verifier).digest('base64url')
      } else {
        expectedChallenge = code_verifier
      }

      if (expectedChallenge !== authCode.codeChallenge) {
        return sendOAuthError(event, 'invalid_grant', 'Invalid code_verifier')
      }
    }

    // Issue Token
    const token = await oauthRepository.createToken({
      appId: app.id,
      userId: authCode.userId,
      scopes: authCode.scopes
    })

    // Cleanup
    await oauthRepository.deleteAuthCode(code)

    return serializeTokenResponse(token)
  }

  // 2. Refresh Token Grant
  if (grant_type === 'refresh_token') {
    if (!refresh_token || !client_id) {
      return sendOAuthError(event, 'invalid_request', 'Missing refresh_token or client_id')
    }

    // Verify client
    if (client_secret) {
      const isValid = await oauthRepository.verifyClient(client_id, client_secret)
      if (!isValid) {
        return sendOAuthError(event, 'invalid_client', 'Invalid client secret')
      }
    }

    const newToken = await oauthRepository.rotateRefreshToken(refresh_token)
    if (!newToken) {
      return sendOAuthError(event, 'invalid_grant', 'Invalid or expired refresh token')
    }

    return serializeTokenResponse(newToken)
  }

  return sendOAuthError(event, 'unsupported_grant_type', 'Unsupported grant type')
})

function sendOAuthError(event: any, error: string, description: string) {
  setResponseStatus(event, 400)
  return {
    error,
    error_description: description
  }
}

function serializeTokenResponse(token: {
  accessToken: string
  refreshToken: string | null
  refreshTokenExpiresAt: Date | null
  scopes: string[]
}) {
  const response: Record<string, unknown> = {
    access_token: token.accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: token.refreshToken,
    scope: token.scopes.join(' ')
  }

  if (token.refreshTokenExpiresAt) {
    response.refresh_token_expires_in = Math.max(
      0,
      Math.floor((token.refreshTokenExpiresAt.getTime() - Date.now()) / 1000)
    )
  }

  return response
}
