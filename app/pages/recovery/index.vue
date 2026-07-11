<template>
  <UDashboardPanel id="recovery-history">
    <template #header>
      <UDashboardNavbar :title="tr('recovery_page_title', 'Recovery History')">
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
              @click="
                () => {
                  void openCreateRecoveryEvent()
                }
              "
            >
              {{ tr('recovery_log_event', 'Log event') }}
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-0 sm:p-6">
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
            {{ tr('recovery_page_title', 'Recovery History') }}
          </h1>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">
            {{
              tr(
                'recovery_subtitle',
                'Imported wellness, manual events, and daily check-ins in one audit trail'
              )
            }}
          </p>
        </div>

        <div v-if="pending" class="space-y-4 px-4 sm:px-0">
          <USkeleton class="h-24 w-full rounded-lg" />
          <USkeleton class="h-48 w-full rounded-lg" />
          <USkeleton class="h-64 w-full rounded-lg" />
        </div>

        <UAlert
          v-else-if="error"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-circle"
          :title="tr('recovery_load_error_title', 'Failed to load recovery history')"
          :description="
            error.message || tr('recovery_load_error_desc', 'Recovery context could not be loaded.')
          "
          class="mx-4 sm:mx-0"
        >
          <template #actions>
            <UButton
              color="error"
              variant="soft"
              size="xs"
              icon="i-heroicons-arrow-path"
              @click="
                () => {
                  void refresh()
                }
              "
            >
              {{ tr('recovery_retry', 'Retry') }}
            </UButton>
          </template>
        </UAlert>

        <template v-else>
          <RecoveryContextStrip :items="activeToday" @select="openRecoveryItem" />

          <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4' }">
            <div class="grid gap-4 md:grid-cols-3">
              <div>
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  {{ tr('recovery_filter_source', 'Source') }}
                </label>
                <USelect v-model="sourceFilter" :items="sourceOptions" />
              </div>
              <div>
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  {{ tr('recovery_filter_type', 'Type') }}
                </label>
                <USelect v-model="kindFilter" :items="kindOptions" />
              </div>
              <div class="flex items-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="
                    () => {
                      void resetFilters()
                    }
                  "
                >
                  {{ tr('recovery_reset_filters', 'Reset filters') }}
                </UButton>
              </div>
            </div>
          </UCard>

          <RecoveryContextTimeline
            :items="filteredItems"
            :show-view-all="false"
            @select="openRecoveryItem"
          />
        </template>
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
  import { useTranslate } from '@tolgee/vue'
  import RecoveryContextStrip from '~/components/recovery/RecoveryContextStrip.vue'
  import RecoveryContextTimeline from '~/components/recovery/RecoveryContextTimeline.vue'
  import RecoveryContextSlideover from '~/components/recovery/RecoveryContextSlideover.vue'
  import type { RecoveryContextItem } from '~/types/recovery-context'

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  useHead({
    title: () => tr('recovery_page_title', 'Recovery History')
  })

  const { t } = useTranslate('fitness')
  const tr = (key: string, fallback: string) => {
    if (typeof t.value !== 'function') return fallback
    const translated = t.value(key)
    return translated === key ? fallback : translated
  }

  const selectedPeriod = ref<string | number>(30)
  const sourceFilter = ref('all')
  const kindFilter = ref('all')
  const selectedRecoveryItem = ref<RecoveryContextItem | null>(null)
  const isRecoveryContextOpen = ref(false)
  const isRecoveryCreateMode = ref(false)

  const periodOptions = [
    { label: tr('period_14_days', '14 Days'), value: 14 },
    { label: tr('period_30_days', '30 Days'), value: 30 },
    { label: tr('period_90_days', '90 Days'), value: 90 },
    { label: tr('period_year_to_date', 'Year to Date'), value: 'YTD' }
  ]

  const sourceOptions = [
    { label: tr('recovery_source_all', 'All sources'), value: 'all' },
    { label: tr('recovery_source_imported', 'Imported'), value: 'imported' },
    { label: tr('recovery_source_manual_event', 'Manual event'), value: 'manual_event' },
    { label: tr('recovery_source_daily_checkin', 'Daily check-in'), value: 'daily_checkin' }
  ]

  const kindOptions = [
    { label: tr('recovery_kind_all', 'All types'), value: 'all' },
    { label: tr('recovery_kind_wellness', 'Wellness periods'), value: 'wellness' },
    { label: tr('recovery_kind_journey_event', 'Manual events'), value: 'journey_event' },
    { label: tr('recovery_kind_daily_checkin', 'Daily check-ins'), value: 'daily_checkin' }
  ]

  const { items, activeToday, refresh, pending, error } = useRecoveryContext(selectedPeriod)

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
