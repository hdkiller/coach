<script setup lang="ts">
  import {
    ref,
    computed,
    onMounted,
    onBeforeUnmount,
    defineAsyncComponent,
    watch,
    nextTick
  } from 'vue'
  import { useTranslate } from '@tolgee/vue'
  import { Chat } from '@ai-sdk/vue'
  import { DefaultChatTransport } from 'ai'
  import ChatSidebar from '~/components/chat/ChatSidebar.vue'
  import ChatMessageList from '~/components/chat/ChatMessageList.vue'
  import ChatInput from '~/components/chat/ChatInput.vue'
  import { shouldHideAssistantBubble } from '~/utils/chat-message-state'

  const { t } = useTranslate('chat')

  const DashboardTriggerMonitorButton = defineAsyncComponent(
    () => import('~/components/dashboard/TriggerMonitorButton.vue')
  )

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'AI Chat Coach',
    meta: [
      {
        name: 'description',
        content:
          'Chat with your AI endurance coach to analyze your training, ask questions, and get personalized advice.'
      }
    ]
  })

  // State
  const currentRoomId = ref('')
  const loadingMessages = ref(true)
  const rooms = ref<any[]>([])
  const loadingRooms = ref(true)
  const isRoomListOpen = ref(false)
  const input = ref('')
  const chatInputRef = ref<any>(null)
  const toast = useToast()
  const editingMessage = ref<any | null>(null)
  const editingContent = ref('')
  const savingEditedMessage = ref(false)
  const chatViewportHeight = ref('100dvh')
  let visualViewportListener: (() => void) | null = null
  let previousDocumentOverflow = ''
  let previousBodyOverflow = ''
  let turnPollingTimer: ReturnType<typeof setInterval> | null = null
  let turnPollingGraceUntil = 0
  let chatWs: WebSocket | null = null
  let chatWsReconnectTimer: ReturnType<typeof setTimeout> | null = null
  let chatWsPingTimer: ReturnType<typeof setInterval> | null = null
  const slowTurnNoticeIds = new Set<string>()
  const queueReconcileTimersByRoom: Record<string, ReturnType<typeof setTimeout> | undefined> = {}
  const terminalSyncTimersByRoom: Record<string, ReturnType<typeof setTimeout> | undefined> = {}
  const approvalSyncTimersByRoom: Record<string, ReturnType<typeof setInterval> | undefined> = {}
  const loadMessagesInFlight: Record<string, boolean> = {}
  const loadMessagesPending: Record<string, boolean> = {}
  const isRealtimeConnected = ref(false)
  const lastChatRealtimeEventAt = ref(0)
  const awaitingTurnStart = ref(false)
  type QueuedAttachment = {
    url: string
    mediaType: string
    filename?: string
  }
  type QueuedOutgoingMessage = {
    id: string
    roomId: string
    text: string
    attachments: QueuedAttachment[]
    createdAt: Date
  }
  type ChatRoomStateSnapshot = {
    latestMessageId: string | null
    latestMessageCreatedAt: string | null
    latestMessageUpdatedAt: string | null
    latestMessageSenderId: string | null
    activeTurnId: string | null
    activeTurnStatus: string | null
    activeTurnUpdatedAt: string | null
    hasAssistantMessage: boolean
  }
  const queuedOutgoingByRoom = ref<Record<string, QueuedOutgoingMessage[]>>({})
  const queueDispatchInFlightByRoom = ref<Record<string, boolean>>({})
  const roomStateSignaturesByRoom = ref<Record<string, string>>({})

  // Fetch session
  const { data: session } = await useFetch('/api/auth/session')

  const { refresh: refreshRuns } = useUserRuns()
  const upgradeModal = useUpgradeModal()
  const { trackChatSessionStart, trackChatError } = useAnalytics()

  const route = useRoute()
  const router = useRouter()

  // Initialize Chat class
  const chat = new Chat({
    transport: new DefaultChatTransport({
      api: '/api/chat/messages',
      body: () => ({
        roomId: currentRoomId.value
      })
    }),
    onFinish: async () => {
      refreshRuns()
      if (currentRoomId.value) {
        await loadMessages(currentRoomId.value, { silent: true })
        restartTurnPolling({ forceForMs: 15000 })
        void processQueuedMessagesForRoom(currentRoomId.value)
      }
    },
    onError: (error) => {
      // Always unblock the input — the turn is over whether it errored or not
      awaitingTurnStart.value = false

      // Track chat error
      trackChatError(error.message || 'unknown')

      // Handle Quota Exceeded (429)
      if (
        error.message?.includes('429') ||
        error.message?.toLowerCase().includes('quota exceeded')
      ) {
        upgradeModal.show({
          title: 'Unlock More Insights Today',
          featureTitle: 'Full AI Coach Access',
          featureDescription:
            'You have utilized your daily training analysis. To continue planning your peak performance without limits, upgrade to Pro for unrestricted access to your Digital Coach.',

          recommendedTier: 'pro',
          bullets: [
            'Unlimited Strategic Chat',
            'Faster AI Responses',
            'Deep-Context Analysis',
            'Proactive Readiness Alerts'
          ]
        })

        return
      }

      if (error.message && error.message.includes('No tool invocation found')) {
        console.warn(
          '[Chat] Suppressing expected tool invocation error. Refreshing chat to get response.'
        )
        // The backend executed successfully, but the frontend stream parser got confused.
        // We can just reload the messages to show the result.
        setTimeout(() => {
          if (currentRoomId.value) loadMessages(currentRoomId.value)
        }, 1000)
        return
      }
      console.error('[Chat] onError triggered:', error)
      console.error('[Chat] Error Stack:', error.stack)
    }
  })

  const sanitizeDisplayMessage = (message: any) => {
    const sanitizeText = (value: unknown) => {
      if (typeof value !== 'string') return ''
      return /^(undefined)+$/.test(value) ? '' : value
    }

    const parts = Array.isArray(message?.parts)
      ? message.parts
          .map((part: any) =>
            part?.type === 'text'
              ? {
                  ...part,
                  text: sanitizeText(part.text)
                }
              : part
          )
          .filter((part: any) => part?.type !== 'text' || part.text)
      : []

    const sanitizedContent = sanitizeText(message?.content)
    const hasMeaningfulText = sanitizedContent.trim().length > 0
    const hasRenderableParts = parts.length > 0

    if (
      message?.role === 'assistant' &&
      !message?.metadata?.turnId &&
      !hasMeaningfulText &&
      !hasRenderableParts
    ) {
      return null
    }

    return {
      ...message,
      content: sanitizedContent,
      parts
    }
  }
  const chatStatus = computed(() => chat.status)
  const activeTurnStatuses = ['RECEIVED', 'QUEUED', 'RUNNING', 'STREAMING', 'WAITING_FOR_TOOLS']
  const terminalTurnStatuses = ['COMPLETED', 'FAILED', 'INTERRUPTED', 'CANCELLED']
  const getLatestAssistantMessage = (
    messages: any[],
    options: {
      includeHidden?: boolean
    } = {}
  ) =>
    [...messages]
      .reverse()
      .find(
        (message) =>
          message?.role === 'assistant' &&
          !message?.metadata?.syntheticTyping &&
          (options.includeHidden !== false || !shouldHideAssistantBubble(message))
      )
  const hasActiveTurn = (messages: any[]) =>
    activeTurnStatuses.includes(
      getLatestAssistantMessage(messages, { includeHidden: true })?.metadata?.turnStatus
    )
  const getQueuedOutgoingMessages = (roomId: string) =>
    roomId ? queuedOutgoingByRoom.value[roomId] || [] : []
  const queuedOutgoingMessages = computed(() => getQueuedOutgoingMessages(currentRoomId.value))
  const queuedMessageCount = computed(() => queuedOutgoingMessages.value.length)
  const serializeRoomState = (state: ChatRoomStateSnapshot | null | undefined) =>
    JSON.stringify(state || null)
  const setRoomStateSignature = (roomId: string, signature: string) => {
    roomStateSignaturesByRoom.value = {
      ...roomStateSignaturesByRoom.value,
      [roomId]: signature
    }
  }
  const getRoomStateSignature = (roomId: string) =>
    roomId ? roomStateSignaturesByRoom.value[roomId] || '' : ''
  const buildRoomStateFromMessages = (messages: any[]): ChatRoomStateSnapshot => {
    const latestUpdatedMessage = [...messages].sort(
      (left, right) =>
        new Date(
          right?.updatedAt || right?.metadata?.updatedAt || right?.createdAt || 0
        ).getTime() -
        new Date(left?.updatedAt || left?.metadata?.updatedAt || left?.createdAt || 0).getTime()
    )[0]
    const activeAssistantTurn = [...messages]
      .reverse()
      .find((message) => activeTurnStatuses.includes(String(message?.metadata?.turnStatus || '')))

    return {
      latestMessageId: latestUpdatedMessage?.id || null,
      latestMessageCreatedAt: latestUpdatedMessage?.createdAt
        ? new Date(latestUpdatedMessage.createdAt).toISOString()
        : null,
      latestMessageUpdatedAt:
        latestUpdatedMessage?.updatedAt || latestUpdatedMessage?.metadata?.updatedAt || null,
      latestMessageSenderId: latestUpdatedMessage?.metadata?.senderId || null,
      activeTurnId: activeAssistantTurn?.metadata?.turnId || null,
      activeTurnStatus: activeAssistantTurn?.metadata?.turnStatus || null,
      activeTurnUpdatedAt: activeAssistantTurn?.metadata?.updatedAt || null,
      hasAssistantMessage: messages.some((message) => message?.role === 'assistant')
    }
  }
  const buildMessageParts = (text: string, attachments: QueuedAttachment[]) => {
    const parts: Array<Record<string, any>> = []

    if (text.trim()) {
      parts.push({ type: 'text', text })
    }

    attachments.forEach((attachment) => {
      if (!attachment?.url || !attachment?.mediaType) return
      parts.push({
        type: 'file',
        url: attachment.url,
        mediaType: attachment.mediaType,
        filename: attachment.filename
      })
    })

    return parts
  }
  const setQueuedOutgoingMessages = (roomId: string, messages: QueuedOutgoingMessage[]) => {
    queuedOutgoingByRoom.value = {
      ...queuedOutgoingByRoom.value,
      [roomId]: messages
    }
  }
  const enqueueOutgoingMessage = (message: QueuedOutgoingMessage) => {
    setQueuedOutgoingMessages(message.roomId, [
      ...getQueuedOutgoingMessages(message.roomId),
      message
    ])
  }
  const removeQueuedOutgoingMessage = (roomId: string, messageId: string) => {
    setQueuedOutgoingMessages(
      roomId,
      getQueuedOutgoingMessages(roomId).filter((message) => message.id !== messageId)
    )
  }
  const setQueueDispatchInFlight = (roomId: string, inFlight: boolean) => {
    queueDispatchInFlightByRoom.value = {
      ...queueDispatchInFlightByRoom.value,
      [roomId]: inFlight
    }
  }
  const clearQueueReconcileTimer = (roomId: string) => {
    const timer = queueReconcileTimersByRoom[roomId]
    if (!timer) return
    clearTimeout(timer)
    queueReconcileTimersByRoom[roomId] = undefined
  }
  const clearTerminalSyncTimer = (roomId: string) => {
    const timer = terminalSyncTimersByRoom[roomId]
    if (!timer) return
    clearTimeout(timer)
    terminalSyncTimersByRoom[roomId] = undefined
  }
  const clearApprovalSyncTimer = (roomId: string) => {
    const timer = approvalSyncTimersByRoom[roomId]
    if (!timer) return
    clearInterval(timer)
    approvalSyncTimersByRoom[roomId] = undefined
  }
  const getLatestAssistantTurnTimestamp = () => {
    const latestAssistant = [...((chat.messages as any[]) || [])]
      .reverse()
      .find((message) => message?.role === 'assistant' && !message?.metadata?.syntheticTyping)

    const rawTimestamp =
      latestAssistant?.updatedAt ||
      latestAssistant?.metadata?.updatedAt ||
      latestAssistant?.createdAt ||
      null

    const timestampMs = rawTimestamp ? new Date(rawTimestamp).getTime() : 0
    return Number.isFinite(timestampMs) ? timestampMs : 0
  }
  const startApprovalSync = (roomId: string, approvalSubmittedAtMs: number) => {
    if (!roomId || roomId !== currentRoomId.value) return

    clearApprovalSyncTimer(roomId)

    const startedAtMs = Date.now()
    approvalSyncTimersByRoom[roomId] = setInterval(async () => {
      if (!currentRoomId.value || roomId !== currentRoomId.value) {
        clearApprovalSyncTimer(roomId)
        return
      }

      await loadMessages(roomId, { silent: true })

      const latestAssistantTimestampMs = getLatestAssistantTurnTimestamp()
      const hasFreshAssistantMessage = latestAssistantTimestampMs > approvalSubmittedAtMs
      const turnStillActive =
        awaitingTurnStart.value || hasActiveTurn((chat.messages as any[]) || [])

      if (hasFreshAssistantMessage && !turnStillActive) {
        clearApprovalSyncTimer(roomId)
        return
      }

      if (Date.now() - startedAtMs >= 15000) {
        clearApprovalSyncTimer(roomId)
      }
    }, 1200)
  }
  const scheduleTerminalMessageSync = (roomId?: string, delayMs = 150) => {
    if (!roomId || roomId !== currentRoomId.value) return
    clearTerminalSyncTimer(roomId)
    terminalSyncTimersByRoom[roomId] = setTimeout(() => {
      terminalSyncTimersByRoom[roomId] = undefined
      void loadMessages(roomId, { silent: true })
    }, delayMs)
  }
  const scheduleQueueReconcile = (roomId: string, delayMs = 12000) => {
    if (!roomId) return
    clearQueueReconcileTimer(roomId)
    queueReconcileTimersByRoom[roomId] = setTimeout(() => {
      queueReconcileTimersByRoom[roomId] = undefined
      if (!currentRoomId.value || roomId !== currentRoomId.value) return
      void loadMessages(roomId, { silent: true })
    }, delayMs)
  }
  const sendOutgoingMessage = async (message: {
    text: string
    attachments: QueuedAttachment[]
  }) => {
    const parts = buildMessageParts(message.text, message.attachments)
    await Promise.resolve(
      (chat as any).sendMessage(
        parts.length > 0
          ? {
              role: 'user',
              parts
            }
          : {
              text: message.text
            }
      )
    )
    awaitingTurnStart.value = true
    restartTurnPolling({ forceForMs: 15000 })
  }
  const processQueuedMessagesForRoom = async (roomId: string) => {
    if (!roomId || roomId !== currentRoomId.value) return
    if (queueDispatchInFlightByRoom.value[roomId]) return
    if (awaitingTurnStart.value || hasActiveTurn(chat.messages as any[])) return

    const nextQueuedMessage = getQueuedOutgoingMessages(roomId)[0]
    if (!nextQueuedMessage) return

    setQueueDispatchInFlight(roomId, true)

    try {
      await sendOutgoingMessage({
        text: nextQueuedMessage.text,
        attachments: nextQueuedMessage.attachments
      })
      removeQueuedOutgoingMessage(roomId, nextQueuedMessage.id)
      scheduleQueueReconcile(roomId)
    } catch (error: any) {
      // Remove the failing message so it doesn't block the queue indefinitely
      removeQueuedOutgoingMessage(roomId, nextQueuedMessage.id)
      toast.add({
        title: 'Message failed to send',
        description: error?.message || 'Could not send the queued message. Please try again.',
        color: 'error'
      })
    } finally {
      setQueueDispatchInFlight(roomId, false)
    }
  }
  const chatMessages = computed(() => {
    const sanitizedMessages = (chat.messages as any[])
      .map((message) => sanitizeDisplayMessage(message))
      .filter(Boolean) as any[]
    const queuedMessages = queuedOutgoingMessages.value.map((message) => ({
      id: message.id,
      role: 'user',
      content: message.text,
      parts: buildMessageParts(message.text, message.attachments),
      createdAt: message.createdAt,
      metadata: {
        localOnly: true,
        localQueueState: 'QUEUED'
      }
    }))
    const combinedMessages = [...sanitizedMessages, ...queuedMessages].sort(
      (left, right) =>
        new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
    )
    const hasVisibleActiveAssistant = activeTurnStatuses.includes(
      getLatestAssistantMessage(combinedMessages, { includeHidden: false })?.metadata?.turnStatus
    )
    const needsTypingPlaceholder =
      awaitingTurnStart.value ||
      (hasActiveTurn(chat.messages as any[]) && !hasVisibleActiveAssistant)

    if (!needsTypingPlaceholder) {
      return combinedMessages
    }

    return [
      ...combinedMessages,
      {
        id: `typing-${currentRoomId.value || 'room'}`,
        role: 'assistant',
        content: '',
        parts: [],
        createdAt: new Date(),
        metadata: {
          syntheticTyping: true,
          turnStatus: 'STREAMING'
        }
      }
    ]
  })
  const areMessageListsEquivalent = (left: any[], right: any[]) => {
    if (left.length !== right.length) return false

    for (let index = 0; index < left.length; index += 1) {
      const leftMessage = left[index]
      const rightMessage = right[index]

      if (
        leftMessage?.id !== rightMessage?.id ||
        leftMessage?.role !== rightMessage?.role ||
        leftMessage?.content !== rightMessage?.content ||
        String(leftMessage?.createdAt || '') !== String(rightMessage?.createdAt || '')
      ) {
        return false
      }

      if (
        JSON.stringify(leftMessage?.metadata || {}) !== JSON.stringify(rightMessage?.metadata || {})
      ) {
        return false
      }
    }

    return true
  }
  const transformStoredMessage = (msg: any) => {
    let parts: any[] = msg.parts || [{ type: 'text', text: msg.content }]

    // Synthesize tool-approval-request parts from pending approvals stored in metadata.
    // These are tool calls blocked server-side by needsApproval() that the client needs
    // to render as approval UI. Without this, WebSocket-delivered messages never have
    // the part state that ChatMessageContent.vue requires to show ChatToolApproval.
    const pendingApprovals: any[] = msg.metadata?.pendingApprovals || []
    if (pendingApprovals.length > 0) {
      const existingApprovalIds = new Set(
        parts
          .filter(
            (p: any) =>
              p.type === 'tool-approval-request' ||
              (p?.type?.startsWith('tool-') && p?.state === 'approval-requested')
          )
          .map((p: any) => p.approvalId || p.approval?.id || p.toolCallId)
          .filter(Boolean)
      )
      const approvalParts = pendingApprovals
        .filter((a: any) => !existingApprovalIds.has(a.toolCallId))
        .map((a: any) => ({
          type: 'tool-approval-request',
          approvalId: a.toolCallId,
          toolCall: {
            toolName: a.toolName,
            args: a.args
          }
        }))
      if (approvalParts.length > 0) {
        parts = [...parts, ...approvalParts]
      }
    }

    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      parts,
      createdAt: new Date(msg.createdAt || msg.metadata?.createdAt || Date.now()),
      metadata: msg.metadata
    }
  }
  const applyAssistantTextDelta = (event: {
    roomId: string
    turnId: string
    messageId: string
    textDelta: string
    status?: string
  }) => {
    if (!event.textDelta || event.roomId !== currentRoomId.value) return
    awaitingTurnStart.value = false

    const existingMessages = [...(chat.messages as any[])]
    const existingIndex = existingMessages.findIndex((entry) => entry?.id === event.messageId)

    if (existingIndex >= 0) {
      const existingMessage = existingMessages[existingIndex]
      const existingParts = Array.isArray(existingMessage?.parts) ? existingMessage.parts : []
      const nonTextParts = existingParts.filter((part: any) => part?.type !== 'text')
      const nextText = `${typeof existingMessage?.content === 'string' ? existingMessage.content : ''}${event.textDelta}`
      const nextMessages = [...existingMessages]
      nextMessages[existingIndex] = {
        ...existingMessage,
        content: nextText,
        parts: [
          ...nonTextParts,
          {
            type: 'text',
            text: nextText
          }
        ],
        metadata: {
          ...(existingMessage?.metadata || {}),
          turnId: event.turnId,
          turnStatus: event.status || 'STREAMING'
        }
      }
      chat.messages = nextMessages as any
      return
    }

    chat.messages = [
      ...existingMessages,
      {
        id: event.messageId,
        role: 'assistant',
        content: event.textDelta,
        parts: [{ type: 'text', text: event.textDelta }],
        createdAt: new Date(),
        metadata: {
          turnId: event.turnId,
          turnStatus: event.status || 'STREAMING',
          isDraft: true,
          isRealtimeDraft: true
        }
      }
    ] as any
  }
  const mergeRealtimeMessage = (existingMessage: any, incomingMessage: any) => {
    const existingStatus = existingMessage?.metadata?.turnStatus
    const incomingStatus = incomingMessage?.metadata?.turnStatus
    const existingParts = Array.isArray(existingMessage?.parts) ? existingMessage.parts : []
    const incomingParts = Array.isArray(incomingMessage?.parts) ? incomingMessage.parts : []
    const existingNonTextParts = existingParts.filter((part: any) => part?.type !== 'text')
    const incomingHasNonTextParts = incomingParts.some((part: any) => part?.type !== 'text')

    if (!incomingHasNonTextParts && existingNonTextParts.length > 0) {
      const incomingTextPart = incomingParts.find((part: any) => part?.type === 'text')
      incomingMessage = {
        ...incomingMessage,
        parts: [
          ...existingNonTextParts,
          ...(incomingTextPart
            ? [incomingTextPart]
            : typeof incomingMessage?.content === 'string'
              ? [{ type: 'text', text: incomingMessage.content }]
              : [])
        ],
        metadata: {
          ...(existingMessage?.metadata || {}),
          ...(incomingMessage?.metadata || {}),
          toolCalls:
            incomingMessage?.metadata?.toolCalls || existingMessage?.metadata?.toolCalls || [],
          toolResults:
            incomingMessage?.metadata?.toolResults || existingMessage?.metadata?.toolResults || []
        }
      }
    }

    if (
      terminalTurnStatuses.includes(existingStatus) &&
      activeTurnStatuses.includes(incomingStatus)
    ) {
      return {
        ...incomingMessage,
        content:
          typeof existingMessage?.content === 'string' && existingMessage.content.trim()
            ? existingMessage.content
            : incomingMessage.content,
        parts:
          Array.isArray(existingMessage?.parts) && existingMessage.parts.length > 0
            ? existingMessage.parts
            : incomingMessage.parts,
        metadata: {
          ...(incomingMessage?.metadata || {}),
          ...(existingMessage?.metadata || {}),
          turnStatus: existingStatus
        }
      }
    }

    return incomingMessage
  }
  const upsertChatMessage = (message: any) => {
    const transformedMessage = transformStoredMessage(message)
    if (
      transformedMessage?.role === 'assistant' ||
      activeTurnStatuses.includes(transformedMessage?.metadata?.turnStatus)
    ) {
      awaitingTurnStart.value = false
    }
    const existingMessages = [...(chat.messages as any[])]
    const existingIndex = existingMessages.findIndex((entry) => entry?.id === transformedMessage.id)

    if (existingIndex >= 0) {
      const nextMessages = [...existingMessages]
      nextMessages[existingIndex] = mergeRealtimeMessage(
        existingMessages[existingIndex],
        transformedMessage
      )
      if (!areMessageListsEquivalent(existingMessages, nextMessages)) {
        chat.messages = nextMessages as any
      }
      if (
        transformedMessage?.role === 'assistant' &&
        terminalTurnStatuses.includes(transformedMessage?.metadata?.turnStatus)
      ) {
        scheduleTerminalMessageSync(currentRoomId.value)
        clearQueueReconcileTimer(currentRoomId.value)
        void processQueuedMessagesForRoom(currentRoomId.value)
      }
      return
    }

    const nextMessages = [...existingMessages, transformedMessage].sort(
      (left, right) =>
        new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
    )
    chat.messages = nextMessages as any

    if (
      transformedMessage?.role === 'assistant' &&
      terminalTurnStatuses.includes(transformedMessage?.metadata?.turnStatus)
    ) {
      scheduleTerminalMessageSync(currentRoomId.value)
      clearQueueReconcileTimer(currentRoomId.value)
      void processQueuedMessagesForRoom(currentRoomId.value)
    }
  }
  const uiChatStatus = computed(() =>
    hasActiveTurn(chat.messages as any[]) || awaitingTurnStart.value ? 'streaming' : 'ready'
  )
  const composerStatus = computed(() => {
    if (queuedMessageCount.value > 0) return 'submitted'
    return uiChatStatus.value
  })

  // Form submission handler
  const onSubmit = async (
    payload?:
      | Event
      | string
      | {
          text?: string
          attachments?: Array<{
            url: string
            mediaType: string
            filename?: string
          }>
        }
  ) => {
    if (payload && typeof payload === 'object' && 'preventDefault' in payload)
      payload.preventDefault()

    const submittedText =
      typeof payload === 'string'
        ? payload
        : payload && 'text' in payload
          ? payload.text || ''
          : input.value
    const attachments =
      payload && typeof payload === 'object' && 'attachments' in payload
        ? payload.attachments || []
        : []

    if ((!submittedText?.trim() && attachments.length === 0) || !currentRoomId.value) {
      return
    }

    // Track session start if it's the first message in this room
    if (chat.messages.length === 0 && currentRoomId.value) {
      trackChatSessionStart(currentRoomId.value)
    }

    const outgoingMessage: QueuedOutgoingMessage = {
      id: crypto.randomUUID(),
      roomId: currentRoomId.value,
      text: submittedText,
      attachments,
      createdAt: new Date()
    }

    if (
      awaitingTurnStart.value ||
      hasActiveTurn(chat.messages as any[]) ||
      queuedMessageCount.value
    ) {
      enqueueOutgoingMessage(outgoingMessage)
    } else {
      await sendOutgoingMessage({
        text: submittedText,
        attachments
      })
    }

    input.value = ''
  }

  const onToolApproval = async (approval: {
    approvalId: string
    approved: boolean
    result?: string
  }) => {
    // Append a tool message with a tool-approval-response part directly to chat.messages.
    // addToolApprovalResponse only works with messages that came through the SDK's own
    // streaming transport, not with messages synthesized from WebSocket-delivered state.
    // The server's hasToolApprovalResponse path handles this message correctly.
    const approvalToolMsg = {
      id: crypto.randomUUID(),
      role: 'tool',
      content: '',
      parts: [
        {
          type: 'tool-approval-response',
          toolCallId: approval.approvalId,
          approvalId: approval.approvalId,
          approved: approval.approved,
          reason:
            approval.result ||
            (approval.approved ? 'User confirmed action.' : 'User cancelled action.')
        }
      ],
      createdAt: new Date()
    }
    chat.messages = [...(chat.messages as any[]), approvalToolMsg] as any
    await (chat as any).sendMessage()
    awaitingTurnStart.value = true
    restartTurnPolling({ forceForMs: 15000 })
    if (currentRoomId.value) {
      startApprovalSync(currentRoomId.value, approvalToolMsg.createdAt.getTime())
    }
  }

  const getMessageText = (message: any) => {
    if (typeof message?.content === 'string') return message.content
    if (Array.isArray(message?.parts)) {
      return message.parts
        .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
        .map((part: any) => part.text)
        .join('')
    }
    return ''
  }

  const openEditMessageInline = (message: any) => {
    if (
      !message ||
      message.role !== 'user' ||
      uiChatStatus.value !== 'ready' ||
      isCurrentRoomReadOnly.value
    )
      return

    editingMessage.value = message
    editingContent.value = getMessageText(message)
  }

  const cancelEditedMessage = (force = false) => {
    if (!force && savingEditedMessage.value) return
    editingMessage.value = null
    editingContent.value = ''
  }

  const saveEditedMessage = async () => {
    if (!editingMessage.value || !currentRoomId.value || savingEditedMessage.value) return

    const content = editingContent.value.trim()
    if (!content) {
      toast.add({
        title: 'Message required',
        description: 'Edited message cannot be empty.',
        color: 'error'
      })
      return
    }

    savingEditedMessage.value = true

    try {
      const response = await $fetch<{ regenerateFromEdit?: boolean }>(
        `/api/chat/messages/${editingMessage.value.id}`,
        {
          method: 'PATCH',
          body: {
            roomId: currentRoomId.value,
            content,
            regenerateFromEdit: true
          }
        }
      )

      cancelEditedMessage(true)
      await loadMessages(currentRoomId.value)

      if (response?.regenerateFromEdit) {
        await sendOutgoingMessage({ text: content, attachments: [] })
      }

      toast.add({
        title: 'Message updated',
        description: 'Your message has been updated and regenerated.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Edit failed',
        description: error?.data?.message || 'Could not update this message.',
        color: 'error'
      })
    } finally {
      savingEditedMessage.value = false
    }
  }
  // Load initial room and messages
  onMounted(async () => {
    if (import.meta.client) {
      previousDocumentOverflow = document.documentElement.style.overflow
      previousBodyOverflow = document.body.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'

      const updateViewportHeight = () => {
        const viewportHeight = window.visualViewport?.height || window.innerHeight
        chatViewportHeight.value = `${Math.round(viewportHeight)}px`
      }

      updateViewportHeight()
      window.visualViewport?.addEventListener('resize', updateViewportHeight)
      window.visualViewport?.addEventListener('scroll', updateViewportHeight)
      window.addEventListener('resize', updateViewportHeight)
      visualViewportListener = updateViewportHeight
    }

    await loadChat()
    connectChatWebSocket()
    nextTick(() => {
      chatInputRef.value?.focus()
    })
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return

    document.documentElement.style.overflow = previousDocumentOverflow
    document.body.style.overflow = previousBodyOverflow

    if (visualViewportListener) {
      window.visualViewport?.removeEventListener('resize', visualViewportListener)
      window.visualViewport?.removeEventListener('scroll', visualViewportListener)
      window.removeEventListener('resize', visualViewportListener)
      visualViewportListener = null
    }

    stopTurnPolling()
    cleanupChatWebSocket()
    Object.keys(queueReconcileTimersByRoom).forEach((roomId) => clearQueueReconcileTimer(roomId))
    Object.keys(approvalSyncTimersByRoom).forEach((roomId) => clearApprovalSyncTimer(roomId))
  })

  function cleanupChatWebSocket() {
    if (chatWsReconnectTimer) {
      clearTimeout(chatWsReconnectTimer)
      chatWsReconnectTimer = null
    }
    if (chatWsPingTimer) {
      clearInterval(chatWsPingTimer)
      chatWsPingTimer = null
    }
    if (chatWs) {
      chatWs.close()
      chatWs = null
    }
    isRealtimeConnected.value = false
  }

  function connectChatWebSocket() {
    if (!import.meta.client || chatWs || !(session.value?.user as any)?.id) {
      return
    }

    isRealtimeConnected.value = false
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    chatWs = new WebSocket(`${protocol}//${window.location.host}/api/websocket`)

    chatWs.onopen = async () => {
      try {
        const { token } = await ($fetch as any)('/api/websocket-token')
        chatWs?.send(JSON.stringify({ type: 'authenticate', token }))

        if (chatWsPingTimer) {
          clearInterval(chatWsPingTimer)
        }
        chatWsPingTimer = setInterval(() => {
          if (chatWs?.readyState === WebSocket.OPEN) {
            chatWs.send('ping')
          }
        }, 30000)
      } catch (error) {
        console.error('[Chat] WebSocket auth failed:', error)
      }
    }

    chatWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'authenticated') {
          isRealtimeConnected.value = true
          // Don't stop polling here — loadMessages will call restartTurnPolling()
          // which correctly decides based on actual state after the fetch.
          // Stopping eagerly risks missing a turn that completed during the gap.
          if (currentRoomId.value) {
            void loadMessages(currentRoomId.value, { silent: true })
          }
          return
        }
        if (
          data.type === 'chat_assistant_text_delta' &&
          data.roomId === currentRoomId.value &&
          typeof data.textDelta === 'string'
        ) {
          lastChatRealtimeEventAt.value = Date.now()
          applyAssistantTextDelta(data)
          return
        }
        if (
          data.type === 'chat_message_upsert' &&
          data.roomId === currentRoomId.value &&
          data.message
        ) {
          lastChatRealtimeEventAt.value = Date.now()
          upsertChatMessage(data.message)
          return
        }
        if (
          data.type === 'chat_turn_status' &&
          data.roomId === currentRoomId.value &&
          data.turnId &&
          data.reason === 'slow_response'
        ) {
          lastChatRealtimeEventAt.value = Date.now()
          if (!slowTurnNoticeIds.has(data.turnId)) {
            slowTurnNoticeIds.add(data.turnId)
            toast.add({
              title: 'Response delayed',
              description:
                'This turn is taking longer than usual. You can keep waiting or retry if it fails.',
              color: 'warning'
            })
          }
          return
        }
      } catch (error) {
        console.error('[Chat] WebSocket message handling failed:', error)
      }
    }

    chatWs.onclose = () => {
      chatWs = null
      isRealtimeConnected.value = false

      if (chatWsPingTimer) {
        clearInterval(chatWsPingTimer)
        chatWsPingTimer = null
      }

      if (hasActiveTurn(chat.messages as any[]) || awaitingTurnStart.value) {
        restartTurnPolling({ forceForMs: 15000 })
      }

      if (import.meta.client) {
        chatWsReconnectTimer = setTimeout(() => {
          chatWsReconnectTimer = null
          connectChatWebSocket()
        }, 3000)
      }
    }

    chatWs.onerror = () => {
      chatWs?.close()
    }
  }

  function stopTurnPolling() {
    if (turnPollingTimer) {
      clearInterval(turnPollingTimer)
      turnPollingTimer = null
    }
  }

  async function fetchRoomState(roomId: string) {
    return (await ($fetch as any)(`/api/chat/rooms/${roomId}/state`)) as ChatRoomStateSnapshot
  }

  function restartTurnPolling(options?: { forceForMs?: number }) {
    if (options?.forceForMs && options.forceForMs > 0) {
      turnPollingGraceUntil = Date.now() + options.forceForMs
    }

    stopTurnPolling()
    const activeTurn = hasActiveTurn(chat.messages as any[])
    const hasAssistantMessage = (chat.messages as any[]).some(
      (message) => message?.role === 'assistant'
    )
    if (
      !currentRoomId.value ||
      (!activeTurn &&
        !awaitingTurnStart.value &&
        (hasAssistantMessage || Date.now() >= turnPollingGraceUntil))
    ) {
      return
    }

    turnPollingTimer = setInterval(async () => {
      if (!currentRoomId.value) {
        stopTurnPolling()
        return
      }

      const hadActiveTurnAtPollStart = hasActiveTurn(chat.messages as any[])
      let nextHasActiveTurn = hadActiveTurnAtPollStart
      let nextHasAssistantMessage = (chat.messages as any[]).some(
        (message) => message?.role === 'assistant'
      )
      let didReloadMessages = false

      try {
        const roomState = await fetchRoomState(currentRoomId.value)
        const nextSignature = serializeRoomState(roomState)

        nextHasActiveTurn = activeTurnStatuses.includes(String(roomState.activeTurnStatus || ''))
        nextHasAssistantMessage = roomState.hasAssistantMessage

        if (nextSignature !== getRoomStateSignature(currentRoomId.value)) {
          setRoomStateSignature(currentRoomId.value, nextSignature)
          await loadMessages(currentRoomId.value, { silent: true })
          didReloadMessages = true
          nextHasActiveTurn = hasActiveTurn(chat.messages as any[])
          nextHasAssistantMessage = (chat.messages as any[]).some(
            (message) => message?.role === 'assistant'
          )
        } else if (hadActiveTurnAtPollStart && !nextHasActiveTurn) {
          // Force one final sync when a streamed turn settles. This catches cases where
          // the final assistant upsert or approval parts were missed by realtime delivery.
          await loadMessages(currentRoomId.value, { silent: true })
          didReloadMessages = true
          nextHasActiveTurn = hasActiveTurn(chat.messages as any[])
          nextHasAssistantMessage = (chat.messages as any[]).some(
            (message) => message?.role === 'assistant'
          )
        }
      } catch (error) {
        console.error('Failed to poll room state:', error)
      }

      if (
        !nextHasActiveTurn &&
        !awaitingTurnStart.value &&
        (nextHasAssistantMessage || Date.now() >= turnPollingGraceUntil)
      ) {
        stopTurnPolling()
        if (didReloadMessages) {
          clearQueueReconcileTimer(currentRoomId.value)
        }
      }
    }, 1500)
  }

  async function loadRooms(selectFirst = true) {
    try {
      if (selectFirst) loadingRooms.value = true
      const loadedRooms = (await ($fetch as any)('/api/chat/rooms')) as any[]
      rooms.value = loadedRooms

      // Select first room if we don't have a current one
      if (selectFirst && !currentRoomId.value && loadedRooms.length > 0 && loadedRooms[0]) {
        await selectRoom(loadedRooms[0].roomId)
      }
    } catch (err: any) {
      console.error('Failed to load rooms:', err)
    } finally {
      loadingRooms.value = false
    }
  }

  async function loadMessages(roomId: string, options?: { silent?: boolean }) {
    const silent = options?.silent ?? false

    // Coalesce concurrent calls: if already inflight for this room, mark pending
    // and let the current call handle the final state.
    if (loadMessagesInFlight[roomId]) {
      loadMessagesPending[roomId] = true
      return
    }

    loadMessagesInFlight[roomId] = true

    try {
      if (!silent) {
        loadingMessages.value = true
      }
      const loadedMessages = (await ($fetch as any)(`/api/chat/messages?roomId=${roomId}`)) as any[]

      // Transform DB messages to AI SDK format (UIMessage)
      const transformedMessages = loadedMessages.map((msg) => ({
        ...transformStoredMessage(msg),
        updatedAt: msg.updatedAt || msg.metadata?.updatedAt || null
      }))

      // Avoid replacing the entire message list when nothing material changed,
      // because that retriggers internal scroll behavior in the chat UI.
      if (!areMessageListsEquivalent(chat.messages as any[], transformedMessages)) {
        chat.messages = transformedMessages as any
      }
      setRoomStateSignature(
        roomId,
        serializeRoomState(buildRoomStateFromMessages(transformedMessages))
      )
      if (
        transformedMessages.some(
          (message: any) =>
            message?.role === 'assistant' ||
            activeTurnStatuses.includes(message?.metadata?.turnStatus)
        )
      ) {
        awaitingTurnStart.value = false
      }
      restartTurnPolling()
      void processQueuedMessagesForRoom(roomId)
    } catch (err: any) {
      console.error('Failed to load messages:', err)
    } finally {
      loadMessagesInFlight[roomId] = false
      if (!silent) {
        loadingMessages.value = false
      }
      // If a refresh was requested while we were loading, run one more time
      // to ensure we have the latest state.
      if (loadMessagesPending[roomId]) {
        loadMessagesPending[roomId] = false
        void loadMessages(roomId, { silent: true })
      }
    }
  }

  async function loadChat() {
    await loadRooms(false)

    // Check for context from query params
    const roomFromQuery = route.query.room as string
    const workoutId = route.query.workoutId as string
    const isPlanned = route.query.isPlanned === 'true'
    const recommendationId = route.query.recommendationId as string
    const initialMessage = route.query.initialMessage as string

    if (roomFromQuery) {
      const roomExists = rooms.value.some((r) => r.roomId === roomFromQuery)
      if (roomExists) {
        await selectRoom(roomFromQuery)
      } else {
        useToast().add({
          title: 'Chat not found',
          description: 'The requested chat could not be found.',
          color: 'error'
        })
        await createNewChat()
      }
      // Clear query params
      router.replace({ query: {} })
    } else if (workoutId || recommendationId || initialMessage) {
      // Create new chat
      await createNewChat()

      let text = initialMessage || ''
      if (workoutId) {
        text = isPlanned
          ? `I'd like to discuss my upcoming planned workout (ID: ${workoutId}). What should I focus on?`
          : `Please analyze my completed workout with ID ${workoutId}. How did I perform?`
      } else if (recommendationId) {
        text = `Can you explain this recommendation (ID: ${recommendationId}) in more detail?`
      }

      if (text) {
        chat.sendMessage({
          text,
          role: 'user'
        } as any)
      }

      // Clear query params
      router.replace({ query: {} })
    } else {
      // No context provided - check if we should continue last chat or start new
      if (rooms.value.length > 0 && rooms.value[0]) {
        const lastRoom = rooms.value[0]
        const lastActivity = lastRoom.index // Timestamp in ms
        const now = Date.now()
        const timeSinceLastActivity = now - lastActivity
        const FIFTEEN_MINUTES = 15 * 60 * 1000

        // If last message/room update was > 15 mins ago, start fresh
        if (timeSinceLastActivity > FIFTEEN_MINUTES) {
          await createNewChat()
        } else {
          await selectRoom(lastRoom.roomId)
        }
      } else {
        // Fallback if no rooms exist (API usually creates one, but just in case)
        await createNewChat()
      }
    }
  }

  async function selectRoom(roomId: string) {
    if (currentRoomId.value && currentRoomId.value !== roomId) {
      clearApprovalSyncTimer(currentRoomId.value)
    }
    currentRoomId.value = roomId
    awaitingTurnStart.value = false
    await loadMessages(roomId)
    isRoomListOpen.value = false
    // Focus input after room selection
    nextTick(() => {
      chatInputRef.value?.focus()
    })
  }

  async function createNewChat() {
    try {
      const newRoom = await $fetch<any>('/api/chat/rooms', {
        method: 'POST'
      })

      // Add to rooms list
      rooms.value.unshift(newRoom)

      // Track session start
      trackChatSessionStart(newRoom.roomId)

      // Switch to new room
      await selectRoom(newRoom.roomId)
    } catch (err: any) {
      console.error('Failed to create new chat:', err)
    }
  }

  async function deleteRoom(roomId: string) {
    try {
      // If we are in the room being deleted, we need to clear state immediately
      const wasCurrentRoom = currentRoomId.value === roomId

      // Determine the next room to select if we are deleting the current one
      let nextRoomId = ''
      if (wasCurrentRoom) {
        const currentIndex = rooms.value.findIndex((r) => r.roomId === roomId)
        if (currentIndex !== -1 && rooms.value.length > 1) {
          // Select next room, or previous if deleting the last one
          const nextRoom = rooms.value[currentIndex + 1] || rooms.value[currentIndex - 1]
          nextRoomId = nextRoom.roomId
        }
      }

      await $fetch(`/api/chat/rooms/${roomId}`, {
        method: 'DELETE'
      })

      if (wasCurrentRoom) {
        if (nextRoomId) {
          await selectRoom(nextRoomId)
          await loadRooms(false)
        } else {
          // No more rooms left, create a fresh one
          await createNewChat()
          await loadRooms(false)
        }
      } else {
        // Just refresh the list if we deleted a background room
        await loadRooms(false)
      }

      useToast().add({
        title: 'Chat room deleted',
        color: 'success'
      })
    } catch (err: any) {
      console.error('Failed to delete room:', err)
      useToast().add({
        title: 'Error',
        description: 'Failed to delete chat room',
        color: 'error'
      })
    }
  }

  async function renameRoom(roomId: string, newName: string) {
    try {
      await $fetch(`/api/chat/rooms/${roomId}`, {
        method: 'PATCH',
        body: { name: newName }
      })

      // Update locally or refresh
      await loadRooms(false)

      useToast().add({
        title: 'Chat room renamed',
        color: 'success'
      })
    } catch (err: any) {
      console.error('Failed to rename room:', err)
      useToast().add({
        title: 'Error',
        description: 'Failed to rename chat room',
        color: 'error'
      })
    }
  }

  // Get current room info
  const currentRoom = computed(() => rooms.value.find((r) => r.roomId === currentRoomId.value))

  const isCurrentRoomReadOnly = computed(() => currentRoom.value?.isReadOnly || false)

  const currentRoomName = computed(() => {
    return currentRoom.value?.roomName || t.value('chat_title')
  })

  // Share current chat room
  const isShareModalOpen = ref(false)
  const shareExpiryValue = ref('2592000')

  const { shareLink, generatingShareLink, generateShareLink } = useResourceShare(
    'CHAT_ROOM',
    computed(() => currentRoomId.value)
  )

  const copyToClipboard = () => {
    if (!shareLink.value) return

    navigator.clipboard.writeText(shareLink.value)
    toast.add({
      title: t.value('toast_copied'),
      description: t.value('toast_copied_desc'),
      color: 'success'
    })
  }

  watch(isShareModalOpen, (newValue) => {
    if (newValue && !shareLink.value) {
      generateShareLink()
    }
  })

  watch(currentRoomId, () => {
    shareLink.value = ''
  })

  watch(
    () => [uiChatStatus.value, queuedMessageCount.value] as const,
    ([status, queueCount]) => {
      if (!currentRoomId.value || status !== 'ready' || queueCount === 0) return
      void processQueuedMessagesForRoom(currentRoomId.value)
    },
    { flush: 'post' }
  )

  async function resumeTurn(turnId: string) {
    if (!turnId) return

    try {
      await $fetch(`/api/chat/turns/${turnId}/resume`, {
        method: 'POST'
      })
      if (currentRoomId.value) {
        await loadMessages(currentRoomId.value)
      }
      restartTurnPolling({ forceForMs: 15000 })
      toast.add({
        title: 'Response resumed',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Resume failed',
        description: error?.data?.message || 'Could not resume that response.',
        color: 'error'
      })
    }
  }

  async function retryTurn(turnId: string) {
    if (!turnId) return

    try {
      await $fetch(`/api/chat/turns/${turnId}/retry`, {
        method: 'POST'
      })
      if (currentRoomId.value) {
        await loadMessages(currentRoomId.value)
      }
      restartTurnPolling({ forceForMs: 15000 })
      toast.add({
        title: 'Retry queued',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Retry failed',
        description: error?.data?.message || 'Could not retry that response.',
        color: 'error'
      })
    }
  }
</script>

<template>
  <UDashboardPanel
    id="chat"
    class="overflow-hidden"
    :style="{ height: chatViewportHeight }"
    :ui="{ body: 'p-0 min-h-0 overflow-hidden' }"
  >
    <template #header>
      <div class="sticky top-0 z-20">
        <UDashboardNavbar :title="currentRoomName">
          <template #leading>
            <UDashboardSidebarCollapse />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-clock"
              @click="isRoomListOpen = true"
            />
          </template>
          <template #right>
            <ClientOnly>
              <DashboardTriggerMonitorButton />
              <NotificationDropdown />
            </ClientOnly>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-share"
              aria-label="Share Chat"
              size="sm"
              class="font-bold"
              :disabled="!currentRoomId"
              @click="isShareModalOpen = true"
            >
              <span class="hidden sm:inline">{{ t('nav_share') }}</span>
            </UButton>
            <UButton
              to="/settings/ai"
              icon="i-heroicons-cog-6-tooth"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-bold"
              aria-label="AI Settings"
            >
              <span class="hidden sm:inline">{{ t('nav_settings') }}</span>
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              icon="i-heroicons-chat-bubble-left-right"
              aria-label="New Chat"
              size="sm"
              class="font-bold"
              @click="createNewChat"
            >
              <span class="hidden sm:inline">{{ t('nav_new_chat') }}</span>
              <span class="sm:hidden">{{ t('controls_chat') }}</span>
            </UButton>
          </template>
        </UDashboardNavbar>
      </div>
    </template>

    <template #body>
      <div class="flex h-full min-h-0 overscroll-none">
        <!-- Sidebar and Mobile Drawer -->
        <ChatSidebar
          v-model:is-open="isRoomListOpen"
          :rooms="rooms"
          :current-room-id="currentRoomId"
          :loading="loadingRooms"
          @select="selectRoom"
          @delete="deleteRoom"
          @rename="renameRoom"
        />

        <!-- Chat Area -->
        <div class="flex-1 flex min-w-0 min-h-0 flex-col overflow-hidden">
          <!-- Read-only Banner -->
          <div
            v-if="isCurrentRoomReadOnly"
            class="p-2 sm:p-4 border-b border-warning-200 bg-warning-50 dark:border-warning-900/50 dark:bg-warning-950/20"
          >
            <UAlert
              color="warning"
              variant="subtle"
              icon="i-heroicons-information-circle"
              :title="t('legacy_banner_title')"
              :description="t('legacy_banner_desc')"
            >
              <template #actions>
                <UButton
                  color="warning"
                  variant="outline"
                  size="xs"
                  :label="t('legacy_banner_action')"
                  @click="createNewChat"
                />
              </template>
            </UAlert>
          </div>

          <!-- Messages -->
          <ChatMessageList
            :messages="chatMessages as any"
            :status="uiChatStatus"
            :loading="loadingMessages"
            :can-edit-messages="
              uiChatStatus === 'ready' && queuedMessageCount === 0 && !isCurrentRoomReadOnly
            "
            :editing-message-id="editingMessage?.id || null"
            :editing-content="editingContent"
            :saving-edited-message="savingEditedMessage"
            @tool-approval="onToolApproval"
            @edit-message="openEditMessageInline"
            @update:editing-content="editingContent = $event"
            @save-edit="saveEditedMessage"
            @cancel-edit="cancelEditedMessage"
            @resume-turn="resumeTurn"
            @retry-turn="retryTurn"
          />

          <!-- Input -->
          <ChatInput
            ref="chatInputRef"
            v-model="input"
            :status="composerStatus"
            :error="chat.error"
            :disabled="isCurrentRoomReadOnly"
            :queued-count="queuedMessageCount"
            :has-active-turn="uiChatStatus === 'streaming'"
            mobile-enter-behavior="newline"
            @submit="onSubmit"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="isShareModalOpen"
    :title="t('modal_share_title', { name: currentRoomName })"
    :description="t('modal_share_history_desc')"
  >
    <template #body>
      <ShareAccessPanel
        :link="shareLink"
        :loading="generatingShareLink"
        :expiry-value="shareExpiryValue"
        resource-label="chat history"
        :share-title="`AI Chat: ${currentRoomName}`"
        @update:expiry-value="shareExpiryValue = $event"
        @generate="generateShareLink"
        @copy="copyToClipboard"
      />
    </template>
    <template #footer>
      <UButton
        :label="t('banner_exit')"
        color="neutral"
        variant="ghost"
        @click="isShareModalOpen = false"
      />
    </template>
  </UModal>
</template>
