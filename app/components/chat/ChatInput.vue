<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

  type ChatAttachment = {
    id: string
    url: string
    mediaType: string
    filename?: string
    size?: number
  }

  const props = withDefaults(
    defineProps<{
      modelValue: string
      status: any
      error?: any
      disabled?: boolean
      mobileEnterBehavior?: 'newline' | 'send'
    }>(),
    {
      error: undefined,
      disabled: false,
      mobileEnterBehavior: 'newline'
    }
  )

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'submit', payload: { text: string; attachments: ChatAttachment[] }, event?: Event): void
  }>()

  const promptRef = ref<any>(null)
  const imageInputRef = ref<HTMLInputElement | null>(null)
  const cameraInputRef = ref<HTMLInputElement | null>(null)
  const audioChunks = ref<Blob[]>([])
  const attachments = ref<ChatAttachment[]>([])
  const uploadingCount = ref(0)
  const isRecording = ref(false)
  const isTranscribing = ref(false)
  const recordingElapsedMs = ref(0)
  const toast = useToast()
  let attachedTextarea: HTMLTextAreaElement | null = null
  let mediaRecorder: MediaRecorder | null = null
  let mediaStream: MediaStream | null = null
  let recordingStartedAt = 0
  let recordingInterval: ReturnType<typeof setInterval> | null = null

  const composerDisabled = computed(
    () => props.disabled || uploadingCount.value > 0 || isTranscribing.value
  )

  const isLikelyMobile = () => {
    if (!import.meta.client) return false
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    )
  }

  const resolveTextarea = (): HTMLTextAreaElement | null => {
    const direct = promptRef.value?.textarea
    if (direct instanceof HTMLTextAreaElement) return direct

    const root = promptRef.value?.$el as HTMLElement | undefined
    return root?.querySelector('textarea') || null
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const resetImageInput = (input: HTMLInputElement | null) => {
    if (input) input.value = ''
  }

  const handleTextareaKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.isComposing) return
    if (props.mobileEnterBehavior !== 'newline' || !isLikelyMobile()) return
    if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return

    event.preventDefault()
    event.stopPropagation()

    const target = event.target as HTMLTextAreaElement | null
    if (!target) return

    const value = props.modelValue || ''
    const start = target.selectionStart ?? value.length
    const end = target.selectionEnd ?? value.length
    const nextValue = `${value.slice(0, start)}\n${value.slice(end)}`

    emit('update:modelValue', nextValue)

    nextTick(() => {
      const textarea = resolveTextarea()
      if (!textarea) return
      const cursor = start + 1
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const attachTextareaListener = () => {
    const textarea = resolveTextarea()
    if (!textarea || textarea === attachedTextarea) return

    if (attachedTextarea) {
      attachedTextarea.removeEventListener('keydown', handleTextareaKeydown, true)
      attachedTextarea.removeEventListener('paste', handlePaste, true)
    }

    textarea.addEventListener('keydown', handleTextareaKeydown, true)
    textarea.addEventListener('paste', handlePaste, true)
    attachedTextarea = textarea
  }

  const uploadFiles = async (fileList: FileList | null, inputEl: HTMLInputElement | null) => {
    const files = Array.from(fileList || [])
    resetImageInput(inputEl)
    if (!files.length) return
    await uploadImageFiles(files)
  }

  const uploadImageFiles = async (files: File[]) => {
    if (!files.length) return

    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length !== files.length) {
      toast.add({
        title: 'Unsupported file',
        description: 'Only image uploads are supported in chat.',
        color: 'error'
      })
    }

    for (const file of imageFiles.slice(0, 4)) {
      uploadingCount.value += 1
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await $fetch<{ url: string }>('/api/storage/upload', {
          method: 'POST',
          body: formData
        })

        attachments.value.push({
          id: crypto.randomUUID(),
          url: response.url,
          mediaType: file.type,
          filename: file.name,
          size: file.size
        })
      } catch (error: any) {
        toast.add({
          title: 'Upload failed',
          description: error?.data?.message || `Could not upload ${file.name}.`,
          color: 'error'
        })
      } finally {
        uploadingCount.value = Math.max(0, uploadingCount.value - 1)
      }
    }
  }

  const handlePaste = async (event: ClipboardEvent) => {
    if (composerDisabled.value) return

    const pastedImages = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file)

    if (pastedImages.length === 0) return

    event.preventDefault()
    await uploadImageFiles(pastedImages)
  }

  const removeAttachment = (attachmentId: string) => {
    attachments.value = attachments.value.filter((attachment) => attachment.id !== attachmentId)
  }

  const openLibrary = () => imageInputRef.value?.click()
  const openCamera = () => cameraInputRef.value?.click()

  const cleanupRecorder = () => {
    mediaRecorder = null
    audioChunks.value = []
    if (recordingInterval) {
      clearInterval(recordingInterval)
      recordingInterval = null
    }
    recordingElapsedMs.value = 0
    mediaStream?.getTracks().forEach((track) => track.stop())
    mediaStream = null
    isRecording.value = false
  }

  const appendTranscript = (text: string) => {
    const current = props.modelValue.trim()
    const next = current ? `${current} ${text}` : text
    emit('update:modelValue', next)
    nextTick(() => {
      resolveTextarea()?.focus()
    })
  }

  const stopRecording = async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return
    mediaRecorder.stop()
  }

  const startRecording = async () => {
    if (!import.meta.client || props.disabled) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.add({
        title: 'Dictation unavailable',
        description: 'This browser does not support microphone recording.',
        color: 'error'
      })
      return
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      mediaRecorder = mimeType
        ? new MediaRecorder(mediaStream, { mimeType })
        : new MediaRecorder(mediaStream)
      audioChunks.value = []

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) audioChunks.value.push(event.data)
      })

      mediaRecorder.addEventListener('stop', async () => {
        const outputType = mediaRecorder?.mimeType || 'audio/webm'
        const blob = new Blob(audioChunks.value, { type: outputType })
        cleanupRecorder()

        if (!blob.size) return

        isTranscribing.value = true
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'dictation.webm')

          const response = await $fetch<{ transcript: string }>('/api/chat/transcribe', {
            method: 'POST',
            body: formData
          })

          if (response.transcript?.trim()) {
            appendTranscript(response.transcript.trim())
          }
        } catch (error: any) {
          toast.add({
            title: 'Transcription failed',
            description: error?.data?.message || 'Could not transcribe your voice note.',
            color: 'error'
          })
        } finally {
          isTranscribing.value = false
        }
      })

      mediaRecorder.start()
      isRecording.value = true
      recordingStartedAt = Date.now()
      recordingElapsedMs.value = 0
      recordingInterval = setInterval(() => {
        recordingElapsedMs.value = Date.now() - recordingStartedAt
      }, 250)
    } catch (error) {
      cleanupRecorder()
      toast.add({
        title: 'Microphone access denied',
        description: 'Allow microphone access to use dictation.',
        color: 'error'
      })
    }
  }

  const toggleRecording = async () => {
    if (isTranscribing.value) return
    if (isRecording.value) {
      await stopRecording()
      return
    }
    await startRecording()
  }

  const recordingLabel = computed(() => {
    const totalSeconds = Math.floor(recordingElapsedMs.value / 1000)
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  })

  const handleSubmit = (event?: Event) => {
    event?.preventDefault?.()

    const text = props.modelValue
    if (!text.trim() && attachments.value.length === 0) return
    if (composerDisabled.value) return

    emit(
      'submit',
      {
        text,
        attachments: [...attachments.value]
      },
      event
    )

    attachments.value = []
  }

  onMounted(() => {
    nextTick(() => {
      attachTextareaListener()
    })
  })

  onUpdated(() => {
    attachTextareaListener()
  })

  onBeforeUnmount(() => {
    if (attachedTextarea) {
      attachedTextarea.removeEventListener('keydown', handleTextareaKeydown, true)
      attachedTextarea.removeEventListener('paste', handlePaste, true)
      attachedTextarea = null
    }
    cleanupRecorder()
  })

  defineExpose({
    clearAttachments: () => {
      attachments.value = []
    },
    focus: () => {
      if (promptRef.value?.textarea) {
        promptRef.value.textarea.focus()
      } else if (typeof promptRef.value?.focus === 'function') {
        promptRef.value.focus()
      }
    }
  })
</script>

<template>
  <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
    <UContainer class="space-y-3 py-2 sm:py-4 px-2 sm:px-4">
      <input
        ref="imageInputRef"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="uploadFiles(($event.target as HTMLInputElement)?.files || null, imageInputRef)"
      />
      <input
        ref="cameraInputRef"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="uploadFiles(($event.target as HTMLInputElement)?.files || null, cameraInputRef)"
      />

      <div v-if="attachments.length > 0" class="flex flex-wrap gap-3">
        <div
          v-for="attachment in attachments"
          :key="attachment.id"
          class="relative w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <img
            :src="attachment.url"
            :alt="attachment.filename || 'Attachment preview'"
            class="h-24 w-full object-cover"
          />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
            @click="removeAttachment(attachment.id)"
          >
            <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
          </button>
          <div class="border-t border-gray-200 px-2 py-1 text-[11px] dark:border-gray-800">
            <div class="truncate">{{ attachment.filename || 'Image' }}</div>
            <div class="text-gray-500">{{ formatFileSize(attachment.size) }}</div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-heroicons-photo"
          :disabled="composerDisabled"
          @click="openLibrary"
        >
          Photo
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-heroicons-camera"
          :disabled="composerDisabled"
          @click="openCamera"
        >
          Camera
        </UButton>
        <UButton
          :color="isRecording ? 'error' : 'neutral'"
          variant="ghost"
          size="xs"
          :icon="isRecording ? 'i-heroicons-stop-circle' : 'i-heroicons-microphone'"
          :disabled="props.disabled || isTranscribing"
          @click="toggleRecording"
        >
          {{
            isRecording ? `Stop ${recordingLabel}` : isTranscribing ? 'Transcribing...' : 'Dictate'
          }}
        </UButton>
        <span v-if="uploadingCount > 0">Uploading image...</span>
        <span v-else-if="isRecording">Recording voice note...</span>
        <span v-else-if="isTranscribing">Gemini is transcribing your voice note...</span>
      </div>

      <UChatPrompt
        ref="promptRef"
        :model-value="modelValue"
        :error="error"
        :disabled="composerDisabled"
        placeholder="Ask Coach Watts, add a meal photo, or dictate a note..."
        :ui="{
          base: 'max-h-[min(400px,40vh)] overflow-hidden flex flex-col'
        }"
        @update:model-value="emit('update:modelValue', $event)"
        @submit="handleSubmit"
      >
        <UChatPromptSubmit :status="status" :disabled="composerDisabled" />
      </UChatPrompt>
    </UContainer>
  </div>
</template>
