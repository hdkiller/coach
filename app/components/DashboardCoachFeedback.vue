<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center space-x-2">
        <UIcon name="i-heroicons-video-camera" class="w-6 h-6 text-primary" />
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Coach Feedback</h2>
      </div>
    </template>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-40 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
    </div>

    <div v-else-if="error" class="text-red-500">Error loading feedback.</div>

    <div v-else-if="latestFeedback" class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Received on {{ formatDate(latestFeedback.date) }} from {{ latestFeedback.coachName }}
      </p>

      <div
        class="relative w-full pb-[56.25%] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center"
      >
        <!-- Komodo Video Player iframe -->
        <iframe
          v-if="latestFeedback.videoUrl"
          :src="latestFeedback.videoUrl"
          class="absolute top-0 left-0 w-full h-full border-0"
          allow="microphone; camera; display-capture"
          allowfullscreen
        ></iframe>
      </div>

      <div
        class="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-100 dark:border-primary-800"
      >
        <h4 class="font-medium text-primary-900 dark:text-primary-100 mb-2">Coach Notes</h4>
        <p class="text-sm text-primary-800 dark:text-primary-200">"{{ latestFeedback.message }}"</p>
      </div>
    </div>

    <div v-else class="py-8 text-center text-gray-500 dark:text-gray-400">
      <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>No feedback videos available yet.</p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'

  interface Feedback {
    id: string
    checkInId: string
    date: string
    coachName: string
    videoUrl: string
    message: string
  }

  const feedbackList = ref<Feedback[]>([])
  const loading = ref(true)
  const error = ref(false)

  onMounted(async () => {
    try {
      const response = await ($fetch as any)('/api/feedback')
      feedbackList.value = response.data
    } catch (e) {
      error.value = true
    } finally {
      loading.value = false
    }
  })

  const latestFeedback = computed(() => {
    return feedbackList.value.length > 0 ? feedbackList.value[0] : null
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }
</script>
