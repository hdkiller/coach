<script setup lang="ts">
  const toast = useToast()
  const open = defineModel<boolean>('open', { default: false })
  const geminiVoiceName = defineModel<string>('geminiVoiceName', { default: 'Kore' })
  const voiceStyle = defineModel<'coach' | 'calm' | 'direct' | 'energetic'>('voiceStyle', {
    default: 'coach'
  })
  const voiceSpeed = defineModel<'slow' | 'normal' | 'fast'>('voiceSpeed', {
    default: 'normal'
  })
  const autoReadMessages = defineModel<boolean>('autoReadMessages', { default: false })

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

  const speedOptions = [
    { key: 'slow', label: 'Slower', description: 'More relaxed pacing.' },
    { key: 'normal', label: 'Normal', description: 'Balanced pacing.' },
    { key: 'fast', label: 'Faster', description: 'More compact delivery.' }
  ] as const
  const previewText =
    'Coach Watts here. This is a preview of your current voice settings for training guidance, nutrition feedback, and recovery advice.'
  const isPreviewLoading = ref(false)
  const isPreviewPlaying = ref(false)
  let previewAudio: HTMLAudioElement | null = null
  let previewAudioUrl: string | null = null
  let previewRequestId = 0
  let previewAbortController: AbortController | null = null

  const geminiVoiceItems = computed(() =>
    geminiVoices.map((voice) => ({
      ...voice,
      label: `${voice.name} (${voice.descriptor})`
    }))
  )
  const styleItems = computed(() =>
    ttsPresets.map((preset) => ({
      ...preset,
      label: preset.label
    }))
  )

  const selectedGeminiVoice = computed(
    () => geminiVoices.find((voice) => voice.name === geminiVoiceName.value) || geminiVoices[0]
  )

  const selectedVoicePreset = computed(
    () => ttsPresets.find((preset) => preset.key === voiceStyle.value) || ttsPresets[0]
  )

  const stopPreview = () => {
    previewRequestId += 1
    previewAbortController?.abort()
    previewAbortController = null

    if (previewAudio) {
      previewAudio.pause()
      previewAudio = null
    }

    if (previewAudioUrl && import.meta.client) {
      URL.revokeObjectURL(previewAudioUrl)
      previewAudioUrl = null
    }

    isPreviewLoading.value = false
    isPreviewPlaying.value = false
  }

  const testVoice = async () => {
    if (!import.meta.client) return

    if (isPreviewPlaying.value) {
      stopPreview()
      return
    }

    stopPreview()
    isPreviewLoading.value = true
    const requestId = previewRequestId
    const abortController = new AbortController()
    previewAbortController = abortController

    try {
      const audioBlob = await $fetch('/api/chat/tts', {
        method: 'POST',
        body: {
          text: previewText,
          preset: voiceStyle.value,
          voiceName: geminiVoiceName.value,
          speed: voiceSpeed.value,
          preview: true
        },
        signal: abortController.signal,
        responseType: 'blob'
      })

      if (requestId !== previewRequestId || abortController.signal.aborted) {
        return
      }

      const audio = new Audio(URL.createObjectURL(audioBlob))
      previewAudio = audio
      previewAudioUrl = audio.src
      isPreviewPlaying.value = true
      isPreviewLoading.value = false

      audio.addEventListener(
        'ended',
        () => {
          stopPreview()
        },
        { once: true }
      )
      audio.addEventListener(
        'error',
        () => {
          stopPreview()
          toast.add({
            title: 'Voice preview failed',
            description: 'Could not play the generated preview.',
            color: 'error'
          })
        },
        { once: true }
      )

      await audio.play()
    } catch (error: any) {
      if (abortController.signal.aborted) return

      stopPreview()
      toast.add({
        title: 'Voice preview failed',
        description: error?.data?.message || error?.message || 'Could not generate voice preview.',
        color: 'error'
      })
    } finally {
      if (previewAbortController === abortController) {
        previewAbortController = null
      }
      if (!isPreviewPlaying.value) {
        isPreviewLoading.value = false
      }
    }
  }

  watch(open, (value) => {
    if (!value) stopPreview()
  })

  onBeforeUnmount(() => {
    stopPreview()
  })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Voice Settings"
    description="Choose the default read-aloud voice and control automatic playback for new assistant messages."
  >
    <template #body>
      <div class="space-y-6">
        <div class="space-y-3">
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Gemini voice</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Choose the exact Gemini voice name used for read-aloud playback.
            </div>
          </div>

          <div class="space-y-2">
            <USelectMenu
              v-model="geminiVoiceName"
              :items="geminiVoiceItems"
              value-key="name"
              class="w-full"
              :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
            />
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Selected: {{ selectedGeminiVoice.name }} • {{ selectedGeminiVoice.descriptor }}
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Delivery style</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              This controls the speaking style layered on top of the selected Gemini voice.
            </div>
          </div>

          <div class="space-y-2">
            <USelectMenu
              v-model="voiceStyle"
              :items="styleItems"
              value-key="key"
              class="w-full"
              :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
            />
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Selected: {{ selectedVoicePreset.label }} • {{ selectedVoicePreset.description }}
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Reading speed</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Adjust how quickly the default voice reads assistant messages.
            </div>
          </div>

          <div class="grid gap-2 sm:grid-cols-3">
            <button
              v-for="option in speedOptions"
              :key="option.key"
              type="button"
              class="rounded-2xl border px-4 py-3 text-left transition"
              :class="
                voiceSpeed === option.key
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
              "
              @click="voiceSpeed = option.key"
            >
              <div class="font-medium text-gray-900 dark:text-gray-100">{{ option.label }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ option.description }}</div>
            </button>
          </div>
        </div>

        <div
          class="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              Automatically read new messages
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Start playback when a new assistant response finishes.
            </div>
          </div>
          <USwitch v-model="autoReadMessages" />
        </div>

        <div
          class="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Test voice</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Preview the currently selected Gemini voice, delivery style, and reading speed.
            </div>
          </div>
          <UButton
            color="neutral"
            :variant="isPreviewPlaying ? 'solid' : 'soft'"
            :icon="isPreviewPlaying ? 'i-heroicons-stop' : 'i-heroicons-speaker-wave'"
            :loading="isPreviewLoading"
            :label="isPreviewPlaying ? 'Stop preview' : 'Play preview'"
            @click="testVoice"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Current default: {{ selectedGeminiVoice.name }}, {{ selectedVoicePreset.label }},
          {{ voiceSpeed }}
        </div>
        <UButton color="neutral" label="Done" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
