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

const E2E_TODAY_RECOMMENDATION = {
  recommendation: 'proceed',
  confidence: 0.92,
  reasoning: 'E2E fixture: readiness looks good for the planned session.',
  status: 'COMPLETED',
  analysisJson: {
    source: 'e2e-seed',
    summary: 'Deterministic today recommendation for companion/web E2E.'
  }
}

export async function seedE2eTodayRecommendation(prisma: PrismaClient, userId: string) {
  const date = utcTodayDateOnly()

  // Prefer today's row; otherwise roll the latest fixture row forward so a
  // multi-day DB without full truncate still has a same-day recommendation.
  const existing =
    (await prisma.activityRecommendation.findFirst({
      where: { userId, date },
      orderBy: { createdAt: 'desc' }
    })) ??
    (await prisma.activityRecommendation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }))

  if (existing) {
    return prisma.activityRecommendation.update({
      where: { id: existing.id },
      data: {
        date,
        ...E2E_TODAY_RECOMMENDATION,
        userAccepted: null,
        userModified: null
      }
    })
  }

  return prisma.activityRecommendation.create({
    data: {
      userId,
      date,
      ...E2E_TODAY_RECOMMENDATION
    }
  })
}

/**
 * Soft-activate the companion athlete: consent (users seed) + primary goal +
 * active plan + first-value viewed. Connect-last may stay pending so mobile
 * opens the Today shell (Finish-setup card) instead of the wizard.
 *
 * FIRST_VALUE_VIEWED is required — a same-day ActivityRecommendation alone
 * goes stale after midnight if the stack wasn't reset; the audit log keeps
 * softActivated durable across calendar days.
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

  const firstValue = await prisma.auditLog.findFirst({
    where: { userId, action: 'FIRST_VALUE_VIEWED' },
    select: { id: true }
  })
  if (!firstValue) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FIRST_VALUE_VIEWED',
        metadata: { value_type: 'plan_week_reveal', source: 'e2e-seed' }
      }
    })
  }

  return { goal, plan }
}

/**
 * Seed historical & planned workouts for calendar, activities, and dashboard test assertions.
 */
export async function seedE2eUsableData(prisma: PrismaClient, userId: string) {
  const externalId = 'e2e-fixture-workout-1'
  const date = new Date('2026-07-20T10:00:00.000Z')

  const existing = await prisma.workout.findFirst({
    where: { userId, externalId }
  })

  let primaryWorkout
  if (existing) {
    primaryWorkout = await prisma.workout.update({
      where: { id: existing.id },
      data: {
        date,
        title: 'E2E Endurance Ride',
        source: 'e2e',
        type: 'Ride',
        durationSec: 3600,
        distanceMeters: 32000,
        averageWatts: 180,
        tss: 55
      }
    })
  } else {
    primaryWorkout = await prisma.workout.create({
      data: {
        userId,
        externalId,
        source: 'e2e',
        date,
        title: 'E2E Endurance Ride',
        type: 'Ride',
        durationSec: 3600,
        distanceMeters: 32000,
        averageWatts: 180,
        tss: 55
      }
    })
  }

  // Seed secondary workout
  const runExternalId = 'e2e-fixture-workout-2'
  const runDate = new Date('2026-07-22T08:30:00.000Z')
  const existingRun = await prisma.workout.findFirst({
    where: { userId, externalId: runExternalId }
  })
  if (existingRun) {
    await prisma.workout.update({
      where: { id: existingRun.id },
      data: {
        date: runDate,
        title: 'E2E Tempo Run',
        type: 'Run',
        durationSec: 2400,
        distanceMeters: 8000,
        tss: 42
      }
    })
  } else {
    await prisma.workout.create({
      data: {
        userId,
        externalId: runExternalId,
        source: 'e2e',
        date: runDate,
        title: 'E2E Tempo Run',
        type: 'Run',
        durationSec: 2400,
        distanceMeters: 8000,
        tss: 42
      }
    })
  }

  return primaryWorkout
}

export async function seedE2ePlannedWorkouts(prisma: PrismaClient, userId: string) {
  const today = utcTodayDateOnly()
  const tomorrow = new Date(today.getTime() + 86400000)

  const todayPlannedId = 'e2e-planned-today'
  await prisma.plannedWorkout.upsert({
    where: { id: todayPlannedId },
    update: {
      userId,
      externalId: todayPlannedId,
      date: today,
      title: 'E2E Sweet Spot Intervals',
      type: 'Ride',
      category: 'Workouts',
      durationSec: 3600,
      tss: 65,
      completed: false
    },
    create: {
      id: todayPlannedId,
      userId,
      externalId: todayPlannedId,
      date: today,
      title: 'E2E Sweet Spot Intervals',
      type: 'Ride',
      category: 'Workouts',
      durationSec: 3600,
      tss: 65,
      completed: false
    }
  })

  const tomorrowPlannedId = 'e2e-planned-tomorrow'
  await prisma.plannedWorkout.upsert({
    where: { id: tomorrowPlannedId },
    update: {
      userId,
      externalId: tomorrowPlannedId,
      date: tomorrow,
      title: 'E2E Recovery Jog',
      type: 'Run',
      category: 'Workouts',
      durationSec: 1800,
      tss: 20,
      completed: false
    },
    create: {
      id: tomorrowPlannedId,
      userId,
      externalId: tomorrowPlannedId,
      date: tomorrow,
      title: 'E2E Recovery Jog',
      type: 'Run',
      category: 'Workouts',
      durationSec: 1800,
      tss: 20,
      completed: false
    }
  })
}

export async function seedE2eWellness(prisma: PrismaClient, userId: string) {
  const today = utcTodayDateOnly()

  const existing = await prisma.wellness.findFirst({
    where: { userId, date: today }
  })

  if (existing) {
    return prisma.wellness.update({
      where: { id: existing.id },
      data: {
        hrv: 68,
        restingHr: 52,
        sleepHours: 7.8,
        sleepScore: 85,
        readiness: 88,
        weight: 71.5,
        systolic: 118,
        diastolic: 76
      }
    })
  }

  return prisma.wellness.create({
    data: {
      userId,
      date: today,
      hrv: 68,
      restingHr: 52,
      sleepHours: 7.8,
      sleepScore: 85,
      readiness: 88,
      weight: 71.5,
      systolic: 118,
      diastolic: 76
    }
  })
}

export async function seedE2eChat(prisma: PrismaClient, userId: string) {
  const existingRoom = await prisma.chatRoom.findFirst({
    where: {
      name: 'E2E Test Chat',
      users: { some: { userId } }
    }
  })

  let room = existingRoom
  if (!room) {
    room = await prisma.chatRoom.create({
      data: {
        name: 'E2E Test Chat',
        users: {
          create: { userId }
        }
      }
    })
  }

  const existingMsg = await prisma.chatMessage.findFirst({
    where: { roomId: room.id }
  })

  if (!existingMsg) {
    await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: userId,
        content: 'How should I pace my ride today?'
      }
    })

    await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: 'assistant',
        content:
          'Based on your readiness score of 88 and sweet spot planned session, start warm-up in Zone 2.'
      }
    })
  }

  return room
}

export async function seedE2eData(prisma: PrismaClient) {
  const users = await seedE2eUsers(prisma)
  const mobileApp = await seedE2eMobileOAuthApp(prisma, users.admin.id)
  const softActivation = await seedE2eSoftActivation(prisma, users.athlete.id)
  const usableData = await seedE2eUsableData(prisma, users.athlete.id)
  const todayRecommendation = await seedE2eTodayRecommendation(prisma, users.athlete.id)
  await seedE2ePlannedWorkouts(prisma, users.athlete.id)
  await seedE2eWellness(prisma, users.athlete.id)
  await seedE2eChat(prisma, users.athlete.id)

  return {
    ...users,
    mobileApp,
    softActivation,
    usableData,
    todayRecommendation
  }
}
