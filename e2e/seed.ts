import type { PrismaClient } from '@prisma/client'

export const E2E_ATHLETE_EMAIL = 'e2e-athlete@coachwatts.test'
export const E2E_ADMIN_EMAIL = 'e2e-admin@coachwatts.test'

export async function seedE2eUsers(prisma: PrismaClient) {
  const now = new Date()

  const athlete = await prisma.user.upsert({
    where: { email: E2E_ATHLETE_EMAIL },
    update: {
      name: 'E2E Athlete',
      termsAcceptedAt: now,
      termsVersion: 'e2e',
      healthConsentAcceptedAt: now,
      privacyPolicyVersion: 'e2e',
      uiLanguage: 'en',
      deactivatedAt: null
    },
    create: {
      email: E2E_ATHLETE_EMAIL,
      name: 'E2E Athlete',
      termsAcceptedAt: now,
      termsVersion: 'e2e',
      healthConsentAcceptedAt: now,
      privacyPolicyVersion: 'e2e',
      uiLanguage: 'en'
    }
  })

  const admin = await prisma.user.upsert({
    where: { email: E2E_ADMIN_EMAIL },
    update: {
      name: 'E2E Admin',
      isAdmin: true,
      termsAcceptedAt: now,
      termsVersion: 'e2e',
      healthConsentAcceptedAt: now,
      privacyPolicyVersion: 'e2e',
      uiLanguage: 'en',
      deactivatedAt: null
    },
    create: {
      email: E2E_ADMIN_EMAIL,
      name: 'E2E Admin',
      isAdmin: true,
      termsAcceptedAt: now,
      termsVersion: 'e2e',
      healthConsentAcceptedAt: now,
      privacyPolicyVersion: 'e2e',
      uiLanguage: 'en'
    }
  })

  return { athlete, admin }
}
