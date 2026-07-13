export const CHAT_OUTGOING_QUEUE_STORAGE_KEY = 'coach-chat-outgoing-queue'

export function clearChatOutgoingQueue() {
  if (!import.meta.client) return
  sessionStorage.removeItem(CHAT_OUTGOING_QUEUE_STORAGE_KEY)
}
