<template>
  <div class="space-y-4">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-else-if="link" class="space-y-4">
      <UFormField label="Link expiry">
        <USelect
          :model-value="expiryValue"
          :items="expiryOptions"
          value-key="value"
          class="w-44"
          @update:model-value="updateExpiryValue"
        />
      </UFormField>

      <UFormField label="Share Link">
        <div class="flex gap-2">
          <UInput :model-value="link" readonly class="flex-1" />
          <UButton icon="i-heroicons-clipboard" color="neutral" variant="outline" @click="emitCopy">
            Copy
          </UButton>
        </div>
      </UFormField>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        Anyone with this link can view this {{ resourceLabel }}. Links are read-only and use the
        expiry you selected when generated.
      </p>

      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Share directly
        </p>
        <div class="flex flex-wrap gap-2">
          <SocialShare
            v-for="network in networks"
            :key="network"
            :network="network"
            :url="link"
            :title="shareTitle"
            :styled="true"
            :label="true"
            class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          />
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
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    generate: [payload?: { expiresIn?: number | null; forceNew?: boolean }]
    copy: []
    'update:expiryValue': [value: string]
  }>()

  const expiryOptions = [
    { label: '1 day', value: '86400' },
    { label: '7 days', value: '604800' },
    { label: '30 days', value: '2592000' },
    { label: '90 days', value: '7776000' },
    { label: 'Never', value: 'never' }
  ]

  const networks = ['x', 'facebook', 'linkedin', 'reddit', 'whatsapp', 'telegram', 'email']

  const parseExpiryValue = (value: string): number | null => {
    if (value === 'never') return null
    const seconds = Number.parseInt(value, 10)
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 30 * 24 * 60 * 60
  }

  const updateExpiryValue = (value: string | number) => {
    const nextValue = String(value)
    emit('update:expiryValue', nextValue)

    if (props.link) {
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

  const emitCopy = () => emit('copy')
</script>
