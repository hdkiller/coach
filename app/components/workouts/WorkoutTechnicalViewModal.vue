<template>
  <UModal
    v-model:open="isOpen"
    title="Workout Structure View"
    description="Preview the Intervals.icu description and inspect the raw template JSON."
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="p-6 space-y-4">
        <UTabs v-model="viewTab" :items="viewTabs" />

        <div v-if="viewTab === 'intervals'" class="space-y-3">
          <div v-if="loading" class="space-y-2">
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-5/6" />
            <USkeleton class="h-4 w-2/3" />
          </div>
          <UAlert
            v-else-if="error"
            color="error"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-triangle"
          />
          <pre
            v-else
            class="text-xs whitespace-pre-wrap break-words max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-gray-800 dark:text-gray-100"
            >{{ intervalsPreviewText || 'No Intervals.icu description available.' }}</pre
          >
          <div class="flex justify-end">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-heroicons-clipboard-document"
              :disabled="!intervalsPreviewText"
              @click="copyViewContent('intervals')"
            >
              Copy Text
            </UButton>
          </div>
        </div>

        <div v-else class="space-y-3">
          <pre
            class="text-xs whitespace-pre-wrap break-words max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-gray-800 dark:text-gray-100"
            >{{ rawJson }}</pre
          >
          <div class="flex justify-end">
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-heroicons-clipboard-document"
              @click="copyViewContent('raw')"
            >
              Copy JSON
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  const props = defineProps<{
    workout: any
    isPlanned?: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  const isOpen = ref(true)
  const loading = ref(false)
  const intervalsPreviewText = ref('')
  const error = ref('')
  const viewTab = ref('intervals')
  const viewTabs = [
    { label: 'Intervals.icu', value: 'intervals' },
    { label: 'Raw JSON', value: 'raw' }
  ]

  const rawJson = computed(() => JSON.stringify(props.workout || {}, null, 2))
  const toast = useToast()

  async function fetchPreview() {
    if (!props.workout?.id) return

    loading.value = true
    error.value = ''
    try {
      const type = props.isPlanned ? 'planned' : 'library'
      const endpoint =
        type === 'planned'
          ? `/api/workouts/planned/${props.workout.id}/intervals-preview`
          : `/api/library/workouts/${props.workout.id}/intervals-preview`

      const response = await $fetch<{ intervalsDescription: string }>(endpoint)
      intervalsPreviewText.value = response?.intervalsDescription || ''
    } catch (e: any) {
      error.value = e?.data?.message || 'Failed to load Intervals.icu preview.'
    } finally {
      loading.value = false
    }
  }

  async function copyViewContent(kind: 'intervals' | 'raw') {
    const text = kind === 'intervals' ? intervalsPreviewText.value : rawJson.value
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.add({
        title: kind === 'intervals' ? 'Text Copied' : 'JSON Copied',
        color: 'success'
      })
    } catch {
      toast.add({
        title: 'Copy Failed',
        color: 'error'
      })
    }
  }

  watch(
    () => props.workout?.id,
    (newId) => {
      if (newId) fetchPreview()
    },
    { immediate: true }
  )

  watch(isOpen, (val) => {
    if (!val) emit('update:open', false)
  })
</script>
