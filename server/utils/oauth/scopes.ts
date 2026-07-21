/** OAuth scopes valid for REST developer API flows. */
import { MCP_SCOPE_LABELS as SHARED_MCP_SCOPE_LABELS } from '../../../shared/oauth-scope-labels'

export const REST_OAUTH_SCOPES = [
  'profile:read',
  'profile:write',
  'workout:read',
  'workout:write',
  'health:read',
  'health:write',
  'nutrition:read',
  'nutrition:write',
  'availability:read',
  'availability:write',
  'plan:read',
  'plan:write',
  'coaching:read',
  'coaching:write',
  'chat:read',
  'chat:write',
  'goal:read',
  'goal:write',
  'performance:read',
  'recommendation:read',
  'offline_access'
] as const

/** Scopes exposed through the MCP server manifest. */
export const MCP_DATA_SCOPES = [
  'profile:read',
  'profile:write',
  'workout:read',
  'workout:write',
  'planning:read',
  'planning:write',
  'health:read',
  'health:write',
  'nutrition:read',
  'nutrition:write',
  'analysis:read',
  'memory:read',
  'memory:write',
  'recommendations:read',
  'recommendations:write',
  'ai:generate'
] as const

export const MCP_OAUTH_SCOPES = [...MCP_DATA_SCOPES, 'offline_access'] as const

export type McpOAuthScope = (typeof MCP_OAUTH_SCOPES)[number]

const REST_SCOPE_SET = new Set<string>(REST_OAUTH_SCOPES)
const MCP_SCOPE_SET = new Set<string>(MCP_OAUTH_SCOPES)

export function parseScopeString(scope?: string | null): string[] {
  if (!scope?.trim()) return []
  return scope
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function validateRestOAuthScopes(scopes: string[]): string[] {
  const unknown = scopes.filter((scope) => !REST_SCOPE_SET.has(scope))
  if (unknown.length > 0) {
    throw new Error(`Unknown OAuth scopes: ${unknown.join(', ')}`)
  }
  return scopes
}

export function validateMcpOAuthScopes(scopes: string[]): string[] {
  const unknown = scopes.filter((scope) => !MCP_SCOPE_SET.has(scope))
  if (unknown.length > 0) {
    throw new Error(`Unknown MCP OAuth scopes: ${unknown.join(', ')}`)
  }
  return scopes
}

export function tokenHasScopes(tokenScopes: string[], requiredScopes: string[]): boolean {
  if (requiredScopes.length === 0) return true
  return requiredScopes.every((scope) => tokenScopes.includes(scope))
}

export function dataScopesFromToken(tokenScopes: string[]): string[] {
  return tokenScopes.filter((scope) => scope !== 'offline_access')
}

export const MCP_SCOPE_LABELS: Record<
  string,
  { title: string; description: string; icon: string }
> = Object.fromEntries(
  Object.entries(SHARED_MCP_SCOPE_LABELS).map(([key, value]) => [
    key,
    { title: value.title, description: value.description, icon: value.icon }
  ])
)
