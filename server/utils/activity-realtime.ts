import { sendToUser } from './ws-state'

export type ActivityRealtimeEvent = {
  scope: 'activity' | 'calendar'
  entityType: 'workout' | 'planned_workout' | 'calendar_note' | 'bulk'
  entityId?: string
  reason:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'linked'
    | 'completed'
    | 'moved'
    | 'synced'
    | 'bulk_changed'
  occurredAt?: string
}

export async function publishActivityEvent(userId: string, event: ActivityRealtimeEvent) {
  await sendToUser(userId, {
    type: 'domain_event',
    channel: 'activity',
    event: {
      ...event,
      occurredAt: event.occurredAt || new Date().toISOString()
    }
  })
}
