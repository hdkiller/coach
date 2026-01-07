<template>
  <UCard class="lg:col-span-2 overflow-hidden flex flex-col h-full">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">Recent Activity</h3>
        </div>
        <UBadge v-if="activityStore.recentActivity && activityStore.recentActivity.items.length > 0" color="neutral" variant="subtle" size="xs" class="font-bold uppercase tracking-widest">
          Last 5 Days
        </UBadge>
      </div>
    </template>
    
    <!-- Loading state -->
    <div v-if="activityStore.loading" class="text-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin inline text-primary" />
      <p class="text-sm text-muted mt-2">Loading activity...</p>
    </div>
    
    <!-- No activity -->
    <div v-else-if="!activityStore.recentActivity || activityStore.recentActivity.items.length === 0" class="text-center py-8">
      <UIcon name="i-heroicons-calendar" class="w-12 h-12 mx-auto text-muted mb-3" />
      <p class="text-sm text-muted">
        No recent activity found. Your data is syncing...
      </p>
    </div>
    
    <!-- Activity Cards List -->
    <div v-else class="space-y-3 max-h-[500px] overflow-y-auto pr-2 -mr-2 p-1">
      <div 
        v-for="item in (activityStore.recentActivity.items as any[])" 
        :key="item.id"
        class="group relative flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:ring-primary-500/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
        @click="navigateActivity(item)"
      >
        <!-- Icon Box -->
        <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full" :class="getIconBgClass(item)">
          <UIcon :name="item.icon || 'i-heroicons-calendar'" class="w-5 h-5" :class="getIconColorClass(item)" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-0.5">
            <p class="font-bold text-sm text-gray-900 dark:text-white truncate pr-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {{ item.title }}
            </p>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full ring-1 ring-gray-100 dark:ring-gray-800">
              {{ formatActivityDate(item.date) }}
            </span>
          </div>
          
          <div v-if="item.details && item.details.length > 0" class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <div v-for="(detail, i) in item.details" :key="i" class="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              <UIcon :name="detail.icon" class="w-3.5 h-3.5" :class="detail.color" />
              <span>{{ detail.value }}</span>
            </div>
          </div>
          
          <p v-else-if="item.description" class="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed truncate">
            {{ item.description }}
          </p>
        </div>

        <!-- Chevron -->
        <UIcon 
          name="i-heroicons-chevron-right" 
          class="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transform group-hover:translate-x-0.5 transition-all flex-shrink-0" 
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const activityStore = useActivityStore()
const { formatDate, getUserLocalDate } = useFormat()

function navigateActivity(item: any) {
  if (item.link) {
    navigateTo(item.link)
  }
}

function getIconBgClass(item: any) {
  // Use color from API or default
  const color = item.color || 'gray'
  const map: Record<string, string> = {
    primary: 'bg-primary-50 dark:bg-primary-900/20',
    green: 'bg-green-50 dark:bg-green-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    gray: 'bg-gray-50 dark:bg-gray-800'
  }
  return map[color] || map.gray
}

function getIconColorClass(item: any) {
  const color = item.color || 'gray'
  const map: Record<string, string> = {
    primary: 'text-primary-500',
    green: 'text-green-500',
    red: 'text-red-500',
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    gray: 'text-gray-500'
  }
  return map[color] || map.gray
}

// Format date for timeline display
function formatActivityDate(date: string | Date): string {
  if (!date) return ''
  const activityDate = new Date(date)
  const today = getUserLocalDate()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  // Create day-only strings for comparison
  const activityDateStr = formatDate(activityDate, 'yyyy-MM-dd')
  const todayStr = formatDate(today, 'yyyy-MM-dd')
  const yesterdayStr = formatDate(yesterday, 'yyyy-MM-dd')
  
  if (activityDateStr === todayStr) {
    return 'Today'
  } else if (activityDateStr === yesterdayStr) {
    return 'Yesterday'
  } else {
    return formatDate(activityDate, 'MMM d')
  }
}
</script>
