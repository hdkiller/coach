# Authentication

Coach Watts uses standard OAuth 2.0 with **PKCE (Proof Key for Code Exchange)** to secure user data.

## The Authorization Code Flow

1.  **Redirect** the user to the authorization endpoint.
2.  **Receive** the authorization code via callback.
3.  **Exchange** the code for an access token.

### 1. Request Authorization

Direct the user's browser to:

```http
GET /api/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=YOUR_REDIRECT_URI
  &scope=profile:read workout:read
  &state=RANDOM_STRING
  &code_challenge=PKCE_CHALLENGE
  &code_challenge_method=S256
```

### 2. Handle Callback

If the user approves, they will be redirected to:

```
YOUR_REDIRECT_URI?code=AUTHORIZATION_CODE&state=RANDOM_STRING
```

### 3. Exchange Token

Make a server-side POST request to exchange the code:

```http
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "YOUR_REDIRECT_URI",
  "code_verifier": "PKCE_VERIFIER"
}
```

**Response:**

```json
{
  "access_token": "...token...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...refresh...",
  "scope": "profile:read workout:read"
}
```

`expires_in` always refers to the access token lifetime.

`refresh_token_expires_in` may also be returned when the server is enforcing a refresh token lifetime. If present, it is the number of seconds until the refresh token expires.

Clients should always persist the latest `refresh_token` returned by the token endpoint. Future versions of the API may rotate refresh tokens during a successful refresh response.

### 4. Making Requests

Include the token in the Authorization header:

```http
GET /api/workouts
Authorization: Bearer YOUR_ACCESS_TOKEN
```
