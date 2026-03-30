import { describe, expect, it } from 'vitest'
import {
  hasGarminPermission,
  mergeGarminScopes,
  parseGarminScope
} from '../../../../server/utils/garmin'

describe('Garmin permission helpers', () => {
  it('parses and normalizes Garmin scope strings', () => {
    expect(parseGarminScope('partner_write connect_read  workout_import')).toEqual(
      new Set(['PARTNER_WRITE', 'CONNECT_READ', 'WORKOUT_IMPORT'])
    )
  })

  it('treats PARTNER_WRITE as sufficient for Garmin import permissions', () => {
    const scopes = parseGarminScope('PARTNER_WRITE CONNECT_READ')

    expect(hasGarminPermission(scopes, 'WORKOUT_IMPORT')).toBe(true)
    expect(hasGarminPermission(scopes, 'COURSE_IMPORT')).toBe(true)
  })

  it('merges stored OAuth scopes with fetched Garmin permissions', () => {
    expect(mergeGarminScopes('PARTNER_WRITE CONNECT_READ', ['workout_import'])).toEqual(
      new Set(['PARTNER_WRITE', 'CONNECT_READ', 'WORKOUT_IMPORT'])
    )
  })
})
