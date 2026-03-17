<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import ChatMessageContent from '~/components/chat/ChatMessageContent.vue'
  import ChatWelcomeTips from '~/components/chat/ChatWelcomeTips.vue'
  import {
    shouldHideAssistantBubble,
    shouldShowAssistantStatusRow
  } from '~/utils/chat-message-state'

  const props = defineProps<{
    messages: any[]
    status: any
    loading: boolean
    canEditMessages?: boolean
    editingMessageId?: string | null
    editingContent?: string
    savingEditedMessage?: boolean
  }>()

  const emit = defineEmits([
    'tool-approval',
    'edit-message',
    'update:editing-content',
    'save-edit',
    'cancel-edit',
    'resume-turn',
    'retry-turn',
    'remember-message',
    'forget-message'
  ])
  const toast = useToast()
  const messageListRef = ref<HTMLElement | null>(null)
  const bottomAnchorRef = ref<HTMLElement | null>(null)
  const isTouchDevice = ref(false)
  const revealedActionsMessageId = ref<string | null>(null)
  const ttsLoadingMessageId = ref<string | null>(null)
  const ttsPlayingMessageId = ref<string | null>(null)
  const isVoiceSettingsOpen = ref(false)
  const defaultVoicePreset = ref<'coach' | 'calm' | 'direct' | 'energetic'>('coach')
  const geminiVoiceName = ref<
    | 'Zephyr'
    | 'Puck'
    | 'Charon'
    | 'Kore'
    | 'Fenrir'
    | 'Leda'
    | 'Orus'
    | 'Aoede'
    | 'Callirrhoe'
    | 'Autonoe'
    | 'Enceladus'
    | 'Iapetus'
    | 'Umbriel'
    | 'Algieba'
    | 'Despina'
    | 'Erinome'
    | 'Algenib'
    | 'Rasalgethi'
    | 'Laomedeia'
    | 'Achernar'
    | 'Alnilam'
    | 'Schedar'
    | 'Gacrux'
    | 'Pulcherrima'
    | 'Achird'
    | 'Zubenelgenubi'
    | 'Vindemiatrix'
    | 'Sadachbia'
    | 'Sadaltager'
    | 'Sulafat'
  >('Kore')
  const voiceSpeed = ref<'slow' | 'normal' | 'fast'>('normal')
  const autoReadMessages = ref(false)
  const didHydrateTtsPrefs = ref(false)
  const pendingAutoReadMessageKey = ref<string | null>(null)
  const lastHandledAssistantMessageKey = ref<string | null>(null)
  let touchMediaQuery: MediaQueryList | null = null
  let activeAudio: HTMLAudioElement | null = null
  let activeAudioUrl: string | null = null
  let activeTtsRequestId = 0
  let activeTtsAbortController: AbortController | null = null
  let saveTtsSettingsTimeout: ReturnType<typeof setTimeout> | null = null

  const ttsPresets = [
    {
      key: 'coach',
      label: 'Coach voice',
      icon: 'i-heroicons-speaker-wave',
      description: 'Confident, supportive, steady.'
    },
    {
      key: 'calm',
      label: 'Calm voice',
      icon: 'i-heroicons-heart',
      description: 'Warm, relaxed, reassuring.'
    },
    {
      key: 'direct',
      label: 'Direct voice',
      icon: 'i-heroicons-bolt',
      description: 'Concise, clear, matter-of-fact.'
    },
    {
      key: 'energetic',
      label: 'Energetic voice',
      icon: 'i-heroicons-fire',
      description: 'Upbeat, lively, motivating.'
    }
  ] as const
  type TtsPresetKey = (typeof ttsPresets)[number]['key']
  const geminiVoices = [
    { name: 'Zephyr', descriptor: 'Bright' },
    { name: 'Puck', descriptor: 'Upbeat' },
    { name: 'Charon', descriptor: 'Informative' },
    { name: 'Kore', descriptor: 'Firm' },
    { name: 'Fenrir', descriptor: 'Excitable' },
    { name: 'Leda', descriptor: 'Youthful' },
    { name: 'Orus', descriptor: 'Firm' },
    { name: 'Aoede', descriptor: 'Breezy' },
    { name: 'Callirrhoe', descriptor: 'Easy-going' },
    { name: 'Autonoe', descriptor: 'Bright' },
    { name: 'Enceladus', descriptor: 'Breathy' },
    { name: 'Iapetus', descriptor: 'Clear' },
    { name: 'Umbriel', descriptor: 'Easy-going' },
    { name: 'Algieba', descriptor: 'Smooth' },
    { name: 'Despina', descriptor: 'Smooth' },
    { name: 'Erinome', descriptor: 'Clear' },
    { name: 'Algenib', descriptor: 'Gravelly' },
    { name: 'Rasalgethi', descriptor: 'Informative' },
    { name: 'Laomedeia', descriptor: 'Upbeat' },
    { name: 'Achernar', descriptor: 'Soft' },
    { name: 'Alnilam', descriptor: 'Firm' },
    { name: 'Schedar', descriptor: 'Even' },
    { name: 'Gacrux', descriptor: 'Mature' },
    { name: 'Pulcherrima', descriptor: 'Forward' },
    { name: 'Achird', descriptor: 'Friendly' },
    { name: 'Zubenelgenubi', descriptor: 'Casual' },
    { name: 'Vindemiatrix', descriptor: 'Gentle' },
    { name: 'Sadachbia', descriptor: 'Lively' },
    { name: 'Sadaltager', descriptor: 'Knowledgeable' },
    { name: 'Sulafat', descriptor: 'Warm' }
  ] as const
  type GeminiVoiceName = (typeof geminiVoices)[number]['name']
  const speedOptions = [
    { key: 'slow', label: 'Slower', description: 'More relaxed pacing.' },
    { key: 'normal', label: 'Normal', description: 'Balanced pacing.' },
    { key: 'fast', label: 'Faster', description: 'More compact delivery.' }
  ] as const
  type TtsSpeedKey = (typeof speedOptions)[number]['key']

  // Filter out tool messages (responses) as they are internal state or handled via UI
  const filteredMessages = computed(() => {
    return props.messages.filter((m) => m.role !== 'tool')
  })
  const latestSpeakableAssistantMessage = computed(() => {
    for (let index = filteredMessages.value.length - 1; index >= 0; index -= 1) {
      const message = filteredMessages.value[index]
      if (message?.role === 'assistant' && getSpeakableText(message)) {
        return message
      }
    }

    return null
  })
  const selectedVoicePreset = computed(
    () => ttsPresets.find((preset) => preset.key === defaultVoicePreset.value) || ttsPresets[0]
  )
  const selectedGeminiVoice = computed(
    () => geminiVoices.find((voice) => voice.name === geminiVoiceName.value) || geminiVoices[0]
  )
  const geminiVoiceItems = computed(() =>
    geminiVoices.map((voice) => ({
      ...voice,
      label: `${voice.name} (${voice.descriptor})`
    }))
  )

  const handleToolApproval = (response: any) => {
    emit('tool-approval', response)
  }

  const handleEditMessage = (message: any) => {
    emit('edit-message', message)
  }

  const updateEditingContent = (value: string) => {
    emit('update:editing-content', value)
  }

  const saveEdit = () => {
    emit('save-edit')
  }

  const cancelEdit = () => {
    emit('cancel-edit')
  }

  const isEditingMessage = (message: any) => props.editingMessageId === message?.id
  const isActionsVisible = (message: any) =>
    !!message?.id && (isTouchDevice.value ? revealedActionsMessageId.value === message.id : true)
  const normalizedStatus = computed(() =>
    typeof props.status === 'string' ? props.status : String(props.status || '')
  )
  const showTypingIndicator = computed(() => normalizedStatus.value === 'streaming')
  const getToolArtifactSignature = (entries: any[]) =>
    (Array.isArray(entries) ? entries : []).map((entry: any) => ({
      id: entry?.id || entry?.toolCallId || null,
      name: entry?.name || entry?.toolName || null,
      state: entry?.state || null
    }))
  const scrollSignature = computed(() =>
    JSON.stringify({
      status: normalizedStatus.value,
      typing: showTypingIndicator.value,
      messages: filteredMessages.value.map((message: any) => ({
        id: message?.id,
        role: message?.role,
        content: typeof message?.content === 'string' ? message.content : '',
        parts: Array.isArray(message?.parts)
          ? message.parts.map((part: any) => ({
              type: part?.type,
              text: typeof part?.text === 'string' ? part.text : '',
              state: part?.state,
              toolCallId: part?.toolCallId
            }))
          : [],
        turnStatus: message?.metadata?.turnStatus,
        toolCalls: getToolArtifactSignature(message?.metadata?.toolCalls),
        toolResults: getToolArtifactSignature(message?.metadata?.toolResults)
      }))
    })
  )
  const scrollToBottom = async (behavior: ScrollBehavior = 'smooth') => {
    await nextTick()
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    if (messageListRef.value) {
      messageListRef.value.scrollTo({
        top: messageListRef.value.scrollHeight,
        behavior
      })
    }
    bottomAnchorRef.value?.scrollIntoView({
      block: 'end',
      behavior
    })
  }
  const getTurnStatusLabel = (status?: string) => {
    switch (status) {
      case 'INTERRUPTED':
        return 'Interrupted'
      case 'FAILED':
        return 'Failed'
      default:
        return ''
    }
  }
  const getTurnStatusColor = (status?: string) => {
    switch (status) {
      case 'INTERRUPTED':
      case 'FAILED':
        return 'error'
      case 'COMPLETED':
        return 'success'
      default:
        return 'neutral'
    }
  }
  const skillIndicators = {
    support: {
      label: 'Support',
      icon: 'i-heroicons-lifebuoy',
      tooltip: 'This reply used support tools.'
    },
    planning_read: {
      label: 'Planning',
      icon: 'i-heroicons-calendar-days',
      tooltip: 'This reply used planning tools.'
    },
    planning_write: {
      label: 'Planning',
      icon: 'i-heroicons-calendar-days',
      tooltip: 'This reply prepared or changed training plan data.'
    },
    workout_read: {
      label: 'Workouts',
      icon: 'i-heroicons-bolt',
      tooltip: 'This reply used workout tools.'
    },
    workout_update: {
      label: 'Workout Edit',
      icon: 'i-heroicons-pencil-square',
      tooltip: 'This reply used workout update tools.'
    },
    profile: {
      label: 'Profile',
      icon: 'i-heroicons-user-circle',
      tooltip: 'This reply accessed or updated athlete profile settings.'
    },
    availability: {
      label: 'Schedule',
      icon: 'i-heroicons-clock',
      tooltip: 'This reply accessed or updated training availability.'
    },
    recommendations: {
      label: 'Coach',
      icon: 'i-heroicons-sparkles',
      tooltip: 'This reply accessed AI recommendations.'
    },
    wellness: {
      label: 'Wellness',
      icon: 'i-heroicons-heart',
      tooltip: 'This reply used wellness or recovery tools.'
    },
    analysis: {
      label: 'Analysis',
      icon: 'i-heroicons-chart-bar',
      tooltip: 'This reply performed training analysis or calculations.'
    },
    nutrition: {
      label: 'Nutrition',
      icon: 'i-heroicons-beaker',
      tooltip: 'This reply used nutrition tools.'
    }
  } as const

  const getSkillIndicators = (message: any) => {
    if (message?.role !== 'assistant') return []

    const selection = message?.metadata?.skillSelection
    if (!selection?.useTools) return []

    const skillIds = Array.isArray(selection?.skillIds)
      ? selection.skillIds.filter((skillId: string) => skillId !== 'general_chat')
      : []

    if (!skillIds.length) return []

    const selectedToolNames = Array.isArray(selection?.selectedToolNames)
      ? selection.selectedToolNames.filter(Boolean)
      : []

    const sourceLabel =
      selection?.source === 'continuation'
        ? ' Continued after approval.'
        : selection?.source === 'router'
          ? ' Routed automatically.'
          : ''

    return skillIds.map((skillId: string, index: number) => {
      const indicator = skillIndicators[skillId as keyof typeof skillIndicators] || {
        label: 'Tools',
        icon: 'i-heroicons-wrench-screwdriver',
        tooltip: 'This reply used chat tools.'
      }

      // Append tool names and source info only to the first indicator to avoid repetition
      const extraInfo =
        index === 0
          ? sourceLabel +
            (selectedToolNames.length ? ` Tools: ${selectedToolNames.join(', ')}.` : '')
          : ''

      return {
        ...indicator,
        tooltip: indicator.tooltip + extraInfo
      }
    })
  }
  const canShowTurnStatus = (message: any) => shouldShowAssistantStatusRow(message)
  const isQueuedUserMessage = (message: any) =>
    message?.role === 'user' && message?.metadata?.localQueueState === 'QUEUED'
  const resumeTurn = (turnId?: string) => {
    if (!turnId) return
    emit('resume-turn', turnId)
  }
  const retryTurn = (turnId?: string) => {
    if (!turnId) return
    emit('retry-turn', turnId)
  }

  const editorRows = () => {
    const text = props.editingContent || ''
    const lines = text.split('\n').length
    return Math.min(10, Math.max(3, lines))
  }

  const updateTouchMode = () => {
    if (!import.meta.client) return
    isTouchDevice.value = window.matchMedia('(hover: none), (pointer: coarse)').matches
    if (!isTouchDevice.value) revealedActionsMessageId.value = null
  }

  const stopPlayback = () => {
    activeTtsRequestId += 1
    activeTtsAbortController?.abort()
    activeTtsAbortController = null

    if (activeAudio) {
      activeAudio.pause()
      activeAudio = null
    }

    if (activeAudioUrl && import.meta.client) {
      URL.revokeObjectURL(activeAudioUrl)
      activeAudioUrl = null
    }

    ttsPlayingMessageId.value = null
    ttsLoadingMessageId.value = null
  }

  const normalizeSpeechText = (value: string) => {
    return value
      .replace(/```[\s\S]*?```/g, ' code block omitted. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const getSpeakableText = (message: any) => {
    const parts = message?.parts?.length
      ? message.parts
      : typeof message?.content === 'string'
        ? [{ type: 'text', text: message.content }]
        : []

    const text = parts
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text.trim())
      .filter(Boolean)
      .join('\n\n')

    return normalizeSpeechText(text)
  }

  const canSpeakMessage = (message: any) => {
    return message?.role === 'assistant' && !!getSpeakableText(message)
  }

  const getMessageTtsKey = (message: any) => {
    return String(message?.id || message?.createdAt || getSpeakableText(message).slice(0, 120))
  }

  const isTtsLoading = (message: any) => ttsLoadingMessageId.value === getMessageTtsKey(message)
  const isTtsPlaying = (message: any) => ttsPlayingMessageId.value === getMessageTtsKey(message)

  const playAssistantMessage = async (
    message: any,
    preset: TtsPresetKey = defaultVoicePreset.value,
    speed: TtsSpeedKey = voiceSpeed.value
  ) => {
    if (!import.meta.client) return

    if (isTtsPlaying(message)) {
      stopPlayback()
      return
    }

    const text = getSpeakableText(message)
    if (!text) return

    const messageKey = getMessageTtsKey(message)
    stopPlayback()
    ttsLoadingMessageId.value = messageKey
    const requestId = activeTtsRequestId
    const abortController = new AbortController()
    activeTtsAbortController = abortController

    try {
      const audioBlob = await $fetch('/api/chat/tts', {
        method: 'POST',
        body: {
          text,
          preset,
          voiceName: geminiVoiceName.value,
          speed,
          messageId: typeof message?.id === 'string' ? message.id : undefined
        },
        signal: abortController.signal,
        responseType: 'blob'
      })

      if (requestId !== activeTtsRequestId || abortController.signal.aborted) {
        return
      }

      const audio = new Audio(URL.createObjectURL(audioBlob as any))
      activeAudio = audio
      activeAudioUrl = audio.src
      ttsPlayingMessageId.value = messageKey

      audio.addEventListener(
        'ended',
        () => {
          stopPlayback()
        },
        { once: true }
      )
      audio.addEventListener(
        'error',
        () => {
          stopPlayback()
          toast.add({
            title: 'Audio failed',
            description: 'Could not play the generated speech.',
            color: 'error'
          })
        },
        { once: true }
      )

      await audio.play()
    } catch (error: any) {
      if (abortController.signal.aborted) {
        return
      }

      stopPlayback()
      toast.add({
        title: 'Speech failed',
        description: error?.data?.message || error?.message || 'Could not generate speech.',
        color: 'error'
      })
    } finally {
      if (activeTtsAbortController === abortController) {
        activeTtsAbortController = null
      }
      if (ttsLoadingMessageId.value === messageKey) {
        ttsLoadingMessageId.value = null
      }
    }
  }

  const openVoiceSettings = () => {
    isVoiceSettingsOpen.value = true
  }

  const saveTtsSettings = async () => {
    if (!didHydrateTtsPrefs.value) return

    try {
      await $fetch('/api/settings/ai', {
        method: 'POST',
        body: {
          aiTtsStyle: defaultVoicePreset.value,
          aiTtsVoiceName: geminiVoiceName.value,
          aiTtsSpeed: voiceSpeed.value,
          aiTtsAutoReadMessages: autoReadMessages.value
        }
      })
    } catch (error: any) {
      toast.add({
        title: 'Voice settings failed to save',
        description: error?.data?.message || error?.message || 'Could not save voice settings.',
        color: 'error'
      })
    }
  }

  const queueSaveTtsSettings = () => {
    if (saveTtsSettingsTimeout) {
      clearTimeout(saveTtsSettingsTimeout)
    }

    saveTtsSettingsTimeout = setTimeout(() => {
      void saveTtsSettings()
    }, 250)
  }

  const getTtsMenuItems = (message: any) => [
    [
      {
        label: 'Read new messages',
        type: 'checkbox' as const,
        checked: autoReadMessages.value,
        disabled: isTtsLoading(message),
        onUpdateChecked: (checked: boolean) => {
          autoReadMessages.value = !!checked
        }
      }
    ],
    [
      {
        label: 'Voice settings',
        icon: 'i-heroicons-adjustments-horizontal',
        disabled: isTtsLoading(message),
        onSelect: () => openVoiceSettings()
      }
    ]
  ]

  const handleMessageTap = (message: any) => {
    if (
      !isTouchDevice.value ||
      !props.canEditMessages ||
      !message ||
      message.role !== 'user' ||
      isEditingMessage(message)
    )
      return

    revealedActionsMessageId.value =
      revealedActionsMessageId.value === message.id ? null : message.id
  }

  const handleDocumentPointerDown = (event: Event) => {
    if (!isTouchDevice.value) return
    if (!messageListRef.value) return
    if (messageListRef.value.contains(event.target as Node)) return
    revealedActionsMessageId.value = null
  }

  onMounted(() => {
    if (!import.meta.client) return
    updateTouchMode()
    touchMediaQuery = window.matchMedia('(hover: none), (pointer: coarse)')
    touchMediaQuery.addEventListener('change', updateTouchMode)
    document.addEventListener('pointerdown', handleDocumentPointerDown, { capture: true })

    lastHandledAssistantMessageKey.value = latestSpeakableAssistantMessage.value
      ? getMessageTtsKey(latestSpeakableAssistantMessage.value)
      : null

    void (async () => {
      try {
        const settings = await $fetch<{
          aiTtsStyle?: TtsPresetKey
          aiTtsVoiceName?: GeminiVoiceName
          aiTtsSpeed?: TtsSpeedKey
          aiTtsAutoReadMessages?: boolean
        }>('/api/settings/ai')

        if (
          settings.aiTtsStyle &&
          ttsPresets.some((preset) => preset.key === settings.aiTtsStyle)
        ) {
          defaultVoicePreset.value = settings.aiTtsStyle
        }
        if (
          settings.aiTtsVoiceName &&
          geminiVoices.some((voice) => voice.name === settings.aiTtsVoiceName)
        ) {
          geminiVoiceName.value = settings.aiTtsVoiceName
        }
        if (
          settings.aiTtsSpeed &&
          speedOptions.some((option) => option.key === settings.aiTtsSpeed)
        ) {
          voiceSpeed.value = settings.aiTtsSpeed
        }
        if (typeof settings.aiTtsAutoReadMessages === 'boolean') {
          autoReadMessages.value = settings.aiTtsAutoReadMessages
        }
      } catch (error) {
        console.error('[Chat TTS] Failed to load voice settings:', error)
      } finally {
        didHydrateTtsPrefs.value = true
      }
    })()

    void scrollToBottom('auto')
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    touchMediaQuery?.removeEventListener('change', updateTouchMode)
    document.removeEventListener('pointerdown', handleDocumentPointerDown, { capture: true })
    if (saveTtsSettingsTimeout) {
      clearTimeout(saveTtsSettingsTimeout)
      saveTtsSettingsTimeout = null
    }
    stopPlayback()
  })

  watch(
    () => props.editingMessageId,
    () => {
      revealedActionsMessageId.value = null
    }
  )

  watch([defaultVoicePreset, geminiVoiceName, voiceSpeed, autoReadMessages], () => {
    if (!import.meta.client || !didHydrateTtsPrefs.value) return
    queueSaveTtsSettings()
  })

  watch(
    latestSpeakableAssistantMessage,
    (message) => {
      if (!didHydrateTtsPrefs.value || !message) return

      const messageKey = getMessageTtsKey(message)
      if (messageKey === lastHandledAssistantMessageKey.value) return

      lastHandledAssistantMessageKey.value = messageKey
      pendingAutoReadMessageKey.value = autoReadMessages.value ? messageKey : null
    },
    { immediate: false }
  )

  watch(
    [() => props.status, latestSpeakableAssistantMessage, autoReadMessages],
    ([status, message, autoRead]) => {
      if (!didHydrateTtsPrefs.value || !autoRead || !message) return

      const messageKey = getMessageTtsKey(message)
      if (pendingAutoReadMessageKey.value !== messageKey) return

      const normalizedStatus = typeof status === 'string' ? status : ''
      if (normalizedStatus === 'submitted' || normalizedStatus === 'streaming') return

      pendingAutoReadMessageKey.value = null
      void playAssistantMessage(message, defaultVoicePreset.value, voiceSpeed.value)
    }
  )

  watch(
    scrollSignature,
    async (nextSignature, previousSignature) => {
      if (!import.meta.client) return
      if (!previousSignature) {
        await scrollToBottom('auto')
        return
      }

      await scrollToBottom('smooth')
    },
    { flush: 'post' }
  )

  const copyMessage = async (message: any) => {
    if (!import.meta.client) return
    const text = typeof message?.content === 'string' ? message.content.trim() : ''
    if (!text) return

    await navigator.clipboard.writeText(text)
    toast.add({
      title: 'Copied',
      description: 'Message copied to clipboard.',
      color: 'success'
    })
  }

  const getMessageActionText = (message: any) => {
    if (message?.role === 'assistant') {
      return getSpeakableText(message)
    }

    if (typeof message?.content === 'string') {
      return message.content.trim()
    }

    return ''
  }

  const rememberMessage = (message: any) => {
    const text = getMessageActionText(message)
    if (!text) return
    emit('remember-message', { message, text })
  }

  const forgetMessage = (message: any) => {
    const text = getMessageActionText(message)
    if (!text) return
    emit('forget-message', { message, text })
  }
</script>

<template>
  <div ref="messageListRef" class="flex-1 overflow-y-auto">
    <UContainer class="h-full">
      <div v-if="loading" class="space-y-6 py-8">
        <div v-for="i in 3" :key="i" class="flex flex-col space-y-4">
          <div class="flex items-start gap-3">
            <USkeleton class="h-8 w-8 rounded-full" />
            <USkeleton class="h-16 w-1/2 rounded-2xl" />
          </div>
          <div class="flex items-start justify-end gap-3">
            <USkeleton class="h-16 w-1/2 rounded-2xl" />
            <USkeleton class="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      <ChatWelcomeTips v-else-if="filteredMessages.length === 0" />

      <div v-else class="h-full flex flex-col">
        <UChatMessages
          :messages="filteredMessages"
          :status="status"
          :user="{
            side: 'right',
            variant: 'soft',
            ui: {
              content: 'min-h-0 bg-transparent p-0 text-white shadow-none dark:text-gray-50',
              container:
                'relative w-fit flex items-center ltr:justify-end ms-auto max-w-[75%] gap-2 !pb-0',
              actions:
                'static mt-2 flex items-center justify-end gap-1 opacity-100 sm:absolute sm:right-full sm:mr-1 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2 sm:bottom-auto sm:z-20 sm:opacity-0 sm:group-hover/message:opacity-100 transition-opacity'
            }
          }"
          :assistant="{
            side: 'left',
            variant: 'naked',
            ui: {
              content: 'rounded-[1.2rem] px-4 py-3',
              container: 'relative flex items-start rtl:justify-end !pb-0',
              actions:
                'static mt-2 flex items-center gap-1 opacity-100 sm:absolute sm:left-full sm:ml-1 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2 sm:bottom-auto sm:z-20 sm:opacity-0 sm:group-hover/message:opacity-100 transition-opacity'
            }
          }"
        >
          <template #content="{ message }">
            <div v-if="message.role === 'user' && isEditingMessage(message)" class="space-y-3">
              <UTextarea
                :model-value="editingContent || ''"
                :rows="editorRows()"
                autofocus
                autoresize
                class="w-[min(42rem,72vw)] max-w-full [&_textarea]:leading-7 [&_textarea]:text-pretty"
                placeholder="Edit your message..."
                @update:model-value="updateEditingContent($event)"
              />
              <div class="flex items-center justify-end gap-2">
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="ghost"
                  :disabled="savingEditedMessage"
                  @click="cancelEdit"
                />
                <UButton
                  label="Update"
                  color="neutral"
                  :loading="savingEditedMessage"
                  @click="saveEdit"
                />
              </div>
            </div>
            <div
              v-else-if="!shouldHideAssistantBubble(message)"
              :class="
                message.role === 'user'
                  ? isQueuedUserMessage(message)
                    ? 'animate-pulse rounded-[1.75rem] rounded-tr-lg bg-amber-500/22 px-4 py-2 text-white ring-1 ring-inset ring-amber-300/35 dark:bg-amber-400/16 dark:ring-amber-200/20'
                    : 'rounded-[1.75rem] rounded-tr-lg bg-gray-800/95 px-4 py-2 text-white dark:bg-gray-700/95 dark:text-gray-50'
                  : ''
              "
            >
              <div
                v-if="message.role === 'assistant' && getSkillIndicators(message).length"
                class="mb-2 flex flex-wrap items-center gap-1.5"
              >
                <UTooltip
                  v-for="(indicator, idx) in getSkillIndicators(message)"
                  :key="idx"
                  :text="indicator.tooltip"
                  :popper="{ placement: 'top' }"
                >
                  <UBadge
                    color="neutral"
                    variant="soft"
                    size="xs"
                    :icon="indicator.icon"
                    class="rounded-full"
                  >
                    {{ indicator.label }}
                  </UBadge>
                </UTooltip>
              </div>
              <ChatMessageContent
                :message="message"
                :all-messages="messages"
                @click="handleMessageTap(message)"
                @tool-approval="handleToolApproval"
              />
            </div>
            <div
              v-if="canShowTurnStatus(message)"
              class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500"
            >
              <UBadge
                :color="getTurnStatusColor(message.metadata?.turnStatus)"
                variant="soft"
                size="sm"
              >
                {{ getTurnStatusLabel(message.metadata?.turnStatus) }}
              </UBadge>
              <span v-if="message.metadata?.turnFailureReason">
                {{ message.metadata.turnFailureReason }}
              </span>
              <UButton
                v-if="message.metadata?.turnStatus === 'INTERRUPTED'"
                size="xs"
                color="neutral"
                variant="ghost"
                label="Resume"
                @click="resumeTurn(message.metadata?.turnId)"
              />
              <UButton
                v-if="['INTERRUPTED', 'FAILED'].includes(message.metadata?.turnStatus)"
                size="xs"
                color="neutral"
                variant="ghost"
                label="Retry"
                @click="retryTurn(message.metadata?.turnId)"
              />
            </div>
          </template>
          <template #actions="{ message }">
            <template v-if="canSpeakMessage(message)">
              <div class="flex items-center gap-1 transition-opacity">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Remember this message"
                  icon="i-heroicons-bookmark"
                  @click="rememberMessage(message)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Forget this message"
                  icon="i-heroicons-bookmark-slash"
                  @click="forgetMessage(message)"
                />
                <UButton
                  color="neutral"
                  :variant="isTtsPlaying(message) ? 'solid' : 'ghost'"
                  size="xs"
                  square
                  :loading="isTtsLoading(message)"
                  :aria-label="
                    isTtsPlaying(message)
                      ? 'Stop reading aloud'
                      : `Read aloud with ${selectedGeminiVoice.name}, ${selectedVoicePreset.label}, at ${voiceSpeed} speed`
                  "
                  :icon="isTtsPlaying(message) ? 'i-heroicons-stop' : 'i-heroicons-speaker-wave'"
                  @click="playAssistantMessage(message, defaultVoicePreset)"
                />
                <UDropdownMenu
                  :items="getTtsMenuItems(message)"
                  :content="{ side: 'bottom', align: 'start' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    aria-label="Choose voice style"
                    icon="i-heroicons-chevron-down"
                    :disabled="isTtsLoading(message)"
                  />
                </UDropdownMenu>
              </div>
            </template>
            <template
              v-else-if="message.role === 'user' && canEditMessages && !isEditingMessage(message)"
            >
              <div
                :class="
                  isTouchDevice
                    ? isActionsVisible(message)
                      ? '!opacity-100 !pointer-events-auto'
                      : '!opacity-0 !pointer-events-none'
                    : ''
                "
                class="flex items-center gap-1 transition-opacity"
              >
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Copy message"
                  icon="i-heroicons-clipboard-document"
                  @click="copyMessage(message)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Remember this message"
                  icon="i-heroicons-bookmark"
                  @click="rememberMessage(message)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Forget this message"
                  icon="i-heroicons-bookmark-slash"
                  @click="forgetMessage(message)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Edit message"
                  icon="i-heroicons-pencil-square"
                  @click="handleEditMessage(message)"
                />
              </div>
            </template>
          </template>
        </UChatMessages>
        <div
          v-if="showTypingIndicator"
          class="pointer-events-none flex items-start gap-3 px-4 pb-4 pt-2"
        >
          <div
            class="flex items-center gap-2 rounded-[1.2rem] px-4 py-3 text-gray-500 dark:text-gray-400"
          >
            <span
              class="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-current [animation-delay:-0.3s]"
            />
            <span
              class="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-current [animation-delay:-0.15s]"
            />
            <span class="h-2.5 w-2.5 animate-[bounce_1s_infinite] rounded-full bg-current" />
          </div>
        </div>
        <div ref="bottomAnchorRef" class="h-px w-full shrink-0" />
      </div>
    </UContainer>
  </div>

  <SettingsAiVoiceSettingsModal
    v-model:open="isVoiceSettingsOpen"
    v-model:gemini-voice-name="geminiVoiceName"
    v-model:voice-style="defaultVoicePreset"
    v-model:voice-speed="voiceSpeed"
    v-model:auto-read-messages="autoReadMessages"
  />
</template>
