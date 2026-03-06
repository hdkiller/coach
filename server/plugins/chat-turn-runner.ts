import { getChatTurnRunner } from '../utils/chat/turn-runner'
import {
  startChatRealtimeSubscription,
  stopChatRealtimeSubscription
} from '../utils/chat-realtime-bus'
import { sendToUserLocal } from '../utils/ws-state'

export default defineNitroPlugin((nitroApp) => {
  const runner = getChatTurnRunner()
  runner.start()
  void startChatRealtimeSubscription(({ userId, data }) => {
    sendToUserLocal(userId, data)
  })

  nitroApp.hooks.hookOnce('close', () => {
    runner.stop()
    void stopChatRealtimeSubscription()
  })
})
