import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, setCookie } from 'h3'
import {
  buildReferralShareUrl as buildSharedReferralShareUrl,
  normalizeReferralCode,
  normalizeReferralSource,
  type ReferralShareMedium
} from '../../shared/referrals'
import { prisma } from './db'
import { generateInviteCode, isUniqueConstraintError, MAX_INVITE_CODE_RETRIES } from './invite-code'
import { auditLogRepository } from './repositories/auditLogRepository'

export const REFERRAL_VIA_COOKIE = 'cw_via'
export const REFERRAL_VIA_SOURCE_COOKIE = 'cw_via_source'
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export { normalizeReferralCode, normalizeReferralSource, type ReferralShareMedium }

export function buildReferralShareUrl(code: string, medium: ReferralShareMedium = 'link'): string {
  return buildSharedReferralShareUrl(code, medium, process.env.NUXT_PUBLIC_SITE_URL)
}

async function mintUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_INVITE_CODE_RETRIES; attempt++) {
    const code = generateInviteCode()
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true }
    })
    if (!existing) return code
  }
  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to mint referral code'
  })
}

export async function ensureUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referralCode: true }
  })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (user.referralCode) return user.referralCode

  for (let attempt = 0; attempt < MAX_INVITE_CODE_RETRIES; attempt++) {
    const code = await mintUniqueReferralCode()
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true }
      })
      if (updated.referralCode) return updated.referralCode
    } catch (error) {
      if (isUniqueConstraintError(error)) continue
      throw error
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to assign referral code'
  })
}

export async function regenerateUserReferralCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_INVITE_CODE_RETRIES; attempt++) {
    const code = await mintUniqueReferralCode()
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true }
      })
      if (updated.referralCode) return updated.referralCode
    } catch (error) {
      if (isUniqueConstraintError(error)) continue
      throw error
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to regenerate referral code'
  })
}

export async function getMyReferralPayload(userId: string, medium: ReferralShareMedium = 'link') {
  const code = await ensureUserReferralCode(userId)
  const attributedCount = await prisma.referral.count({
    where: { referrerUserId: userId, status: 'ATTRIBUTED' }
  })

  return {
    code,
    shareUrl: buildReferralShareUrl(code, medium),
    stats: { attributedCount }
  }
}

export function setReferralViaCookie(
  event: H3Event,
  via: string,
  source: ReferralShareMedium = 'link'
) {
  const code = normalizeReferralCode(via)
  if (!code) return

  const secure = process.env.NODE_ENV === 'production'
  setCookie(event, REFERRAL_VIA_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS
  })
  setCookie(event, REFERRAL_VIA_SOURCE_COOKIE, source, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS
  })
}

export function clearReferralViaCookie(event: H3Event) {
  deleteCookie(event, REFERRAL_VIA_COOKIE, { path: '/' })
  deleteCookie(event, REFERRAL_VIA_SOURCE_COOKIE, { path: '/' })
}

export function readReferralViaFromEvent(event: H3Event): {
  code: string | null
  source: ReferralShareMedium
} {
  return {
    code: normalizeReferralCode(getCookie(event, REFERRAL_VIA_COOKIE)),
    source: normalizeReferralSource(getCookie(event, REFERRAL_VIA_SOURCE_COOKIE))
  }
}

export type AttributeReferralResult =
  | { status: 'attributed'; referrerUserId: string; code: string; source: ReferralShareMedium }
  | { status: 'already_attributed' }
  | { status: 'ignored'; reason: string }

/**
 * First-touch attribution for a newly created (or still unattributed) account.
 * Never overwrites; blocks self-referral; ignores unknown codes.
 */
export async function attributeReferral(options: {
  refereeUserId: string
  code: string | null | undefined
  source?: ReferralShareMedium | string | null
}): Promise<AttributeReferralResult> {
  const code = normalizeReferralCode(options.code)
  if (!code) {
    return { status: 'ignored', reason: 'missing_code' }
  }

  const source = normalizeReferralSource(options.source)
  const referee = await prisma.user.findUnique({
    where: { id: options.refereeUserId },
    select: { id: true, referralCode: true, referredByUserId: true }
  })
  if (!referee) {
    return { status: 'ignored', reason: 'referee_not_found' }
  }
  if (referee.referredByUserId) {
    return { status: 'already_attributed' }
  }
  if (referee.referralCode && referee.referralCode === code) {
    return { status: 'ignored', reason: 'self_referral' }
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, referralCode: true, deactivatedAt: true }
  })
  if (!referrer || !referrer.referralCode) {
    return { status: 'ignored', reason: 'unknown_code' }
  }
  if (referrer.id === referee.id) {
    return { status: 'ignored', reason: 'self_referral' }
  }
  if (referrer.deactivatedAt) {
    return { status: 'ignored', reason: 'referrer_deactivated' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: referee.id },
        select: { referredByUserId: true }
      })
      if (current?.referredByUserId) {
        return
      }

      await tx.user.update({
        where: { id: referee.id },
        data: { referredByUserId: referrer.id }
      })

      await tx.referral.create({
        data: {
          referrerUserId: referrer.id,
          refereeUserId: referee.id,
          code: referrer.referralCode!,
          source,
          status: 'ATTRIBUTED'
        }
      })
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: 'already_attributed' }
    }
    throw error
  }

  const confirmed = await prisma.referral.findUnique({
    where: { refereeUserId: referee.id },
    select: { referrerUserId: true, code: true, source: true }
  })
  if (!confirmed) {
    return { status: 'already_attributed' }
  }

  try {
    await auditLogRepository.log({
      userId: referee.id,
      action: 'REFERRAL_ATTRIBUTED',
      metadata: {
        referrer_user_id: confirmed.referrerUserId,
        referee_user_id: referee.id,
        code: confirmed.code,
        source: confirmed.source
      }
    })
  } catch (error) {
    console.error('[Referrals] Failed to audit referral attribution:', error)
  }

  return {
    status: 'attributed',
    referrerUserId: confirmed.referrerUserId,
    code: confirmed.code,
    source: normalizeReferralSource(confirmed.source)
  }
}

export async function attributeReferralFromEvent(
  event: H3Event,
  refereeUserId: string
): Promise<AttributeReferralResult> {
  const pending = readReferralViaFromEvent(event)
  const result = await attributeReferral({
    refereeUserId,
    code: pending.code,
    source: pending.source
  })
  if (result.status === 'attributed' || result.status === 'already_attributed') {
    clearReferralViaCookie(event)
  }
  return result
}
