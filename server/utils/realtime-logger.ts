const REALTIME_DEBUG = process.env.REALTIME_DEBUG === 'true'
const REALTIME_DEBUG_VERBOSE = process.env.REALTIME_DEBUG_VERBOSE === 'true'
const REALTIME_DEBUG_CHANNELS = new Set(
  (process.env.REALTIME_DEBUG_CHANNELS || '')
    .split(',')
    .map((channel) => channel.trim())
    .filter(Boolean)
)

function canLog(channel: string, verbose = false) {
  if (!REALTIME_DEBUG) return false
  if (verbose && !REALTIME_DEBUG_VERBOSE) return false
  if (REALTIME_DEBUG_CHANNELS.size > 0 && !REALTIME_DEBUG_CHANNELS.has(channel)) return false
  return true
}

function redactUserId(userId?: string | null) {
  if (!userId) return undefined
  if (userId.length <= 8) return userId
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`
}

export function logRealtimeEvent(
  channel: string,
  stage: string,
  details: Record<string, unknown> = {},
  options: { verbose?: boolean } = {}
) {
  if (!canLog(channel, options.verbose)) return

  console.info(`[Realtime:${channel}] ${stage}`, {
    ...details,
    userId: redactUserId(typeof details.userId === 'string' ? details.userId : undefined)
  })
}

export function logRealtimeDisabled(reason: string) {
  if (!REALTIME_DEBUG) return
  console.info('[Realtime] disabled', { reason })
}
