import { createError } from 'h3'
import type { H3Event } from 'h3'
import { prisma } from '../db'
import { logAction } from '../audit'

interface AccountDeactivationActor {
  id: string
  email?: string | null
}

interface DeactivateAccountOptions {
  userId: string
  actor: AccountDeactivationActor
  reason?: string | null
  event?: H3Event
}

interface ReactivateAccountOptions {
  userId: string
  actor: AccountDeactivationActor
  event?: H3Event
}

export async function deactivateAccount(options: DeactivateAccountOptions) {
  const { userId, actor, reason, event } = options

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      deactivatedAt: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  if (user.deactivatedAt) {
    return {
      success: true,
      alreadyDeactivated: true,
      deactivatedAt: user.deactivatedAt,
      message: 'Account already deactivated'
    }
  }

  const deactivatedAt = new Date()

  await prisma.user.update({
    where: { id: userId },
    data: {
      deactivatedAt,
      deactivationReason: reason?.trim() || null
    }
  })

  // Invalidate all credential material so pre-existing tokens/keys cannot be reused.
  await prisma.session.deleteMany({
    where: { userId }
  })
  await prisma.oAuthToken.deleteMany({
    where: { userId }
  })
  await prisma.oAuthAuthCode.deleteMany({
    where: { userId }
  })
  await prisma.apiKey.deleteMany({
    where: { userId }
  })

  await logAction({
    userId,
    action: 'ADMIN_USER_ACCOUNT_DEACTIVATED',
    resourceType: 'User',
    resourceId: userId,
    metadata: {
      actorUserId: actor.id,
      actorEmail: actor.email || null,
      reason: reason?.trim() || null,
      deactivatedAt: deactivatedAt.toISOString()
    },
    event
  })

  return {
    success: true,
    deactivatedAt,
    message: 'Account deactivated'
  }
}

export async function reactivateAccount(options: ReactivateAccountOptions) {
  const { userId, actor, event } = options

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      deactivatedAt: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  if (!user.deactivatedAt) {
    return {
      success: true,
      alreadyActive: true,
      message: 'Account already active'
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      deactivatedAt: null,
      deactivationReason: null
    }
  })

  await logAction({
    userId,
    action: 'ADMIN_USER_ACCOUNT_REACTIVATED',
    resourceType: 'User',
    resourceId: userId,
    metadata: {
      actorUserId: actor.id,
      actorEmail: actor.email || null
    },
    event
  })

  return {
    success: true,
    message: 'Account reactivated'
  }
}
