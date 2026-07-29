import type { OAuthMetadata } from '@modelcontextprotocol/server'
import {
  buildOAuthProtectedResourceMetadata,
  getOAuthProtectedResourceMetadataUrl
} from '@modelcontextprotocol/server'
import { MCP_OAUTH_SCOPES } from '../oauth/scopes'
import { getMcpResourceUrl } from '../oauth/resource'

export function getOAuthIssuer(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '')
}

export function buildCoachWattsOAuthMetadata(
  siteUrl: string,
  options: { includeRegistrationEndpoint?: boolean } = {}
): OAuthMetadata {
  const issuer = getOAuthIssuer(siteUrl)
  const metadata: OAuthMetadata = {
    issuer,
    authorization_endpoint: new URL('/api/oauth/authorize', siteUrl).href,
    token_endpoint: new URL('/api/oauth/token', siteUrl).href,
    revocation_endpoint: new URL('/api/oauth/revoke', siteUrl).href,
    scopes_supported: [...MCP_OAUTH_SCOPES],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    service_documentation: new URL('/docs/developer/scopes', siteUrl).href
  }

  if (options.includeRegistrationEndpoint) {
    metadata.registration_endpoint = new URL('/api/oauth/register', siteUrl).href
  }

  return metadata
}

export function buildCoachWattsProtectedResourceMetadata(
  siteUrl: string,
  options: { includeRegistrationEndpoint?: boolean } = {}
) {
  const resourceServerUrl = new URL(getMcpResourceUrl(siteUrl))
  return buildOAuthProtectedResourceMetadata({
    oauthMetadata: buildCoachWattsOAuthMetadata(siteUrl, options),
    resourceServerUrl,
    resourceName: 'Journey Endurance Coaching MCP',
    serviceDocumentationUrl: new URL('/docs/developer/scopes', siteUrl),
    scopesSupported: [...MCP_OAUTH_SCOPES]
  })
}

export function getProtectedResourceMetadataUrl(siteUrl: string): string {
  return getOAuthProtectedResourceMetadataUrl(new URL(getMcpResourceUrl(siteUrl)))
}
