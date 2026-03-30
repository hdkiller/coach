<template>
  <UDashboardPanel id="recovery-history">
    <template #header>
      <UDashboardNavbar title="Recovery History">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <USelect v-model="selectedPeriod" :items="periodOptions" size="sm" class="w-32" />
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-plus"
              @click="openCreateRecoveryEvent()"
            >
              Log event
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-0 sm:p-6">
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Recovery History
          </h1>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">
            Imported wellness, manual events, and daily check-ins in one audit trail
          </p>
        </div>

        <RecoveryContextStrip :items="activeToday" @select="openRecoveryItem" />

        <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4' }">
          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label
                class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
              >
                Source
              </label>
              <USelect v-model="sourceFilter" :items="sourceOptions" />
            </div>
            <div>
              <label
                class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
              >
                Type
              </label>
              <USelect v-model="kindFilter" :items="kindOptions" />
            </div>
            <div class="flex items-end">
              <UButton color="neutral" variant="ghost" size="sm" @click="resetFilters">
                Reset filters
              </UButton>
            </div>
          </div>
        </UCard>

        <RecoveryContextTimeline
          :items="filteredItems"
          :show-view-all="false"
          @select="openRecoveryItem"
        />
      </div>
    </template>
  </UDashboardPanel>

  <RecoveryContextSlideover
    :open="isRecoveryContextOpen"
    :item="selectedRecoveryItem"
    :create-mode="isRecoveryCreateMode"
    @update:open="isRecoveryContextOpen = $event"
    @saved="refresh"
    @deleted="refresh"
  />
</template>

<script setup lang="ts">
  import RecoveryContextStrip from '~/components/recovery/RecoveryContextStrip.vue'
  import RecoveryContextTimeline from '~/components/recovery/RecoveryContextTimeline.vue'
  import RecoveryContextSlideover from '~/components/recovery/RecoveryContextSlideover.vue'
  import type { RecoveryContextItem } from '~/types/recovery-context'

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  useHead({
    title: 'Recovery History'
  })

  const selectedPeriod = ref<string | number>(30)
  const sourceFilter = ref('all')
  const kindFilter = ref('all')
  const selectedRecoveryItem = ref<RecoveryContextItem | null>(null)
  const isRecoveryContextOpen = ref(false)
  const isRecoveryCreateMode = ref(false)

  const periodOptions = [
    { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: 'Year to Date', value: 'YTD' }
  ]

  const sourceOptions = [
    { label: 'All sources', value: 'all' },
    { label: 'Imported', value: 'imported' },
    { label: 'Manual event', value: 'manual_event' },
    { label: 'Daily check-in', value: 'daily_checkin' }
  ]

  const kindOptions = [
    { label: 'All types', value: 'all' },
    { label: 'Wellness periods', value: 'wellness' },
    { label: 'Manual events', value: 'journey_event' },
    { label: 'Daily check-ins', value: 'daily_checkin' }
  ]

  const { items, activeToday, refresh } = useRecoveryContext(selectedPeriod)

  const filteredItems = computed(() => {
    return (items.value as RecoveryContextItem[]).filter((item: RecoveryContextItem) => {
      if (sourceFilter.value !== 'all' && item.sourceType !== sourceFilter.value) return false
      if (kindFilter.value !== 'all' && item.kind !== kindFilter.value) return false
      return true
    })
  })

  function resetFilters() {
    sourceFilter.value = 'all'
    kindFilter.value = 'all'
  }

  function openRecoveryItem(item: RecoveryContextItem) {
    selectedRecoveryItem.value = item
    isRecoveryCreateMode.value = false
    isRecoveryContextOpen.value = true
  }

  function openCreateRecoveryEvent() {
    selectedRecoveryItem.value = null
    isRecoveryCreateMode.value = true
    isRecoveryContextOpen.value = true
  }
</script>
