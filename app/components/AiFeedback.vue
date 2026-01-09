<template>
  <div class="flex items-center gap-1">
    <!-- Thumbs Up -->
    <UTooltip text="Helpful">
      <UButton
        :icon="
          feedback === 'THUMBS_UP' ? 'i-heroicons-hand-thumb-up-solid' : 'i-heroicons-hand-thumb-up'
        "
        :color="feedback === 'THUMBS_UP' ? 'green' : 'gray'"
        variant="ghost"
        size="xs"
        :loading="loading === 'THUMBS_UP'"
        @click="submitFeedback('THUMBS_UP')"
      />
    </UTooltip>

    <!-- Thumbs Down -->
    <UTooltip text="Not helpful">
      <UButton
        :icon="
          feedback === 'THUMBS_DOWN'
            ? 'i-heroicons-hand-thumb-down-solid'
            : 'i-heroicons-hand-thumb-down'
        "
        :color="feedback === 'THUMBS_DOWN' ? 'red' : 'gray'"
        variant="ghost"
        size="xs"
        :loading="loading === 'THUMBS_DOWN'"
        @click="handleThumbsDown"
      />
    </UTooltip>

    <!-- Usage Link -->
    <UTooltip v-if="llmUsageId && !hideUsageLink" text="View AI Log">
      <UButton
        :to="`/settings/llm/usage/${llmUsageId}`"
        icon="i-heroicons-document-text"
        color="gray"
        variant="ghost"
        size="xs"
        target="_blank"
      />
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
          <UButton color="gray" variant="ghost" @click="isModalOpen = false">Skip</UButton>
          <UButton
            color="black"
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
