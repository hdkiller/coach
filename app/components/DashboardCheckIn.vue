<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Weekly Check-In</h2>
        <UButton
          v-if="isFormOpen"
          color="gray"
          variant="ghost"
          icon="i-heroicons-x-mark"
          @click="isFormOpen = false"
        />
      </div>
    </template>

    <div v-if="status === 'pending'" class="animate-pulse space-y-4">
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>

    <div v-else-if="error || status === 'error'" class="space-y-4">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="soft"
        title="Failed to load check-ins"
        description="There was an issue connecting to the server. Please try again."
      />
      <UButton color="gray" variant="solid" icon="i-heroicons-arrow-path" @click="refresh()">
        Retry
      </UButton>
    </div>

    <div v-else>
      <div v-if="isFormOpen">
        <CheckInForm @success="handleSuccess" />
      </div>

      <div v-else>
        <div v-if="!latestCheckIn" class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            You haven't completed any check-ins yet. Please complete one so your coach can review
            your progress!
          </p>
          <UButton color="primary" @click="isFormOpen = true"> Start Check-In </UButton>
        </div>

        <div v-else class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            Great job! Here is your latest check-in summary.
          </p>
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 class="font-medium text-gray-900 dark:text-white mb-2">Latest Check-In Summary</h3>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li><strong>Date:</strong> {{ formatDate(latestCheckIn.createdAt) }}</li>
              <li>
                <strong>Fatigue Level:</strong> {{ latestCheckIn.personalFatigue || 'N/A' }}/10
              </li>
              <li><strong>Stress Level:</strong> {{ latestCheckIn.wellnessStress || 'N/A' }}/10</li>
              <li><strong>Notes:</strong> {{ latestCheckIn.personalNotes || 'None' }}</li>
            </ul>
          </div>
          <UButton color="primary" variant="soft" @click="isFormOpen = true">
            Submit New Check-In
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'

  interface CheckIn {
    id: string
    createdAt: string
    personalNotes?: string
    personalFatigue?: number
    wellnessStress?: number
  }

  const isFormOpen = ref(false)

  // Use Nuxt's lazy fetching to handle state natively without blocking setup
  const {
    data: response,
    status,
    error,
    refresh
  } = await useFetch<any>('/api/check-in', { lazy: true })

  const checkIns = computed<CheckIn[]>(() => response.value?.data || [])

  const latestCheckIn = computed(() => {
    return checkIns.value.length > 0 ? checkIns.value[0] : null
  })

  const handleSuccess = async () => {
    isFormOpen.value = false
    await refresh()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }
</script>
