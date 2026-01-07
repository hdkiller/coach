<template>
  <UCard class="lg:col-span-2 overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">Recent Activity</h3>
        </div>
        <UBadge v-if="activityStore.recentActivity && activityStore.recentActivity.items.length > 0" color="neutral" variant="subtle" size="xs" class="font-bold uppercase tracking-widest">
          Active Period
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
    
    <!-- Timeline -->
    <UTimeline v-else :items="(activityStore.recentActivity.items as any[])" class="max-h-96 overflow-y-auto pr-2">
      <template #default="{ item }">
        <div 
          class="relative flex items-start justify-between gap-3 group -mx-2 px-2 py-2 rounded-lg transition-all duration-200"
          :class="item.link ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''"
          @click="navigateActivity(item)"
        >
          <div class="flex-1 min-w-0">
            <p 
              class="font-bold text-sm text-gray-900 dark:text-white transition-colors"
              :class="item.link ? 'group-hover:text-primary-500' : ''"
            >
              {{ item.title }}
            </p>
            
            <p v-if="item.description" class="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {{ item.description }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <time class="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap mt-1">
              {{ formatActivityDate(item.date) }}
            </time>
            <UIcon 
              v-if="item.link" 
              name="i-heroicons-chevron-right" 
              class="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transform group-hover:translate-x-0.5 transition-all" 
            />
          </div>
        </div>
      </template>
    </UTimeline>
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

// Format date for timeline display
function formatActivityDate(date: string | Date): string {
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
    // Check if within last 7 days
    const diffDays = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 1 && diffDays < 7) {
      return `${diffDays} days ago`
    }
    return formatDate(activityDate, 'MMM d')
  }
}
</script>
