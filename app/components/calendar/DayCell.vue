<template>
  <div
    class="min-h-[120px] bg-white dark:bg-gray-900 p-1 flex flex-col gap-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
    :class="{ 'opacity-50': isOtherMonth }"
  >
    <!-- Date Header -->
    <div class="flex justify-between items-start px-1">
      <span 
        class="text-sm font-medium"
        :class="isToday ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded-md' : 'text-gray-500'"
      >
        {{ dayNumber }}
      </span>
      
      <!-- Day Totals (mini) -->
      <div v-if="hasActivity" class="text-[10px] text-gray-400 flex gap-1">
        <span v-if="totalDuration > 0">{{ formatDuration(totalDuration) }}</span>
        <span v-if="totalTss > 0">{{ Math.round(totalTss) }}TSS</span>
      </div>
    </div>

    <!-- Activities Stack -->
    <div class="flex flex-col gap-1 flex-1">
      <CalendarActivityCard
        v-for="activity in activities"
        :key="activity.id"
        :activity="activity"
        @click="$emit('activity-click', activity)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CalendarActivity } from '~/types/calendar'

const props = defineProps<{
  date: Date
  activities: CalendarActivity[]
  isOtherMonth?: boolean
}>()

defineEmits(['activity-click'])

const dayNumber = computed(() => props.date.getDate())

const isToday = computed(() => {
  const today = new Date()
  return props.date.getDate() === today.getDate() &&
         props.date.getMonth() === today.getMonth() &&
         props.date.getFullYear() === today.getFullYear()
})

const hasActivity = computed(() => props.activities.length > 0)

const totalDuration = computed(() => {
  return props.activities.reduce((acc, act) => acc + (act.duration || act.plannedDuration || 0), 0)
})

const totalTss = computed(() => {
  return props.activities.reduce((acc, act) => acc + (act.tss || act.plannedTss || 0), 0)
})

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h${m > 0 ? m : ''}`
}
</script>