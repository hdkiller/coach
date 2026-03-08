import { getChatTurnRunner } from '../utils/chat/turn-runner'
import {
  isRealtimeBusEnabled,
  startRealtimeSubscription,
  stopRealtimeSubscription
} from '../utils/realtime-bus'
import { sendToUserLocal } from '../utils/ws-state'

export default defineNitroPlugin((nitroApp) => {
  const runner = getChatTurnRunner()
  runner.start()
  if (isRealtimeBusEnabled()) {
    void startRealtimeSubscription(({ userId, data }) => {
      sendToUserLocal(userId, data)
    })
  }

  nitroApp.hooks.hookOnce('close', () => {
    runner.stop()
    if (isRealtimeBusEnabled()) {
      void stopRealtimeSubscription()
    }
  })
})
