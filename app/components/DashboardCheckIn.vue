<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Weekly Check-In</h2>
        <UBadge :color="hasPendingCheckIn ? 'warning' : 'success'" variant="subtle">
          {{ hasPendingCheckIn ? 'Pending' : 'Completed' }}
        </UBadge>
      </div>
    </template>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>

    <div v-else-if="error" class="text-red-500">Error loading check-ins.</div>

    <div v-else>
      <div v-if="hasPendingCheckIn" class="space-y-4">
        <p class="text-gray-600 dark:text-gray-300">
          You have a pending check-in for this week. Please complete it so your coach can review
          your progress!
        </p>
        <UButton color="primary" @click="startCheckIn"> Start Check-In </UButton>
      </div>
      <div v-else class="space-y-4">
        <p class="text-gray-600 dark:text-gray-300">
          Great job! You've completed your check-in for this week.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">Latest Check-In Summary</h3>
          <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <strong>Date:</strong> {{ latestCheckIn ? formatDate(latestCheckIn.date) : '' }}
            </li>
            <li><strong>Mood:</strong> {{ latestCheckIn?.mood }}</li>
            <li><strong>Energy Level:</strong> {{ latestCheckIn?.energyLevel }}/10</li>
            <li><strong>Notes:</strong> {{ latestCheckIn?.notes }}</li>
          </ul>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'

  interface CheckIn {
    id: string
    date: string
    mood: string
    energyLevel: number
    notes: string
    status: string
  }

  const checkIns = ref<CheckIn[]>([])
  const loading = ref(true)
  const error = ref(false)

  onMounted(async () => {
    try {
      const response = await ($fetch as any)('/api/check-in')
      checkIns.value = response.data
    } catch (e) {
      error.value = true
    } finally {
      loading.value = false
    }
  })

  const latestCheckIn = computed(() => {
    return checkIns.value.length > 0 ? checkIns.value[0] : null
  })

  const hasPendingCheckIn = computed(() => {
    return latestCheckIn.value?.status === 'pending'
  })

  const startCheckIn = () => {
    // Navigation to check-in form would go here
    console.log('Navigate to check-in form')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }
</script>
