<template>
  <UDashboardPanel id="feed">
    <template #header>
      <UDashboardNavbar title="Activity Feed">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
              <NotificationDropdown />
            </ClientOnly>
            <DashboardReleaseNotification />
            <UButton
              icon="i-heroicons-funnel"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-bold"
              @click="showFilters = !showFilters"
            >
              Filters
            </UButton>
            <UButton
              to="/chat"
              icon="i-heroicons-chat-bubble-left-right"
              color="primary"
              variant="solid"
              size="sm"
              class="font-bold"
            >
              Analyze with AI
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-3xl mx-auto py-6 space-y-6">
        <!-- Optional Filters Row -->
        <UCard
          v-if="showFilters"
          :ui="{ body: 'p-4' }"
          class="mx-4 sm:mx-0 border-primary-100 dark:border-primary-900/30 bg-primary-50/10 dark:bg-primary-900/5"
        >
          <div class="flex flex-wrap items-center gap-4">
            <USelectMenu
              v-model="selectedSport"
              :options="sportOptions"
              placeholder="All Sports"
              class="w-40"
              size="sm"
            />
            <USelectMenu
              v-model="limit"
              :options="[10, 20, 50, 100]"
              placeholder="Limit"
              class="w-24"
              size="sm"
            />
            <div class="flex-1" />
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              @click="resetFilters"
            >
              Reset
            </UButton>
          </div>
        </UCard>

        <!-- Feed List -->
        <div v-if="status === 'pending' && workouts.length === 0" class="space-y-6 px-4 sm:px-0">
          <div v-for="i in 3" :key="i" class="space-y-4">
            <USkeleton class="h-64 w-full rounded-xl" />
          </div>
        </div>

        <div v-else-if="workouts.length === 0" class="text-center py-24">
          <UIcon
            name="i-heroicons-archive-box"
            class="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4"
          />
          <h3 class="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
            No activities found
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Try adjusting your filters or sync your data to see your latest workouts.
          </p>
          <UButton to="/dashboard" color="primary" variant="link" class="mt-4">
            Back to Dashboard
          </UButton>
        </div>

        <div v-else class="space-y-6 pb-24">
          <ActivityFeedCard
            v-for="workout in workouts"
            :key="workout.id"
            :workout="workout"
            @click="openWorkout(workout)"
          />

          <!-- Load More -->
          <div v-if="hasMore" class="flex justify-center pt-4">
            <UButton
              :loading="status === 'pending'"
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-path"
              class="font-black uppercase tracking-widest text-[10px] px-8 py-3"
              @click="loadMore"
            >
              Load Older Activities
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Workout Detail Modal -->
  <WorkoutQuickViewModal
    v-model="showWorkoutModal"
    :workout="selectedWorkout"
    @deleted="handleWorkoutDeleted"
    @updated="handleWorkoutUpdated"
  />
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Activity Feed | Coach Watts',
    meta: [
      {
        name: 'description',
        content: 'Your chronological training history and workout analysis.'
      }
    ]
  })

  const showFilters = ref(false)
  const selectedSport = ref('all')
  const limit = ref(20)
  const offset = ref(0)
  const workouts = ref<any[]>([])
  const hasMore = ref(true)

  const sportOptions = [
    { label: 'All Sports', value: 'all' },
    { label: 'Cycling', value: 'Ride' },
    { label: 'Running', value: 'Run' },
    { label: 'Swimming', value: 'Swim' },
    { label: 'Strength', value: 'WeightTraining' }
  ]

  const { data, status, refresh } = await useFetch<any[]>('/api/workouts', {
    query: computed(() => ({
      limit: limit.value,
      offset: offset.value,
      type: selectedSport.value === 'all' ? undefined : selectedSport.value
    })),
    watch: [selectedSport, limit]
  })

  // Append data on load
  watch(
    data,
    (newData) => {
      if (newData) {
        if (offset.value === 0) {
          workouts.value = newData
        } else {
          workouts.value = [...workouts.value, ...newData]
        }
        hasMore.value = newData.length === limit.value
      }
    },
    { immediate: true }
  )

  // Reset offset when filters change
  watch([selectedSport, limit], () => {
    offset.value = 0
  })

  function loadMore() {
    offset.value += limit.value
  }

  function resetFilters() {
    selectedSport.value = 'all'
    limit.value = 20
    offset.value = 0
  }

  // Workout Modal
  const showWorkoutModal = ref(false)
  const selectedWorkout = ref<any>(null)

  function openWorkout(workout: any) {
    selectedWorkout.value = workout
    showWorkoutModal.value = true
  }

  function handleWorkoutDeleted(workoutId: string) {
    workouts.value = workouts.value.filter((w) => w.id !== workoutId)
  }

  async function handleWorkoutUpdated() {
    // Basic refresh for now
    await refresh()
  }
</script>
