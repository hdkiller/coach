import { prisma } from '../db'
import { CHAT_TURN_STATUS } from './turns'

function getMessageParts(message: any): any[] {
  if (Array.isArray(message?.parts)) return message.parts
  if (Array.isArray(message?.content)) return message.content
  return []
}

export function extractApprovalIdFromToolMessage(message: any): string | null {
  const approvalPart = getMessageParts(message).find(
    (part) => part?.type === 'tool-approval-response'
  )
  if (!approvalPart) return null
  return approvalPart.toolCallId || approvalPart.approvalId || null
}

function approvalResponseMatchesId(part: any, approvalId: string) {
  if (part?.type !== 'tool-approval-response') return false
  return part.toolCallId === approvalId || part.approvalId === approvalId
}

export async function findExistingApprovalResponseMessage(roomId: string, approvalId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId,
      senderId: 'system_tool'
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      turnId: true,
      metadata: true
    }
  })

  for (const message of messages) {
    const toolResponse = (message.metadata as any)?.toolResponse
    if (!Array.isArray(toolResponse)) continue

    if (toolResponse.some((part: any) => approvalResponseMatchesId(part, approvalId))) {
      return message
    }
  }

  return null
}

export async function resolveApprovalOriginLineageId(
  roomId: string,
  messages: any[]
): Promise<string | null> {
  const latestMessage = messages[messages.length - 1]
  const approvalId = extractApprovalIdFromToolMessage(latestMessage)
  if (!approvalId) return null

  for (let index = messages.length - 2; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'assistant') continue

    const matchingPart = getMessageParts(message).find((part: any) => {
      if (!part?.type?.startsWith('tool-')) return false
      const partApprovalId = part?.approval?.id || part?.approvalId || part?.toolCallId
      return partApprovalId === approvalId
    })

    if (!matchingPart || typeof message?.id !== 'string') continue

    const assistantMessage = await prisma.chatMessage.findFirst({
      where: {
        id: message.id,
        roomId
      },
      select: {
        turnId: true
      }
    })

    if (!assistantMessage?.turnId) continue

    const originTurn = await prisma.chatTurn.findUnique({
      where: { id: assistantMessage.turnId },
      select: { lineageId: true }
    })

    if (originTurn?.lineageId) {
      return originTurn.lineageId
    }
  }

  const waitingTurn = await prisma.chatTurn.findFirst({
    where: {
      roomId,
      status: CHAT_TURN_STATUS.WAITING_FOR_TOOLS
    },
    orderBy: { createdAt: 'desc' },
    select: { lineageId: true }
  })

  return waitingTurn?.lineageId || null
}

export async function findTurnForApprovalResponseMessage(message: {
  id: string
  turnId?: string | null
}) {
  if (message.turnId) {
    return await prisma.chatTurn.findUnique({
      where: { id: message.turnId }
    })
  }

  return await prisma.chatTurn.findFirst({
    where: {
      userMessageId: message.id
    },
    orderBy: { createdAt: 'desc' }
  })
}
