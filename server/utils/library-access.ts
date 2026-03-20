import type { CustomSession } from './session'

export const LIBRARY_SCOPE_VALUES = ['athlete', 'coach', 'all'] as const

export type LibraryScope = (typeof LIBRARY_SCOPE_VALUES)[number]

type SessionUserLike = NonNullable<CustomSession['user']>

export type LibraryAccessContext = {
  effectiveUserId: string
  actorUserId: string
  isCoaching: boolean
  originalUserId?: string | null
}

export function getLibraryAccessContext(user: SessionUserLike): LibraryAccessContext {
  return {
    effectiveUserId: user.id,
    actorUserId: user.originalUserId || user.id,
    isCoaching: !!user.isCoaching && !!user.originalUserId,
    originalUserId: user.originalUserId || null
  }
}

export function parseLibraryScope(
  value: unknown,
  fallback: LibraryScope = 'athlete'
): LibraryScope {
  return typeof value === 'string' && (LIBRARY_SCOPE_VALUES as readonly string[]).includes(value)
    ? (value as LibraryScope)
    : fallback
}

export function getReadableLibraryOwnerIds(
  context: LibraryAccessContext,
  scope: LibraryScope
): string[] {
  if (!context.isCoaching) {
    return [context.effectiveUserId]
  }

  if (scope === 'coach') {
    return [context.actorUserId]
  }

  if (scope === 'all') {
    return [context.actorUserId, context.effectiveUserId]
  }

  return [context.effectiveUserId]
}

export function getWritableLibraryOwnerId(
  context: LibraryAccessContext,
  ownerScope?: LibraryScope | null
): string {
  const scope =
    ownerScope && ownerScope !== 'all' ? ownerScope : context.isCoaching ? 'coach' : 'athlete'

  if (!context.isCoaching) {
    return context.effectiveUserId
  }

  return scope === 'athlete' ? context.effectiveUserId : context.actorUserId
}

export function getLibraryOwnerScope(
  context: LibraryAccessContext,
  ownerUserId: string
): Exclude<LibraryScope, 'all'> {
  if (context.isCoaching && ownerUserId === context.actorUserId) {
    return 'coach'
  }

  return 'athlete'
}

export function annotateLibraryOwner<T extends { userId: string }>(
  context: LibraryAccessContext,
  item: T
) {
  return {
    ...item,
    ownerUserId: item.userId,
    ownerScope: getLibraryOwnerScope(context, item.userId)
  }
}

export function groupLibraryItemsByOwner<T extends { userId: string }>(
  context: LibraryAccessContext,
  items: T[]
) {
  const grouped = {
    coach: [] as Array<T & { ownerUserId: string; ownerScope: 'coach' | 'athlete' }>,
    athlete: [] as Array<T & { ownerUserId: string; ownerScope: 'coach' | 'athlete' }>
  }

  for (const item of items) {
    const annotated = annotateLibraryOwner(context, item)
    if (annotated.ownerScope === 'coach') grouped.coach.push(annotated)
    else grouped.athlete.push(annotated)
  }

  return grouped
}
