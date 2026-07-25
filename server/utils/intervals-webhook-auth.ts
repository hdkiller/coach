import { timingSafeEqual } from 'node:crypto'

export function isValidIntervalsWebhookSecret(received: unknown): boolean {
  const configured = process.env.INTERVALS_WEBHOOK_SECRET
  if (!configured || typeof received !== 'string' || received.length === 0) return false

  const expectedBuffer = Buffer.from(configured)
  const receivedBuffer = Buffer.from(received)
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}
