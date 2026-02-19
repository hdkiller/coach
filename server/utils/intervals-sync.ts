import type { Integration } from '@prisma/client'
import { prisma } from './db'
import {
  updateIntervalsPlannedWorkout,
  createIntervalsPlannedWorkout,
  deleteIntervalsPlannedWorkout,
  updateIntervalsEvent,
  createIntervalsEvent,
  deleteIntervalsEvent,
  isIntervalsEventId
} from './intervals'

/**
 * Sync a planned workout to Intervals.icu with retry logic
 * Returns success status and any error messages
 */
export async function syncPlannedWorkoutToIntervals(
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  workoutData: any,
  userId: string
): Promise<{ success: boolean; synced: boolean; message?: string; error?: string; result?: any }> {
  try {
    // Get Intervals.icu integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId,
        provider: 'intervals'
      }
    })

    if (!integration) {
      return {
        success: true,
        synced: false,
        message: 'No Intervals.icu integration found. Saved locally only.'
      }
    }

    // Attempt sync based on operation
    let result: any

    switch (operation) {
      case 'CREATE':
        result = await createIntervalsPlannedWorkout(integration, workoutData)
        break
      case 'UPDATE':
        // If externalId is local (non-numeric), we can't update it on Intervals.
        if (!isIntervalsEventId(workoutData.externalId)) {
          return {
            success: true,
            synced: false,
            message: 'Skipped Intervals sync for local-only workout (non-numeric ID).'
          }
        }
        result = await updateIntervalsPlannedWorkout(
          integration,
          workoutData.externalId,
          workoutData
        )
        break
      case 'DELETE':
        // If externalId is local (non-numeric), it doesn't exist on Intervals.
        if (!isIntervalsEventId(workoutData.externalId)) {
          return {
            success: true,
            synced: false,
            message: 'Local workout deleted locally. Skipped Intervals sync.'
          }
        }
        result = await deleteIntervalsPlannedWorkout(integration, workoutData.externalId)
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    return {
      success: true,
      synced: true,
      result,
      message: 'Synced to Intervals.icu successfully'
    }
  } catch (error: any) {
    console.error(`Failed to sync workout ${operation} to Intervals.icu:`, error.message)

    // Queue for retry
    await queueSyncOperation({
      userId,
      entityType: 'planned_workout',
      entityId: workoutData.id,
      operation,
      payload: workoutData,
      error: error.message
    })

    return {
      success: true,
      synced: false,
      message: 'Saved locally. Will sync to Intervals.icu automatically.',
      error: error.message
    }
  }
}

/**
 * Sync a racing event to Intervals.icu with retry logic
 */
export async function syncEventToIntervals(
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  eventData: any,
  userId: string
): Promise<{ success: boolean; synced: boolean; message?: string; error?: string; result?: any }> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { userId, provider: 'intervals' }
    })

    if (!integration) {
      return {
        success: true,
        synced: false,
        message: 'No Intervals.icu integration found. Saved locally only.'
      }
    }

    let result: any

    switch (operation) {
      case 'CREATE':
        result = await createIntervalsEvent(integration, eventData)
        break
      case 'UPDATE':
        if (!isIntervalsEventId(eventData.externalId)) {
          return {
            success: true,
            synced: false,
            message: 'Skipped sync for local-only event.'
          }
        }
        result = await updateIntervalsEvent(integration, eventData.externalId, eventData)
        break
      case 'DELETE':
        if (!isIntervalsEventId(eventData.externalId)) {
          return {
            success: true,
            synced: false,
            message: 'Local event deleted locally. Skipped sync.'
          }
        }
        result = await deleteIntervalsEvent(integration, eventData.externalId)
        break
    }

    return {
      success: true,
      synced: true,
      result,
      message: 'Synced to Intervals.icu successfully'
    }
  } catch (error: any) {
    console.error(`Failed to sync event ${operation} to Intervals.icu:`, error.message)

    await queueSyncOperation({
      userId,
      entityType: 'racing_event',
      entityId: eventData.id,
      operation,
      payload: eventData,
      error: error.message
    })

    return {
      success: true,
      synced: false,
      message: 'Saved locally. Will sync to Intervals.icu automatically.',
      error: error.message
    }
  }
}

/**
 * Queue a sync operation for later retry
 */
export async function queueSyncOperation(data: {
  userId: string
  entityType: string
  entityId: string
  operation: string
  payload: any
  error?: string
}): Promise<void> {
  try {
    await prisma.syncQueue.create({
      data: {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        operation: data.operation,
        payload: data.payload,
        status: 'PENDING',
        error: data.error,
        attempts: 0
      }
    })
    console.log(`Queued ${data.operation} operation for ${data.entityType} ${data.entityId}`)
  } catch (error) {
    console.error('Failed to queue sync operation:', error)
  }
}

/**
 * Process a single sync queue item
 */
export async function processSyncQueueItem(queueItem: any): Promise<boolean> {
  try {
    // Get integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: queueItem.userId,
        provider: 'intervals'
      }
    })

    if (!integration) {
      // Mark as failed permanently if no integration
      await prisma.syncQueue.update({
        where: { id: queueItem.id },
        data: {
          status: 'FAILED',
          error: 'No Intervals.icu integration found',
          attempts: queueItem.attempts + 1,
          lastAttempt: new Date()
        }
      })
      return false
    }

    // Attempt sync
    const payload = queueItem.payload

    if (queueItem.entityType === 'planned_workout') {
      switch (queueItem.operation) {
        case 'CREATE':
          await createIntervalsPlannedWorkout(integration, payload)
          break
        case 'UPDATE':
          if (isIntervalsEventId(payload.externalId)) {
            await updateIntervalsPlannedWorkout(integration, payload.externalId, payload)
          }
          break
        case 'DELETE':
          if (isIntervalsEventId(payload.externalId)) {
            await deleteIntervalsPlannedWorkout(integration, payload.externalId)
          }
          break
      }
    } else if (queueItem.entityType === 'racing_event') {
      switch (queueItem.operation) {
        case 'CREATE':
          await createIntervalsEvent(integration, payload)
          break
        case 'UPDATE':
          if (isIntervalsEventId(payload.externalId)) {
            await updateIntervalsEvent(integration, payload.externalId, payload)
          }
          break
        case 'DELETE':
          if (isIntervalsEventId(payload.externalId)) {
            await deleteIntervalsEvent(integration, payload.externalId)
          }
          break
      }
    }

    // Mark as completed
    await prisma.syncQueue.update({
      where: { id: queueItem.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        attempts: queueItem.attempts + 1,
        lastAttempt: new Date()
      }
    })

    // Update entity sync status
    if (queueItem.entityType === 'planned_workout') {
      await prisma.plannedWorkout.update({
        where: { id: queueItem.entityId },
        data: {
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          syncError: null
        }
      })
    } else if (queueItem.entityType === 'racing_event') {
      await prisma.event.update({
        where: { id: queueItem.entityId },
        data: {
          syncStatus: 'SYNCED',
          syncError: null
        }
      })
    }

    console.log(`Successfully synced ${queueItem.entityType} ${queueItem.entityId}`)
    return true
  } catch (error: any) {
    console.error(`Failed to process sync queue item ${queueItem.id}:`, error.message)

    // Update failure count
    const newAttempts = queueItem.attempts + 1
    const maxAttempts = 3

    await prisma.syncQueue.update({
      where: { id: queueItem.id },
      data: {
        status: newAttempts >= maxAttempts ? 'FAILED' : 'PENDING',
        error: error.message,
        attempts: newAttempts,
        lastAttempt: new Date()
      }
    })

    // Update entity with error if permanently failed
    if (newAttempts >= maxAttempts) {
      if (queueItem.entityType === 'planned_workout') {
        await prisma.plannedWorkout.update({
          where: { id: queueItem.entityId },
          data: {
            syncStatus: 'FAILED',
            syncError: `Failed after ${maxAttempts} attempts: ${error.message}`
          }
        })
      } else if (queueItem.entityType === 'racing_event') {
        await prisma.event.update({
          where: { id: queueItem.entityId },
          data: {
            syncStatus: 'FAILED',
            syncError: `Failed after ${maxAttempts} attempts: ${error.message}`
          }
        })
      }
    }

    return false
  }
}
