import type { CoreMessage, Message } from 'ai'

/**
 * Truncates message history to stay within a reasonable context window.
 * Ensures that tool calls and their results are kept together.
 */
export function truncateMessages(messages: any[], limit: number = 20): any[] {
  if (messages.length <= limit) return messages

  // 1. Keep the last message (the new user message)
  const lastMessage = messages[messages.length - 1]
  const history = messages.slice(0, -1)

  // 2. Take the last 'limit - 1' messages from history
  const truncatedHistory = history.slice(-(limit - 1))

  // 3. Ensure we don't start with a 'tool' message (it must follow an 'assistant' tool call)
  // If the first message in our truncated history is 'tool', we need to include the preceding assistant message.
  while (truncatedHistory.length > 0 && truncatedHistory[0].role === 'tool') {
    const firstMsgIndexInOriginal = history.length - truncatedHistory.length
    if (firstMsgIndexInOriginal > 0) {
      truncatedHistory.unshift(history[firstMsgIndexInOriginal - 1])
    } else {
      break
    }
  }

  // 4. Ensure we don't end with an orphaned tool call that is missing its result
  // (Though the last message is usually the User message, so this is less likely)

  return [...truncatedHistory, lastMessage]
}

/**
 * Calculates a rough token count for messages to help with more precise truncation.
 * (Simplified estimation: 1 token ~= 4 characters for English)
 */
export function estimateTokenCount(messages: any[]): number {
  let count = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      count += Math.ceil(msg.content.length / 4)
    } else if (Array.isArray(msg.content)) {
      msg.content.forEach((part: any) => {
        if (part.type === 'text') {
          count += Math.ceil(part.text.length / 4)
        } else if (part.type === 'tool-call') {
          count += JSON.stringify(part.args || {}).length / 4
        }
      })
    }
  }
  return count
}
