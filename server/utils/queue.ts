import 'dotenv/config'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// Connection configuration for DragonflyDB/Redis
const envUrl = process.env.REDIS_URL
const connectionString = envUrl || 'redis://localhost:6379'

// Create a Redis connection instance with lazyConnect to prevent automatic connection during build
const connection = new IORedis(connectionString, {
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true
})

// Redis Connection Logging
connection.on('connect', () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_REDIS) {
    const options = connection.options
    const hasPassword = !!options.password
    console.log(
      `[Queue] Redis connected to ${options.host}:${options.port} (Password: ${hasPassword ? 'Yes' : 'No'})`
    )
  }
})

connection.on('error', (err) => {
  // During build we might get connection errors if Redis isn't running, but we don't want to crash
  // We only log if it's not a build environment or if it's a real error during runtime
  if (!process.env.NITRO_BUILD) {
    console.warn('[Queue] Redis connection warning:', err.message)
  }
})

export const webhookQueue = new Queue('webhookQueue', { connection })
export const pingQueue = new Queue('pingQueue', { connection })
