<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('chat')

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
      queuedCount?: number
      hasActiveTurn?: boolean
      mobileEnterBehavior?: 'newline' | 'send'
    }>(),
    {
      error: undefined,
      disabled: false,
      queuedCount: 0,
      hasActiveTurn: false,
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
  const videoInputRef = ref<HTMLInputElement | null>(null)
  const webcamVideoRef = ref<HTMLVideoElement | null>(null)
  const audioChunks = ref<Blob[]>([])
  const attachments = ref<ChatAttachment[]>([])
  const uploadingCount = ref(0)
  const isRecording = ref(false)
  const isTranscribing = ref(false)
  const recordingElapsedMs = ref(0)
  const isWebcamModalOpen = ref(false)
  const isOpeningWebcam = ref(false)
  const isCapturingWebcam = ref(false)
  const webcamMode = ref<'photo' | 'video'>('photo')
  const isRecordingWebcamVideo = ref(false)
  const webcamRecordingElapsedMs = ref(0)
  const isLikelyMobileClient = ref(false)
  const hasHydratedClientCapabilities = ref(false)
  const toast = useToast()
  let attachedTextarea: HTMLTextAreaElement | null = null
  let mediaRecorder: MediaRecorder | null = null
  let mediaStream: MediaStream | null = null
  let webcamStream: MediaStream | null = null
  let webcamRecorder: MediaRecorder | null = null
  let webcamVideoChunks: Blob[] = []
  let recordingStartedAt = 0
  let recordingInterval: ReturnType<typeof setInterval> | null = null
  let webcamRecordingInterval: ReturnType<typeof setInterval> | null = null
  let webcamRecordingStopTimeout: ReturnType<typeof setTimeout> | null = null

  const composerDisabled = computed(
    () =>
      props.disabled || uploadingCount.value > 0 || isTranscribing.value || isOpeningWebcam.value
  )
  const hasTextContent = computed(() => !!props.modelValue.trim())
  const hasAttachmentOnlyMessage = computed(
    () => !hasTextContent.value && attachments.value.length > 0
  )
  const showInlineMic = computed(() => !hasTextContent.value && attachments.value.length === 0)
  const isMobileUi = computed(() =>
    hasHydratedClientCapabilities.value ? isLikelyMobileClient.value : false
  )
  const placeholderText = computed(() =>
    isMobileUi.value ? t.value('input_placeholder_mobile') : t.value('input_placeholder_desktop')
  )
  const canUseDesktopWebcam = computed(() => {
    if (!hasHydratedClientCapabilities.value) return false
    return !isLikelyMobileClient.value && !!navigator.mediaDevices?.getUserMedia
  })
  const queueLabel = computed(() => {
    if (!props.queuedCount) return ''
    return props.queuedCount === 1 ? '1 message queued' : `${props.queuedCount} messages queued`
  })
  const attachmentMenuItems = computed(() => [
    [
      ...(canUseDesktopWebcam.value
        ? [
            {
              label: t.value('input_action_take_photo'),
              icon: 'i-heroicons-camera',
              disabled: composerDisabled.value,
              onSelect: () => openDesktopWebcam('photo')
            },
            {
              label: t.value('input_action_record_video'),
              icon: 'i-heroicons-film',
              disabled: composerDisabled.value,
              onSelect: () => openDesktopWebcam('video')
            }
          ]
        : []),
      {
        label: canUseDesktopWebcam.value
          ? t.value('input_action_add_files')
          : t.value('input_action_take_photo'),
        icon: canUseDesktopWebcam.value ? 'i-heroicons-folder-open' : 'i-heroicons-camera',
        disabled: composerDisabled.value,
        onSelect: () => (canUseDesktopWebcam.value ? openLibrary() : openCamera())
      },
      ...(canUseDesktopWebcam.value
        ? []
        : [
            {
              label: t.value('input_action_record_video'),
              icon: 'i-heroicons-film',
              disabled: composerDisabled.value,
              onSelect: () => openMobileVideo()
            },
            {
              label: t.value('input_action_add_files'),
              icon: 'i-heroicons-folder-open',
              disabled: composerDisabled.value,
              onSelect: () => openLibrary()
            }
          ])
    ]
  ])

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

  const isImageAttachment = (attachment: ChatAttachment) =>
    attachment.mediaType.startsWith('image/')
  const isVideoAttachment = (attachment: ChatAttachment) =>
    attachment.mediaType.startsWith('video/')

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })

  const loadImageElement = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to load image'))
      image.src = src
    })

  const normalizeImageForUpload = async (file: File) => {
    if (!import.meta.client) return file
    if (
      file.type === 'image/gif' ||
      file.type === 'image/svg+xml' ||
      (file.type === 'image/webp' && file.size <= 4 * 1024 * 1024) ||
      (file.type === 'image/jpeg' && file.size <= 4 * 1024 * 1024) ||
      (file.type === 'image/png' && file.size <= 4 * 1024 * 1024)
    ) {
      return file
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const image = await loadImageElement(dataUrl)
      const maxDimension = 1600
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      const scale = Math.min(1, maxDimension / Math.max(width, height))
      const targetWidth = Math.max(1, Math.round(width * scale))
      const targetHeight = Math.max(1, Math.round(height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight

      const context = canvas.getContext('2d')
      if (!context) return file

      context.drawImage(image, 0, 0, targetWidth, targetHeight)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.86)
      })
      if (!blob) return file

      const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'upload'
      return new File([blob], `${normalizedName}.jpg`, { type: 'image/jpeg' })
    } catch {
      return file
    }
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

  const uploadMediaFiles = async (files: File[]) => {
    if (!files.length) return

    const supportedFiles = files.filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    )
    if (supportedFiles.length !== files.length) {
      toast.add({
        title: t.value('input_error_unsupported_file'),
        description: t.value('input_error_unsupported_file_desc'),
        color: 'error'
      })
    }

    for (const file of supportedFiles.slice(0, 4)) {
      uploadingCount.value += 1
      try {
        const normalizedFile = file.type.startsWith('image/')
          ? await normalizeImageForUpload(file)
          : file
        const formData = new FormData()
        formData.append('file', normalizedFile)

        const response = await ($fetch as any)('/api/storage/upload', {
          method: 'POST',
          body: formData
        })

        attachments.value.push({
          id: crypto.randomUUID(),
          url: response.url,
          mediaType: normalizedFile.type || file.type,
          filename: normalizedFile.name || file.name,
          size: normalizedFile.size || file.size
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

  const uploadImageFiles = async (files: File[]) => {
    await uploadMediaFiles(files)
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
  const openMobileVideo = () => videoInputRef.value?.click()

  const stopWebcam = () => {
    webcamRecorder?.stream?.getTracks?.().forEach(() => {})
    webcamRecorder = null
    webcamVideoChunks = []
    if (webcamRecordingInterval) {
      clearInterval(webcamRecordingInterval)
      webcamRecordingInterval = null
    }
    if (webcamRecordingStopTimeout) {
      clearTimeout(webcamRecordingStopTimeout)
      webcamRecordingStopTimeout = null
    }
    webcamRecordingElapsedMs.value = 0
    isRecordingWebcamVideo.value = false
    webcamStream?.getTracks().forEach((track) => track.stop())
    webcamStream = null
    if (webcamVideoRef.value) {
      webcamVideoRef.value.srcObject = null
    }
    isOpeningWebcam.value = false
    isCapturingWebcam.value = false
  }

  const openDesktopWebcam = async (mode: 'photo' | 'video') => {
    if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) {
      toast.add({
        title: t.value('input_error_webcam_unavailable'),
        description: t.value('input_error_webcam_unavailable_desc'),
        color: 'error'
      })
      return
    }

    webcamMode.value = mode
    isWebcamModalOpen.value = true
    isOpeningWebcam.value = true

    try {
      stopWebcam()
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: mode === 'video'
      })

      await nextTick()

      if (webcamVideoRef.value) {
        webcamVideoRef.value.srcObject = webcamStream
        await webcamVideoRef.value.play()
      }
    } catch (error) {
      stopWebcam()
      isWebcamModalOpen.value = false
      toast.add({
        title: t.value('input_error_webcam_denied'),
        description: t.value('input_error_webcam_denied_desc'),
        color: 'error'
      })
    } finally {
      isOpeningWebcam.value = false
    }
  }

  const captureDesktopPhoto = async () => {
    if (!import.meta.client || !webcamVideoRef.value || !webcamStream) return

    isCapturingWebcam.value = true
    try {
      const video = webcamVideoRef.value
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable')

      context.drawImage(video, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      )
      if (!blob) throw new Error('Could not create photo')

      const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' })
      await uploadImageFiles([file])
      isWebcamModalOpen.value = false
    } catch (error: any) {
      toast.add({
        title: t.value('input_error_capture_failed'),
        description: error?.message || 'Could not capture webcam photo.',
        color: 'error'
      })
    } finally {
      isCapturingWebcam.value = false
    }
  }

  const stopDesktopVideoRecording = async () => {
    if (!webcamRecorder || webcamRecorder.state === 'inactive') return
    webcamRecorder.stop()
  }

  const startDesktopVideoRecording = async () => {
    if (!import.meta.client || !webcamStream) return
    if (typeof MediaRecorder === 'undefined') {
      toast.add({
        title: t.value('input_error_video_unavailable'),
        description: t.value('input_error_video_unavailable_desc'),
        color: 'error'
      })
      return
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : ''

      webcamRecorder = mimeType
        ? new MediaRecorder(webcamStream, { mimeType })
        : new MediaRecorder(webcamStream)
      webcamVideoChunks = []

      webcamRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) webcamVideoChunks.push(event.data)
      })

      webcamRecorder.addEventListener('stop', async () => {
        const outputType = webcamRecorder?.mimeType || 'video/webm'
        const blob = new Blob(webcamVideoChunks, { type: outputType })
        webcamRecorder = null

        if (webcamRecordingInterval) {
          clearInterval(webcamRecordingInterval)
          webcamRecordingInterval = null
        }
        if (webcamRecordingStopTimeout) {
          clearTimeout(webcamRecordingStopTimeout)
          webcamRecordingStopTimeout = null
        }

        isRecordingWebcamVideo.value = false
        webcamRecordingElapsedMs.value = 0

        if (!blob.size) return

        try {
          const extension = outputType.includes('mp4') ? 'mp4' : 'webm'
          const file = new File([blob], `webcam-video-${Date.now()}.${extension}`, {
            type: outputType
          })
          await uploadMediaFiles([file])
          isWebcamModalOpen.value = false
        } catch (error: any) {
          toast.add({
            title: 'Upload failed',
            description: error?.message || 'Could not upload webcam video.',
            color: 'error'
          })
        }
      })

      webcamRecorder.start()
      isRecordingWebcamVideo.value = true
      webcamRecordingElapsedMs.value = 0
      const startedAt = Date.now()
      webcamRecordingInterval = setInterval(() => {
        webcamRecordingElapsedMs.value = Math.min(10000, Date.now() - startedAt)
      }, 100)
      webcamRecordingStopTimeout = setTimeout(() => {
        void stopDesktopVideoRecording()
      }, 10000)
    } catch (error) {
      webcamRecorder = null
      isRecordingWebcamVideo.value = false
      toast.add({
        title: 'Recording failed',
        description: 'Could not start webcam video recording.',
        color: 'error'
      })
    }
  }

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
        title: t.value('input_error_dictation_unavailable'),
        description: t.value('input_error_dictation_unavailable_desc'),
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

          const response = await ($fetch as any)('/api/chat/transcribe', {
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
        title: t.value('input_error_mic_denied'),
        description: t.value('input_error_mic_denied_desc'),
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

  const webcamRecordingLabel = computed(() => {
    const totalSeconds = Math.floor(webcamRecordingElapsedMs.value / 1000)
    const tenths = Math.floor((webcamRecordingElapsedMs.value % 1000) / 100)
    return `${String(totalSeconds).padStart(2, '0')}.${tenths}s`
  })
  const webcamRecordingProgress = computed(() =>
    Math.max(0, 100 - (webcamRecordingElapsedMs.value / 10000) * 100)
  )

  const webcamModalTitle = computed(() =>
    webcamMode.value === 'video'
      ? t.value('modal_webcam_video_title')
      : t.value('modal_webcam_photo_title')
  )
  const webcamModalDescription = computed(() =>
    webcamMode.value === 'video'
      ? t.value('modal_webcam_video_desc')
      : t.value('modal_webcam_photo_desc')
  )

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
    isLikelyMobileClient.value = isLikelyMobile()
    hasHydratedClientCapabilities.value = true
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
    stopWebcam()
  })

  watch(isWebcamModalOpen, (open) => {
    if (!open) stopWebcam()
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
    <UContainer
      class="space-y-3 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:px-4 sm:py-4 sm:pb-4"
    >
      <input
        ref="imageInputRef"
        type="file"
        accept="image/*,video/*"
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
      <input
        ref="videoInputRef"
        type="file"
        accept="video/*"
        capture="environment"
        class="hidden"
        @change="uploadFiles(($event.target as HTMLInputElement)?.files || null, videoInputRef)"
      />

      <div v-if="attachments.length > 0" class="flex flex-wrap gap-3">
        <div
          v-for="attachment in attachments"
          :key="attachment.id"
          class="relative w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <img
            v-if="isImageAttachment(attachment)"
            :src="attachment.url"
            :alt="attachment.filename || 'Attachment preview'"
            class="h-24 w-full object-cover"
          />
          <video
            v-else-if="isVideoAttachment(attachment)"
            :src="attachment.url"
            class="h-24 w-full bg-black object-cover"
            muted
            playsinline
          />
          <div
            v-else
            class="flex h-24 w-full items-center justify-center bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          >
            <UIcon name="i-heroicons-paper-clip" class="h-6 w-6" />
          </div>
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

      <div class="min-h-5 flex items-center text-xs text-gray-500 dark:text-gray-400">
        <span v-if="uploadingCount > 0">{{ t('input_uploading_attachment') }}</span>
        <span v-else-if="isRecording">{{ t('input_recording_voice') }}</span>
        <span v-else-if="isTranscribing">{{ t('input_transcribing') }}</span>
        <span v-else-if="props.queuedCount">
          {{ queueLabel }}{{ props.hasActiveTurn ? ' while the current reply finishes' : '' }}
        </span>
        <span v-else-if="isRecordingWebcamVideo">
          {{ t('input_recording_webcam', { time: webcamRecordingLabel }) }}
        </span>
      </div>

      <UChatPrompt
        ref="promptRef"
        class="min-w-0"
        :model-value="modelValue"
        :error="error"
        :disabled="composerDisabled"
        :placeholder="placeholderText"
        :ui="{
          root: 'w-full',
          base: 'max-h-[min(400px,40vh)] overflow-hidden flex flex-col ps-9',
          leading: 'inset-y-0 ps-0 flex items-center'
        }"
        @update:model-value="emit('update:modelValue', $event)"
        @submit="handleSubmit"
      >
        <template #leading>
          <UDropdownMenu :items="attachmentMenuItems" :content="{ side: 'top', align: 'start' }">
            <UButton
              color="neutral"
              variant="ghost"
              size="md"
              square
              icon="i-heroicons-plus"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              :disabled="composerDisabled"
              aria-label="Add attachment"
            />
          </UDropdownMenu>
        </template>

        <UButton
          :color="isRecording ? 'error' : showInlineMic ? 'primary' : 'neutral'"
          :variant="isRecording ? 'solid' : showInlineMic ? 'solid' : 'ghost'"
          size="md"
          square
          :icon="isRecording ? 'i-heroicons-stop-circle' : 'i-heroicons-microphone'"
          class="shrink-0"
          :disabled="props.disabled || isTranscribing"
          :aria-label="isRecording ? 'Stop dictation' : 'Start dictation'"
          @click="toggleRecording"
        />
        <UChatPromptSubmit
          v-if="hasAttachmentOnlyMessage"
          class="ml-1"
          :status="status"
          :disabled="composerDisabled"
          :on-click="handleSubmit"
        />
        <UChatPromptSubmit
          v-else-if="!showInlineMic"
          class="ml-1"
          :status="status"
          :disabled="composerDisabled"
        />
      </UChatPrompt>
    </UContainer>
  </div>

  <UModal
    v-model:open="isWebcamModalOpen"
    :title="webcamModalTitle"
    :description="webcamModalDescription"
  >
    <template #body>
      <div class="space-y-4">
        <div
          class="overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 dark:border-gray-800"
        >
          <video
            ref="webcamVideoRef"
            autoplay
            playsinline
            muted
            class="aspect-video w-full object-cover"
          />
        </div>

        <p v-if="isOpeningWebcam" class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('modal_webcam_starting') }}
        </p>
        <div
          v-if="webcamMode === 'video'"
          class="overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        >
          <div
            class="h-2 bg-primary transition-[width] duration-100 ease-linear"
            :style="{ width: `${webcamRecordingProgress}%` }"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('banner_exit')"
          :disabled="isCapturingWebcam || isRecordingWebcamVideo"
          @click="isWebcamModalOpen = false"
        />
        <UButton
          v-if="webcamMode === 'photo'"
          color="primary"
          variant="solid"
          icon="i-heroicons-camera"
          :label="t('modal_webcam_capture')"
          :loading="isCapturingWebcam || isOpeningWebcam"
          :disabled="isOpeningWebcam"
          @click="captureDesktopPhoto"
        />
        <UButton
          v-else-if="!isRecordingWebcamVideo"
          color="primary"
          variant="solid"
          icon="i-heroicons-video-camera"
          :label="t('modal_webcam_start_recording')"
          :loading="isOpeningWebcam"
          :disabled="isOpeningWebcam"
          @click="startDesktopVideoRecording"
        />
        <UButton
          v-else
          color="error"
          variant="solid"
          icon="i-heroicons-stop-circle"
          :label="t('modal_webcam_stop_recording')"
          @click="stopDesktopVideoRecording"
        />
      </div>
    </template>
  </UModal>
</template>
