<template>
  <UDashboardPanel id="feed" class="overflow-x-hidden">
    <template #header>
      <UDashboardNavbar title="Activity Feed">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-1 sm:gap-3">
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
              class="font-black uppercase tracking-widest text-[10px]"
              @click="showFilters = !showFilters"
            >
              <span class="hidden md:inline">Filters</span>
            </UButton>
            <UButton
              to="/chat"
              icon="i-heroicons-chat-bubble-left-right"
              color="primary"
              variant="solid"
              size="sm"
              class="font-black uppercase tracking-widest text-[10px]"
            >
              Chat
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-3xl mx-auto py-0 sm:py-6 space-y-0 px-0 overflow-x-hidden max-w-full">
        <!-- Optional Filters Row -->
        <div class="px-4 sm:px-6 mb-6">
          <UCard
            v-if="showFilters"
            :ui="{ body: 'p-4' }"
            class="border-primary-100 dark:border-primary-900/30 bg-primary-50/10 dark:bg-primary-900/5 mt-4 sm:mt-0"
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
                v-model="selectedIntensity"
                :options="intensityOptions"
                placeholder="All Intensity"
                class="w-56"
                size="sm"
                value-attribute="value"
                option-attribute="label"
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
        </div>

        <!-- Feed List -->
        <div v-if="status === 'pending' && workouts.length === 0" class="space-y-0">
          <div v-for="i in 3" :key="i" class="border-b border-gray-100 dark:border-gray-800">
            <USkeleton class="h-80 w-full rounded-none" />
          </div>
        </div>

        <div v-else-if="filteredWorkouts.length === 0" class="text-center py-24">
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
            v-for="workout in filteredWorkouts"
            :key="workout.id"
            :workout="workout"
            @click="navigateTo(`/workouts/${workout.id}`)"
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

  const intensityOptions = [
    { label: 'All Intensity', value: 'all' },
    { label: 'Recovery (< 0.60 IF)', value: 'recovery' },
    { label: 'Endurance (0.60 - 0.75 IF)', value: 'endurance' },
    { label: 'Tempo/SS (0.75 - 0.85 IF)', value: 'tempo' },
    { label: 'Threshold (0.85 - 0.95 IF)', value: 'threshold' },
    { label: 'High/Race (> 0.95 IF)', value: 'high' }
  ]

  const selectedIntensity = ref('all')

  const { data, status, refresh } = await useFetch<any[]>('/api/workouts', {
    query: computed(() => ({
      limit: limit.value,
      offset: offset.value,
      type: selectedSport.value === 'all' ? undefined : selectedSport.value
    })),
    watch: [selectedSport, limit]
  })

  const filteredWorkouts = computed(() => {
    if (!workouts.value) return []
    if (selectedIntensity.value === 'all') return workouts.value

    return workouts.value.filter((w) => {
      const ifVal = w.intensity || 0
      if (selectedIntensity.value === 'recovery') return ifVal < 0.6
      if (selectedIntensity.value === 'endurance') return ifVal >= 0.6 && ifVal < 0.75
      if (selectedIntensity.value === 'tempo') return ifVal >= 0.75 && ifVal < 0.85
      if (selectedIntensity.value === 'threshold') return ifVal >= 0.85 && ifVal < 0.95
      if (selectedIntensity.value === 'high') return ifVal >= 0.95
      return true
    })
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
    selectedIntensity.value = 'all'
    limit.value = 20
    offset.value = 0
  }

  useActivityRealtime(async () => {
    offset.value = 0
    await refresh()
  })
</script>
