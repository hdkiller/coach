<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Power Profile</h3>
      <div class="flex gap-2">
        <UButton 
          size="sm" 
          color="neutral" 
          variant="ghost" 
          icon="i-heroicons-chat-bubble-left-right" 
          @click="$emit('add-messages')"
        >
          Add Messages
        </UButton>
        <UButton 
          size="sm" 
          color="neutral" 
          variant="ghost" 
          icon="i-heroicons-adjustments-horizontal" 
          @click="$emit('adjust')"
        >
          Adjust
        </UButton>
        <UButton 
          size="sm" 
          color="neutral" 
          variant="ghost" 
          icon="i-heroicons-arrow-path" 
          :loading="generating" 
          @click="$emit('regenerate')"
        >
          Regenerate
        </UButton>
      </div>
    </div>
    <WorkoutChart :workout="workout.structuredWorkout" :user-ftp="userFtp" />
  </div>
</template>

<script setup lang="ts">
import WorkoutChart from '~/components/workouts/WorkoutChart.vue'

defineProps<{
  workout: any
  userFtp?: number
  generating?: boolean
}>()

defineEmits(['add-messages', 'adjust', 'regenerate'])
</script>
