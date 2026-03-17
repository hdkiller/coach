<template>
  <UCard
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-5' }"
    class="overflow-hidden border border-rose-100/80 bg-white dark:border-gray-800"
  >
    <div class="flex items-center justify-between gap-4">
      <div class="max-w-2xl">
        <div class="flex items-center gap-2">
          <div
            class="flex size-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <UIcon name="i-lucide-waypoints" class="size-4.5" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-amber-500/80">
            Recovery Context Timeline
          </p>
        </div>
        <h3 class="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Events, check-ins, and imported context in one view
        </h3>
        <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Review the narrative behind recovery changes and open any item to inspect, edit, or
          correlate it with your charts.
        </p>
      </div>
      <UButton
        v-if="showViewAll"
        to="/recovery"
        color="neutral"
        variant="ghost"
        size="xs"
        trailing-icon="i-lucide-arrow-right"
      >
        View full history
      </UButton>
    </div>

    <div
      v-if="groupedItems.length === 0"
      class="mt-4 rounded-2xl border border-dashed border-amber-200/80 bg-amber-50/70 px-4 py-5 text-sm text-gray-600 dark:border-amber-950/40 dark:bg-amber-950/10 dark:text-gray-300"
    >
      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-amber-500 dark:bg-gray-900 dark:text-amber-300"
        >
          <UIcon name="i-lucide-archive" class="size-4" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Nothing logged in this range yet</p>
          <p class="mt-1 leading-relaxed">
            When a sick day, poor sleep, fatigue report, or daily check-in lands here, this timeline
            becomes the quickest way to explain chart anomalies.
          </p>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 space-y-6">
      <div v-for="group in groupedItems" :key="group.dateKey">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <div
              class="flex size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900"
            >
              <UIcon
                name="i-lucide-calendar-days"
                class="size-4 text-gray-500 dark:text-gray-300"
              />
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ formatDateUTC(group.dateKey, 'EEEE, MMM d') }}
              </p>
              <p class="text-[10px] uppercase tracking-widest text-gray-400">
                {{ group.items.length }} item{{ group.items.length === 1 ? '' : 's' }}
              </p>
            </div>
          </div>
          <UButton
            v-if="group.items.length > 3"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="toggleGroup(group.dateKey)"
          >
            {{ expandedGroups.has(group.dateKey) ? 'Show less' : 'Show all' }}
          </UButton>
        </div>

        <div class="relative space-y-2 pl-4">
          <div
            class="absolute bottom-0 left-3 top-0 w-px bg-gradient-to-b from-rose-200 via-amber-200 to-transparent dark:from-rose-950/60 dark:via-amber-950/60"
          />
          <button
            v-for="item in visibleItems(group)"
            :key="item.id"
            type="button"
            class="relative flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition shadow-sm"
            :class="rowClass(item.sourceType)"
            @click="$emit('select', item)"
          >
            <div
              class="absolute left-0 top-5 h-2.5 w-2.5 -translate-x-[21px] rounded-full border-2 border-white dark:border-gray-950"
              :style="{ backgroundColor: item.color }"
            />
            <div class="flex min-w-0 items-start gap-3">
              <div
                class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/60 dark:ring-gray-900/70"
                :style="{ backgroundColor: item.color }"
              >
                <UIcon :name="item.icon" class="size-4 text-gray-900/80 dark:text-white/90" />
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ item.label }}
                  </p>
                  <UBadge :color="badgeColor(item.sourceType)" variant="subtle" size="sm">
                    {{ sourceLabel(item.sourceType) }}
                  </UBadge>
                </div>
                <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {{ item.description || item.origin }}
                </p>
              </div>
            </div>

            <div class="shrink-0 text-right">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
                {{ item.isRange ? formatDateUTC(item.endAt, 'MMM d') : formatTime(item.startAt) }}
              </p>
              <p
                v-if="item.severity"
                class="mt-1 text-[10px] uppercase tracking-widest text-gray-400"
              >
                Severity {{ item.severity }}/10
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import type { RecoveryContextItem, RecoveryContextSourceType } from '~/types/recovery-context'

  const props = withDefaults(
    defineProps<{
      items: RecoveryContextItem[]
      showViewAll?: boolean
    }>(),
    {
      showViewAll: true
    }
  )

  defineEmits<{
    select: [item: RecoveryContextItem]
  }>()

  const { formatDateUTC, formatTime } = useFormat()
  const expandedGroups = ref(new Set<string>())

  const groupedItems = computed(() => {
    const groups = new Map<string, RecoveryContextItem[]>()

    for (const item of props.items) {
      const dateKey = item.startAt.slice(0, 10)
      const current = groups.get(dateKey) || []
      current.push(item)
      groups.set(dateKey, current)
    }

    return [...groups.entries()].map(([dateKey, items]) => ({
      dateKey,
      items
    }))
  })

  function visibleItems(group: { dateKey: string; items: RecoveryContextItem[] }) {
    if (expandedGroups.value.has(group.dateKey) || group.items.length <= 3) {
      return group.items
    }
    return group.items.slice(0, 3)
  }

  function toggleGroup(dateKey: string) {
    const next = new Set(expandedGroups.value)
    if (next.has(dateKey)) next.delete(dateKey)
    else next.add(dateKey)
    expandedGroups.value = next
  }

  function sourceLabel(sourceType: RecoveryContextSourceType) {
    if (sourceType === 'imported') return 'Imported'
    if (sourceType === 'manual_event') return 'Manual event'
    return 'Check-in'
  }

  function badgeColor(sourceType: RecoveryContextSourceType) {
    if (sourceType === 'imported') return 'info'
    if (sourceType === 'manual_event') return 'warning'
    return 'success'
  }

  function rowClass(sourceType: RecoveryContextSourceType) {
    if (sourceType === 'imported') {
      return 'border-sky-100 bg-sky-50/40 hover:border-sky-300 hover:bg-sky-50/80 dark:border-sky-950/40 dark:bg-sky-950/10 dark:hover:bg-sky-950/20'
    }
    if (sourceType === 'manual_event') {
      return 'border-amber-100 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/80 dark:border-amber-950/40 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
    }
    return 'border-teal-100 bg-teal-50/40 hover:border-teal-300 hover:bg-teal-50/80 dark:border-teal-950/40 dark:bg-teal-950/10 dark:hover:bg-teal-950/20'
  }
</script>
