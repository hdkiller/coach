import { randomBytes } from 'node:crypto'

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const INVITE_CODE_LENGTH = 10
export const MAX_INVITE_CODE_RETRIES = 5

export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  const bytes = randomBytes(length)
  let code = ''

  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[bytes[i]! % INVITE_ALPHABET.length]
  }

  return code
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  )
}
