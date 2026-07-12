import 'dotenv/config'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { getRedisRetryDelay, shouldRecreateRedisConnection } from './redis-connection'

// Connection configuration for DragonflyDB/Redis
const envUrl = process.env.REDIS_URL
const connectionString = envUrl || 'redis://localhost:6379'

let connection: IORedis | null = null

let webhookQueueInstance: Queue | null = null
let pingQueueInstance: Queue | null = null
let streamsQueueInstance: Queue | null = null

// Keep Redis lean: webhook jobs fan out heavily (bulk -> per-event) and otherwise accumulate forever.
export const WEBHOOK_JOB_OPTIONS = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86_400, count: 5000 }
} as const

export const PING_JOB_OPTIONS = {
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 86_400, count: 500 }
} as const

export const STREAM_JOB_OPTIONS = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86_400, count: 2000 }
} as const

function resetQueueInstances() {
  webhookQueueInstance = null
  pingQueueInstance = null
  streamsQueueInstance = null
}

function createConnection() {
  const nextConnection = new IORedis(connectionString, {
    maxRetriesPerRequest: null, // Required by BullMQ
    lazyConnect: true,
    retryStrategy: (times) => getRedisRetryDelay(times)
  })

  nextConnection.on('connect', () => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_REDIS) {
      const options = nextConnection.options
      const hasPassword = !!options.password
      console.log(
        `[Queue] Redis connected to ${options.host}:${options.port} (Password: ${hasPassword ? 'Yes' : 'No'})`
      )
    }
  })

  nextConnection.on('error', (err) => {
    if (!process.env.NITRO_BUILD) {
      console.warn('[Queue] Redis connection warning:', err.message)
    }
  })

  nextConnection.on('end', () => {
    resetQueueInstances()
  })

  return nextConnection
}

export function getRedisConnection() {
  if (!connection || shouldRecreateRedisConnection(connection.status)) {
    connection?.disconnect(false)
    connection = createConnection()
  }

  return connection
}

function getConnection() {
  return getRedisConnection()
}

function getWebhookQueueInstance() {
  const activeConnection = getConnection()
  if (!webhookQueueInstance) {
    webhookQueueInstance = new Queue('webhookQueue', {
      connection: activeConnection as any,
      defaultJobOptions: WEBHOOK_JOB_OPTIONS
    })
  }
  return webhookQueueInstance
}

function getPingQueueInstance() {
  const activeConnection = getConnection()
  if (!pingQueueInstance) {
    pingQueueInstance = new Queue('pingQueue', {
      connection: activeConnection as any,
      defaultJobOptions: PING_JOB_OPTIONS
    })
  }
  return pingQueueInstance
}

function getStreamsQueueInstance() {
  const activeConnection = getConnection()
  if (!streamsQueueInstance) {
    streamsQueueInstance = new Queue('streamsQueue', {
      connection: activeConnection as any,
      defaultJobOptions: STREAM_JOB_OPTIONS
    })
  }
  return streamsQueueInstance
}

export const webhookQueue = new Proxy({} as Queue, {
  get(target, prop, receiver) {
    return Reflect.get(getWebhookQueueInstance(), prop, receiver)
  }
})

export const pingQueue = new Proxy({} as Queue, {
  get(target, prop, receiver) {
    return Reflect.get(getPingQueueInstance(), prop, receiver)
  }
})

export const streamsQueue = new Proxy({} as Queue, {
  get(target, prop, receiver) {
    return Reflect.get(getStreamsQueueInstance(), prop, receiver)
  }
})
