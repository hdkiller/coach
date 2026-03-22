<template>
  <UCard class="h-full flex flex-col" :ui="{ body: 'px-0 py-0 sm:px-0 sm:py-0' }">
    <template #header>
      <div class="px-4 py-4 sm:px-6 flex items-center gap-2">
        <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary-500" />
        <h3 class="font-bold text-sm tracking-tight uppercase">Recent Athlete Activity</h3>
      </div>
    </template>

    <div v-if="loading" class="p-4 space-y-4">
      <div v-for="i in 5" :key="i" class="flex gap-3">
        <USkeleton class="h-10 w-10 rounded-full shrink-0" />
        <div class="space-y-2 flex-1">
          <USkeleton class="h-4 w-3/4" />
          <USkeleton class="h-3 w-1/2" />
        </div>
      </div>
    </div>

    <div v-else-if="feed.length === 0" class="text-center py-12 px-4">
      <UIcon name="i-heroicons-calendar" class="w-12 h-12 mx-auto text-neutral-300 mb-3" />
      <p class="text-sm text-neutral-500">No recent activity from your athletes.</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
      <div v-for="group in groupedFeed" :key="group.dateLabel" class="relative">
        <!-- Day Header -->
        <div
          class="sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur px-4 py-2 border-y border-gray-100 dark:border-gray-800"
        >
          <span class="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {{ group.dateLabel }}
          </span>
        </div>

        <!-- Group Items -->
        <div class="p-4 space-y-6">
          <div v-for="item in group.items" :key="item.id" class="flex gap-3 relative group">
            <UAvatar
              :src="item.athlete.image"
              :alt="item.athlete.name"
              size="sm"
              class="shrink-0"
            />

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-black text-gray-900 dark:text-white truncate">
                  {{ item.athlete.name }}
                </p>
                <span class="text-[9px] font-bold text-neutral-400 uppercase whitespace-nowrap">
                  {{ formatTime(item.date) }}
                </span>
              </div>

              <NuxtLink
                :to="item.link"
                class="block mt-1 p-2 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-lg border border-gray-100 dark:border-gray-800 group-hover:border-primary-500/50 transition-colors"
              >
                <div class="flex items-center gap-2">
                  <UIcon :name="item.icon" class="w-4 h-4 text-primary-500" />
                  <p class="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                    {{ item.title }}
                  </p>
                </div>
                <p class="text-[10px] text-neutral-500 mt-0.5 pl-6 italic">
                  {{ item.description }}
                </p>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  const props = defineProps<{
    feed: any[]
    loading?: boolean
  }>()

  const { formatDate, getUserLocalDate } = useFormat()

  const groupedFeed = computed(() => {
    const groups: Record<string, any[]> = {}

    props.feed.forEach((item) => {
      const label = getDateLabel(item.date)
      if (!groups[label]) {
        groups[label] = []
      }
      groups[label].push(item)
    })

    return Object.entries(groups).map(([label, items]) => ({
      dateLabel: label,
      items
    }))
  })

  function formatTime(date: string) {
    return formatDate(new Date(date), 'HH:mm')
  }

  function getDateLabel(date: string | Date): string {
    if (!date) return ''
    const d = new Date(date)
    const today = getUserLocalDate()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dateStr = formatDate(d, 'yyyy-MM-dd')
    const todayStr = formatDate(today, 'yyyy-MM-dd')
    const yesterdayStr = formatDate(yesterday, 'yyyy-MM-dd')

    if (dateStr === todayStr) return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'
    return formatDate(d, 'EEEE, MMM d')
  }
</script>
