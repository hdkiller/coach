<template>
  <div class="flex items-center gap-1">
    <!-- Thumbs Up -->
    <UTooltip text="Helpful">
      <UButton
        :color="feedback === 'THUMBS_UP' ? 'success' : 'neutral'"
        variant="ghost"
        size="xs"
        class="group/up"
        :loading="loading === 'THUMBS_UP'"
        @click="submitFeedback('THUMBS_UP')"
      >
        <template #leading>
          <UIcon
            v-if="feedback === 'THUMBS_UP'"
            name="i-heroicons-hand-thumb-up-solid"
            class="w-4 h-4 text-green-600"
          />
          <template v-else>
            <UIcon name="i-heroicons-hand-thumb-up" class="w-4 h-4 group-hover/up:hidden" />
            <UIcon
              name="i-heroicons-hand-thumb-up-solid"
              class="w-4 h-4 hidden group-hover/up:block text-green-600"
            />
          </template>
        </template>
      </UButton>
    </UTooltip>

    <!-- Thumbs Down -->
    <UTooltip text="Not helpful">
      <UButton
        :color="feedback === 'THUMBS_DOWN' ? 'error' : 'neutral'"
        variant="ghost"
        size="xs"
        class="group/down"
        :loading="loading === 'THUMBS_DOWN'"
        @click="handleThumbsDown"
      >
        <template #leading>
          <UIcon
            v-if="feedback === 'THUMBS_DOWN'"
            name="i-heroicons-hand-thumb-down-solid"
            class="w-4 h-4 text-red-600"
          />
          <template v-else>
            <UIcon name="i-heroicons-hand-thumb-down" class="w-4 h-4 group-hover/down:hidden" />
            <UIcon
              name="i-heroicons-hand-thumb-down-solid"
              class="w-4 h-4 hidden group-hover/down:block text-red-600"
            />
          </template>
        </template>
      </UButton>
    </UTooltip>

    <!-- Usage Link -->
    <UTooltip v-if="llmUsageId && !hideUsageLink" text="View AI Log">
      <UButton
        :to="`/ai/logs/${llmUsageId}`"
        color="neutral"
        variant="ghost"
        size="xs"
        target="_blank"
        class="group/log"
      >
        <template #leading>
          <UIcon name="i-heroicons-document-text" class="w-4 h-4 group-hover/log:hidden" />
          <UIcon
            name="i-heroicons-document-text-solid"
            class="w-4 h-4 hidden group-hover/log:block text-primary-500"
          />
        </template>
      </UButton>
    </UTooltip>

    <!-- Feedback Modal -->
    <UModal
      v-model:open="isModalOpen"
      title="Help us improve"
      description="Your feedback helps improve the AI coach."
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500">What went wrong with this response? (Optional)</p>
          <UTextarea
            v-model="feedbackText"
            placeholder="The advice was generic..."
            autofocus
            class="w-full"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isModalOpen = false">Skip</UButton>
          <UButton
            color="primary"
            :loading="loading === 'SUBMITTING_TEXT'"
            @click="submitTextFeedback"
          >
            Submit
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    llmUsageId?: string
    initialFeedback?: string | null
    initialFeedbackText?: string | null
    hideUsageLink?: boolean
  }>()

  const feedback = ref(props.initialFeedback)
  const feedbackText = ref(props.initialFeedbackText || '')
  const isModalOpen = ref(false)
  const loading = ref<string | null>(null)

  async function submitFeedback(type: 'THUMBS_UP' | 'THUMBS_DOWN', text?: string) {
    if (!props.llmUsageId) return

    loading.value = type
    try {
      await $fetch('/api/llm/feedback', {
        method: 'POST',
        body: {
          llmUsageId: props.llmUsageId,
          feedback: type,
          feedbackText: text
        }
      })
      feedback.value = type
    } catch (e) {
      console.error('Failed to submit feedback', e)
    } finally {
      loading.value = null
    }
  }

  function handleThumbsDown() {
    submitFeedback('THUMBS_DOWN')
    isModalOpen.value = true
  }

  async function submitTextFeedback() {
    loading.value = 'SUBMITTING_TEXT'
    try {
      await $fetch('/api/llm/feedback', {
        method: 'POST',
        body: {
          llmUsageId: props.llmUsageId,
          feedback: 'THUMBS_DOWN',
          feedbackText: feedbackText.value
        }
      })
      isModalOpen.value = false
    } catch (e) {
      console.error('Failed to submit text feedback', e)
    } finally {
      loading.value = null
    }
  }
</script>
