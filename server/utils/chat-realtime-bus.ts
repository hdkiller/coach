import { randomUUID } from 'node:crypto'
import IORedis from 'ioredis'

type ChatRealtimeEnvelope = {
  originInstanceId: string
  userId: string
  data: any
}

const CHAT_REALTIME_CHANNEL = 'chat:realtime'
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const INSTANCE_ID = process.env.HOSTNAME || randomUUID()

let publisher: IORedis | null = null
let subscriber: IORedis | null = null
let subscriberHandler: ((channel: string, payload: string) => void) | null = null
let subscriptionPromise: Promise<void> | null = null

function createRedisClient(name: string) {
  const client = new IORedis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null
  })

  client.on('error', (error) => {
    if (!process.env.NITRO_BUILD) {
      console.warn(`[ChatRealtimeBus] ${name} redis error:`, error.message)
    }
  })

  return client
}

async function ensureConnected(client: IORedis) {
  if (client.status === 'wait') {
    await client.connect()
  }
}

async function getPublisher() {
  if (!publisher) {
    publisher = createRedisClient('publisher')
  }

  await ensureConnected(publisher)
  return publisher
}

async function getSubscriber() {
  if (!subscriber) {
    subscriber = createRedisClient('subscriber')
  }

  await ensureConnected(subscriber)
  return subscriber
}

export async function publishChatRealtimeEvent(userId: string, data: any) {
  try {
    const client = await getPublisher()
    const envelope: ChatRealtimeEnvelope = {
      originInstanceId: INSTANCE_ID,
      userId,
      data
    }
    await client.publish(CHAT_REALTIME_CHANNEL, JSON.stringify(envelope))
  } catch (error: any) {
    console.warn('[ChatRealtimeBus] Failed to publish realtime event:', error?.message || error)
  }
}

export async function startChatRealtimeSubscription(
  onEvent: (event: { userId: string; data: any }) => void
) {
  if (subscriptionPromise) {
    return subscriptionPromise
  }

  subscriptionPromise = (async () => {
    const client = await getSubscriber()

    if (!subscriberHandler) {
      subscriberHandler = (channel: string, payload: string) => {
        if (channel !== CHAT_REALTIME_CHANNEL) return

        try {
          const envelope = JSON.parse(payload) as ChatRealtimeEnvelope
          if (!envelope?.userId || envelope.originInstanceId === INSTANCE_ID) {
            return
          }

          onEvent({
            userId: envelope.userId,
            data: envelope.data
          })
        } catch (error) {
          console.warn('[ChatRealtimeBus] Failed to parse realtime event payload')
        }
      }

      client.on('message', subscriberHandler)
    }

    await client.subscribe(CHAT_REALTIME_CHANNEL)
  })().catch((error) => {
    subscriptionPromise = null
    console.warn('[ChatRealtimeBus] Failed to subscribe:', error?.message || error)
  })

  return subscriptionPromise
}

export async function stopChatRealtimeSubscription() {
  try {
    if (subscriber) {
      if (subscriberHandler) {
        subscriber.off('message', subscriberHandler)
        subscriberHandler = null
      }
      await subscriber.unsubscribe(CHAT_REALTIME_CHANNEL).catch(() => null)
      await subscriber.quit().catch(() => subscriber?.disconnect())
      subscriber = null
    }

    if (publisher) {
      await publisher.quit().catch(() => publisher?.disconnect())
      publisher = null
    }
  } finally {
    subscriptionPromise = null
  }
}
