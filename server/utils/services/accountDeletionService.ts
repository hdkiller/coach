import { tasks } from '@trigger.dev/sdk/v3'
import { createError } from 'h3'
import { prisma } from '../db'
import { logAction } from '../audit'
import type { H3Event } from 'h3'

type DeletionActorType = 'self' | 'admin'

interface ScheduleAccountDeletionOptions {
  userId: string
  actor: {
    type: DeletionActorType
    id: string
    email?: string | null
  }
  event?: H3Event
}

export async function scheduleAccountDeletion(options: ScheduleAccountDeletionOptions) {
  const { userId, actor, event } = options

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const handle = await tasks.trigger(
    'delete-user-account',
    {
      userId,
      notificationEmail: {
        requestedAt: new Date().toISOString(),
        initiatedBy: actor.type,
        actorEmail: actor.type === 'admin' ? actor.email || null : null
      }
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  await logAction({
    userId,
    action:
      actor.type === 'admin'
        ? 'ADMIN_USER_ACCOUNT_DELETION_REQUESTED'
        : 'USER_ACCOUNT_DELETION_REQUESTED',
    resourceType: 'User',
    resourceId: userId,
    metadata: {
      jobId: handle.id,
      initiatedBy: actor.type,
      actorUserId: actor.id,
      actorEmail: actor.email || null
    },
    event
  })

  try {
    await prisma.session.deleteMany({
      where: { userId }
    })
  } catch (error) {
    console.error('Failed to clear sessions immediately', { userId, error })
  }

  return {
    success: true,
    jobId: handle.id,
    message: 'Account scheduled for deletion'
  }
}
