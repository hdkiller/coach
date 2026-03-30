<template>
  <div class="space-y-6">
    <div v-if="loading && !link" class="flex items-center justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-else-if="link" class="space-y-6">
      <div v-if="isWorkoutShare && imageVariants.length > 0" class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <p
            class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1"
          >
            Share Images
          </p>
          <div
            v-if="loading"
            class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
          >
            <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin" />
            Refreshing link
          </div>
        </div>

        <div class="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          <div
            v-for="imageVariant in imageVariants"
            :key="imageVariant.id"
            class="w-[82%] shrink-0 snap-center rounded-3xl border border-gray-200 bg-white/90 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-[320px] dark:border-white/10 dark:bg-gray-900/70"
          >
            <button
              type="button"
              class="block w-full text-left"
              @click="handleOpenImage(imageVariant.id)"
            >
              <div
                class="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-gray-950"
                :class="imageVariant.previewClass"
              >
                <img
                  :src="imageVariant.previewUrl"
                  :alt="imageVariant.label"
                  class="block h-56 w-full object-contain"
                  loading="eager"
                />
              </div>

              <div class="mt-3">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ imageVariant.label }}
                </p>
                <p class="mt-2 text-[11px] font-medium text-primary-600 dark:text-primary-400">
                  Tap to share or open
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between gap-3">
          <p
            class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1"
          >
            Share Link
          </p>
          <p
            v-if="isGeneratedMode"
            class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mr-1"
          >
            Link Expiry
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative min-w-0 flex-1 group">
            <UInput
              :model-value="link"
              readonly
              size="xl"
              class="w-full font-medium"
              :ui="{
                base: 'rounded-2xl pr-20 focus:ring-primary-500/50'
              }"
              @focus="handleFocus"
            >
              <template #trailing>
                <div class="flex items-center pr-1">
                  <UButton
                    :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
                    :color="copied ? 'success' : 'neutral'"
                    variant="ghost"
                    size="sm"
                    class="rounded-xl transition-all duration-300"
                    @click="handleCopy"
                  >
                    {{ copied ? 'Copied' : 'Copy' }}
                  </UButton>
                </div>
              </template>
            </UInput>
          </div>

          <USelect
            v-if="isGeneratedMode"
            :model-value="expiryValue"
            :items="expiryOptions"
            value-key="value"
            class="w-full sm:w-44"
            @update:model-value="updateExpiryValue"
          />
        </div>
      </div>

      <div class="space-y-4">
        <p
          class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1"
        >
          Direct Share
        </p>
        <p
          v-if="resourceLabel === 'workout'"
          class="text-[9px] text-gray-500 italic ml-1 -mt-3 mb-2"
        >
          Note: Link previews on Facebook/X will automatically include your workout image.
        </p>
        <div class="grid grid-cols-4 sm:grid-cols-8 gap-3">
          <div
            v-for="network in networks"
            :key="network"
            class="group/share-item"
            @click="emitNetworkClick(network)"
          >
            <SocialShare
              :network="network"
              :url="link"
              :title="shareTitle"
              :styled="false"
              :label="false"
              class="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/40 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-primary-500/5 group-hover/share-item:border-primary-500/20"
            >
              <template #default="{ icon }">
                <UIcon
                  :name="icon"
                  class="w-6 h-6 transition-all duration-300 opacity-80 group-hover/share-item:opacity-100 group-hover/share-item:scale-110"
                  :style="{ color: getNetworkColor(network) }"
                />
              </template>
            </SocialShare>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-8 text-center">
      <UFormField label="Link expiry" class="mb-3 w-full max-w-xs text-left">
        <USelect
          :model-value="expiryValue"
          :items="expiryOptions"
          value-key="value"
          class="w-full"
          @update:model-value="updateExpiryValue"
        />
      </UFormField>
      <UIcon name="i-heroicons-link" class="mb-2 h-8 w-8 text-gray-400" />
      <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Create a share link, then post it or send it directly.
      </p>
      <UButton color="primary" :loading="loading" @click="emitGenerateWithExpiry">
        Generate Link
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface Props {
    link: string
    loading: boolean
    resourceLabel: string
    shareTitle: string
    expiryValue: string
    mode?: 'generated' | 'static'
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    generate: [payload?: { expiresIn?: number | null; forceNew?: boolean }]
    copy: []
    networkClick: [network: string]
    'update:expiryValue': [value: string]
  }>()

  const copied = ref(false)
  const expiryOptions = [
    { label: '1 day', value: '86400' },
    { label: '7 days', value: '604800' },
    { label: '30 days', value: '2592000' },
    { label: '90 days', value: '7776000' },
    { label: 'Never', value: 'never' }
  ]

  const networks = ['x', 'facebook', 'linkedin', 'reddit', 'whatsapp', 'telegram', 'email']
  const isGeneratedMode = computed(() => props.mode !== 'static')
  const isWorkoutShare = computed(() => props.resourceLabel === 'workout')
  const shareToken = computed(() => {
    if (!props.link) return ''

    const parts = props.link.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  })
  const imageVariants = computed(() => {
    if (!isWorkoutShare.value || !shareToken.value) return []

    return [
      {
        id: 'default',
        label: 'Standard',
        previewUrl: buildImageUrl({ variant: 'default', style: 'map' }),
        previewClass: ''
      },
      {
        id: 'flat',
        label: 'Flat',
        previewUrl: buildImageUrl({ variant: 'flat', style: 'map' }),
        previewClass: ''
      },
      {
        id: 'transparent',
        label: 'Transparent',
        previewUrl: buildImageUrl({ variant: 'transparent', style: 'map' }),
        previewClass:
          'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06))] dark:bg-[length:24px_24px] dark:bg-[position:0_0,12px_12px]'
      },
      {
        id: 'poster',
        label: 'Poster',
        previewUrl: buildImageUrl({ variant: 'default', style: 'poster' }),
        previewClass: ''
      },
      {
        id: 'poster-transparent',
        label: 'Poster Clear',
        previewUrl: buildImageUrl({ variant: 'transparent', style: 'poster' }),
        previewClass:
          'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06))] dark:bg-[length:24px_24px] dark:bg-[position:0_0,12px_12px]'
      },
      {
        id: 'crest',
        label: 'Crest',
        previewUrl: buildImageUrl({ variant: 'default', style: 'crest' }),
        previewClass: ''
      },
      {
        id: 'crest-transparent',
        label: 'Crest Clear',
        previewUrl: buildImageUrl({ variant: 'transparent', style: 'crest' }),
        previewClass:
          'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06))] dark:bg-[length:24px_24px] dark:bg-[position:0_0,12px_12px]'
      },
      {
        id: 'pulse',
        label: 'Pulse',
        previewUrl: buildImageUrl({ variant: 'default', style: 'pulse' }),
        previewClass: ''
      },
      {
        id: 'pulse-transparent',
        label: 'Pulse Clear',
        previewUrl: buildImageUrl({ variant: 'transparent', style: 'pulse' }),
        previewClass:
          'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06))] dark:bg-[length:24px_24px] dark:bg-[position:0_0,12px_12px]'
      }
    ]
  })
  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      x: '#000000',
      facebook: '#1877F2',
      linkedin: '#0A66C2',
      reddit: '#FF4500',
      whatsapp: '#25D366',
      telegram: '#26A5E4',
      email: '#6366F1'
    }
    return colors[network] || '#6366F1'
  }

  const handleCopy = () => {
    emit('copy')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }

  const handleFocus = (event: FocusEvent) => {
    ;(event.target as HTMLInputElement).select()
  }

  const parseExpiryValue = (value: string): number | null => {
    if (value === 'never') return null
    const seconds = Number.parseInt(value, 10)
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 30 * 24 * 60 * 60
  }

  const updateExpiryValue = (value: string | number) => {
    const nextValue = String(value)
    emit('update:expiryValue', nextValue)

    if (props.link && isGeneratedMode.value) {
      emit('generate', {
        expiresIn: parseExpiryValue(nextValue),
        forceNew: true
      })
    }
  }

  const emitGenerateWithExpiry = () =>
    emit('generate', {
      expiresIn: parseExpiryValue(props.expiryValue),
      forceNew: true
    })

  const emitNetworkClick = (network: string) => emit('networkClick', network)
  const imageRenderVersion = '2026-03-08c'

  const buildImageUrl = (options: {
    variant: 'default' | 'flat' | 'transparent'
    style: 'map' | 'poster' | 'crest' | 'pulse'
  }) => {
    if (!shareToken.value) return ''
    const params = new URLSearchParams()
    if (options.variant !== 'default') params.set('variant', options.variant)
    if (options.style !== 'map') params.set('style', options.style)
    params.set('v', imageRenderVersion)
    const query = params.toString()
    return `/api/share/workouts/${shareToken.value}/image${query ? `?${query}` : ''}`
  }

  const variantConfigById = computed(
    () =>
      new Map<
        string,
        {
          variant: 'default' | 'flat' | 'transparent'
          style: 'map' | 'poster' | 'crest' | 'pulse'
        }
      >(
        imageVariants.value.map((item) => [
          item.id,
          {
            variant: (item.id === 'flat'
              ? 'flat'
              : item.id.includes('transparent')
                ? 'transparent'
                : item.id === 'transparent'
                  ? 'transparent'
                  : 'default') as 'default' | 'flat' | 'transparent',
            style: (item.id.startsWith('poster')
              ? 'poster'
              : item.id.startsWith('crest')
                ? 'crest'
                : item.id.startsWith('pulse')
                  ? 'pulse'
                  : 'map') as 'map' | 'poster' | 'crest' | 'pulse'
          }
        ])
      )
  )

  const handleOpenImage = async (imageId: string = 'default') => {
    const config = variantConfigById.value.get(imageId) || { variant: 'default', style: 'map' }
    const imageUrl = buildImageUrl(config)
    if (!imageUrl) return

    if (
      import.meta.client &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title: props.shareTitle,
          url: imageUrl
        })
        return
      } catch (error: any) {
        if (error?.name === 'AbortError') return
      }
    }

    window.open(imageUrl, '_blank', 'noopener,noreferrer')
  }
</script>
