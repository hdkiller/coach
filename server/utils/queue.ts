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

function resetQueueInstances() {
  webhookQueueInstance = null
  pingQueueInstance = null
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

function getConnection() {
  if (!connection || shouldRecreateRedisConnection(connection.status)) {
    connection?.disconnect(false)
    connection = createConnection()
  }

  return connection
}

function getWebhookQueueInstance() {
  const activeConnection = getConnection()
  if (!webhookQueueInstance) {
    webhookQueueInstance = new Queue('webhookQueue', { connection: activeConnection as any })
  }
  return webhookQueueInstance
}

function getPingQueueInstance() {
  const activeConnection = getConnection()
  if (!pingQueueInstance) {
    pingQueueInstance = new Queue('pingQueue', { connection: activeConnection as any })
  }
  return pingQueueInstance
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
