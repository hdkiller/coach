<template>
  <UCard
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-5' }"
    class="overflow-hidden"
  >
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
          Recovery Context Timeline
        </p>
        <h3 class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
          Events, check-ins, and imported context in one view
        </h3>
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
      class="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
    >
      No recovery context items in the selected range.
    </div>

    <div v-else class="mt-5 space-y-5">
      <div v-for="group in groupedItems" :key="group.dateKey">
        <div class="mb-2 flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatDateUTC(group.dateKey, 'EEEE, MMM d') }}
            </p>
            <p class="text-[10px] uppercase tracking-widest text-gray-400">
              {{ group.items.length }} item{{ group.items.length === 1 ? '' : 's' }}
            </p>
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

        <div class="space-y-2">
          <button
            v-for="item in visibleItems(group)"
            :key="item.id"
            type="button"
            class="flex w-full items-start justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left transition hover:border-primary-300 hover:bg-primary-50/40 dark:border-gray-800 dark:hover:bg-gray-900"
            @click="$emit('select', item)"
          >
            <div class="flex min-w-0 items-start gap-3">
              <div
                class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
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
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {{ item.description || item.origin }}
                </p>
              </div>
            </div>

            <div class="shrink-0 text-right">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
                {{ formatTime(item.startAt) }}
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
</script>
