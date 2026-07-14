import { describe, expect, it } from 'vitest'
import {
  generateInviteCode,
  INVITE_CODE_LENGTH,
  isUniqueConstraintError
} from '../../../../server/utils/invite-code'

describe('invite-code', () => {
  it('generates codes of the requested length', () => {
    const code = generateInviteCode()
    expect(code).toHaveLength(INVITE_CODE_LENGTH)
  })

  it('uses uppercase alphanumeric characters only', () => {
    const code = generateInviteCode(12)
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('detects Prisma unique constraint errors', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true)
    expect(isUniqueConstraintError(new Error('nope'))).toBe(false)
  })
})
