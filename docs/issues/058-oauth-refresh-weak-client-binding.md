# 058 — OAuth refresh token grant has weak client binding

**Type:** Bug  
**Priority:** Critical  
**Area:** `backend`, `integrations`, `infra`  
**Status:** Open

## Description

The `refresh_token` grant only validates `client_secret` when one is provided. `rotateRefreshToken()` does not verify that `client_id` matches the token’s app, does not check refresh-token expiry, and does not rotate the refresh token itself. A stolen refresh token can be exchanged for a new access token without client authentication.

## Root Cause

```131:139:server/api/oauth/token.post.ts
    if (client_secret) {
      const isValid = await oauthRepository.verifyClient(client_id, client_secret)
      ...
    }
    const newToken = await oauthRepository.rotateRefreshToken(refresh_token)
```

`rotateRefreshToken` only looks up by refresh token string and issues a new access token — no client_id check:

```304:323:server/utils/repositories/oauthRepository.ts
  async rotateRefreshToken(refreshToken: string) {
    const oldToken = await prisma.oAuthToken.findUnique({ where: { refreshToken } })
    ...
    return prisma.oAuthToken.update({ ... data: { accessToken, ... } })
  }
```

## Steps to Reproduce

1. Obtain a valid refresh token (e.g. from a compromised client storage).
2. POST to `/api/oauth/token` with `grant_type=refresh_token`, `client_id` (any), no `client_secret`.
3. Receive new access token.

## Expected Behavior

- Refresh requires client authentication (secret or PKCE-bound public client).
- `client_id` must match token’s issuing app.
- Refresh tokens rotate and respect expiry.

## Actual Behavior

- Refresh succeeds with refresh token alone.

## Affected Files

- `server/api/oauth/token.post.ts`
- `server/utils/repositories/oauthRepository.ts`

## Suggested Fix

Require client auth for all refresh grants; validate `client_id` against token’s `appId`; rotate refresh token; enforce expiry.

## Acceptance Criteria

- [ ] Refresh without valid client credentials returns `invalid_client`
- [ ] Mismatched `client_id` rejected
- [ ] Refresh tokens rotate on use
