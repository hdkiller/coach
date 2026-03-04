<template>
  <div class="space-y-6">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-else-if="link" class="space-y-6">
      <UFormField v-if="isGeneratedMode" label="Link expiry">
        <USelect
          :model-value="expiryValue"
          :items="expiryOptions"
          value-key="value"
          class="w-44"
          @update:model-value="updateExpiryValue"
        />
      </UFormField>

      <div class="space-y-2">
        <p
          class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1"
        >
          Share Link
        </p>
        <div class="relative group">
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
      </div>

      <div class="space-y-4">
        <p
          class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1"
        >
          Direct Share
        </p>
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-3">
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
</script>
