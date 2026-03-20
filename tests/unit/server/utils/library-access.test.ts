import { describe, expect, it } from 'vitest'

import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  getWritableLibraryOwnerId
} from '../../../../server/utils/library-access'

describe('library access helpers', () => {
  it('keeps athlete and actor identical outside coaching mode', () => {
    const context = getLibraryAccessContext({
      id: 'user-1',
      isAdmin: false
    } as any)

    expect(context).toEqual({
      effectiveUserId: 'user-1',
      actorUserId: 'user-1',
      isCoaching: false,
      originalUserId: null
    })
    expect(getReadableLibraryOwnerIds(context, 'athlete')).toEqual(['user-1'])
    expect(getReadableLibraryOwnerIds(context, 'coach')).toEqual(['user-1'])
    expect(getWritableLibraryOwnerId(context, 'coach')).toBe('user-1')
  })

  it('splits athlete and coach ownership in coaching mode', () => {
    const context = getLibraryAccessContext({
      id: 'athlete-1',
      originalUserId: 'coach-1',
      isCoaching: true,
      isAdmin: false
    } as any)

    expect(getReadableLibraryOwnerIds(context, 'athlete')).toEqual(['athlete-1'])
    expect(getReadableLibraryOwnerIds(context, 'coach')).toEqual(['coach-1'])
    expect(getReadableLibraryOwnerIds(context, 'all')).toEqual(['coach-1', 'athlete-1'])
    expect(getWritableLibraryOwnerId(context)).toBe('coach-1')
    expect(getWritableLibraryOwnerId(context, 'athlete')).toBe('athlete-1')
  })
})
