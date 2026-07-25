import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

export const E2E_ATHLETE_EMAIL = 'e2e-athlete@coachwatts.test'
export const E2E_ADMIN_EMAIL = 'e2e-admin@coachwatts.test'

/** Deterministic client id for the Official Mobile App stand-in. */
export const E2E_MOBILE_CLIENT_ID = 'e2e00000-0000-4000-8000-000000000001'
export const E2E_MOBILE_APP_NAME = 'E2E Official Mobile App'
export const E2E_MOBILE_REDIRECT_URI = 'coachwatts://oauth/callback'

function utcTodayDateOnly(now = new Date()) {
  const dateStr = now.toISOString().slice(0, 10)
  return new Date(`${dateStr}T00:00:00.000Z`)
}

export async function seedE2eUsers(prisma: PrismaClient) {
  const now = new Date()

  const athlete = await prisma.user.upsert({
    where: { email: E2E_ATHLETE_EMAIL },
    update: {
      name: 'E2E Athlete',
      timezone: 'UTC',
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
      timezone: 'UTC',
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
      timezone: 'UTC',
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
      timezone: 'UTC',
      termsAcceptedAt: now,
      termsVersion: 'e2e',
      healthConsentAcceptedAt: now,
      privacyPolicyVersion: 'e2e',
      uiLanguage: 'en'
    }
  })

  return { athlete, admin }
}

export async function seedE2eMobileOAuthApp(prisma: PrismaClient, ownerId: string) {
  const hashedSecret = await bcrypt.hash(`e2e-mobile-secret-${randomUUID()}`, 12)

  const existing = await prisma.oAuthApp.findUnique({
    where: { clientId: E2E_MOBILE_CLIENT_ID }
  })

  if (existing) {
    return prisma.oAuthApp.update({
      where: { id: existing.id },
      data: {
        name: E2E_MOBILE_APP_NAME,
        ownerId,
        redirectUris: [E2E_MOBILE_REDIRECT_URI],
        isTrusted: true,
        isOfficial: true,
        isPublicClient: true,
        clientSecret: hashedSecret
      }
    })
  }

  return prisma.oAuthApp.create({
    data: {
      name: E2E_MOBILE_APP_NAME,
      clientId: E2E_MOBILE_CLIENT_ID,
      clientSecret: hashedSecret,
      ownerId,
      redirectUris: [E2E_MOBILE_REDIRECT_URI],
      isTrusted: true,
      isOfficial: true,
      isPublicClient: true,
      registrationType: 'manual'
    }
  })
}

export async function seedE2eTodayRecommendation(prisma: PrismaClient, userId: string) {
  const date = utcTodayDateOnly()

  const existing = await prisma.activityRecommendation.findFirst({
    where: { userId, date },
    orderBy: { createdAt: 'desc' }
  })

  if (existing) {
    return prisma.activityRecommendation.update({
      where: { id: existing.id },
      data: {
        recommendation: 'proceed',
        confidence: 0.92,
        reasoning: 'E2E fixture: readiness looks good for the planned session.',
        status: 'COMPLETED',
        userAccepted: null,
        userModified: null,
        analysisJson: {
          source: 'e2e-seed',
          summary: 'Deterministic today recommendation for companion/web E2E.'
        }
      }
    })
  }

  return prisma.activityRecommendation.create({
    data: {
      userId,
      date,
      recommendation: 'proceed',
      confidence: 0.92,
      reasoning: 'E2E fixture: readiness looks good for the planned session.',
      status: 'COMPLETED',
      analysisJson: {
        source: 'e2e-seed',
        summary: 'Deterministic today recommendation for companion/web E2E.'
      }
    }
  })
}

/**
 * Soft-activate the companion athlete: consent (users seed) + primary goal +
 * active plan + today recommendation (insight). Connect-last may stay pending
 * so mobile opens the Today shell (Finish-setup card) instead of the wizard.
 */
export async function seedE2eSoftActivation(prisma: PrismaClient, userId: string) {
  const targetDate = new Date('2026-10-23T00:00:00.000Z')

  let goal = await prisma.goal.findFirst({
    where: { userId, status: { not: 'ARCHIVED' } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
  })

  if (!goal) {
    goal = await prisma.goal.create({
      data: {
        userId,
        type: 'EVENT',
        title: 'E2E Autumn gran fondo',
        description: 'Deterministic primary goal for companion Maestro / Playwright.',
        status: 'ACTIVE',
        priority: 'HIGH',
        targetDate,
        eventDate: targetDate,
        eventType: 'gran_fondo'
      }
    })
  } else {
    goal = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        type: 'EVENT',
        title: 'E2E Autumn gran fondo',
        status: 'ACTIVE',
        priority: 'HIGH',
        targetDate,
        eventDate: targetDate
      }
    })
  }

  let plan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE', isTemplate: false },
    orderBy: { updatedAt: 'desc' }
  })

  if (!plan) {
    plan = await prisma.trainingPlan.create({
      data: {
        userId,
        goalId: goal.id,
        name: 'E2E Base Plan',
        status: 'ACTIVE',
        isTemplate: false,
        startDate: utcTodayDateOnly(),
        targetDate,
        primarySport: 'cycling',
        goalLabel: 'E2E Autumn gran fondo'
      }
    })
  } else {
    plan = await prisma.trainingPlan.update({
      where: { id: plan.id },
      data: {
        goalId: goal.id,
        name: 'E2E Base Plan',
        status: 'ACTIVE',
        isTemplate: false,
        targetDate,
        primarySport: 'cycling',
        goalLabel: 'E2E Autumn gran fondo'
      }
    })
  }

  return { goal, plan }
}

export async function seedE2eData(prisma: PrismaClient) {
  const users = await seedE2eUsers(prisma)
  const mobileApp = await seedE2eMobileOAuthApp(prisma, users.admin.id)
  const softActivation = await seedE2eSoftActivation(prisma, users.athlete.id)
  const todayRecommendation = await seedE2eTodayRecommendation(prisma, users.athlete.id)

  return {
    ...users,
    mobileApp,
    softActivation,
    todayRecommendation
  }
}
