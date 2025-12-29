<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Run Details</h3>
      <div class="flex gap-2">
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

    <!-- Run Structure (Simple Text for now, can be upgraded to graph later) -->
     <div v-if="workout.structuredWorkout?.steps" class="space-y-4">
        <div v-for="(step, index) in workout.structuredWorkout.steps" :key="index" class="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
             <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold text-sm mr-4">
                 {{ Number(index) + 1 }}
             </div>
             <div class="flex-1">
                 <div class="font-medium">{{ step.name || step.type }}</div>
                 <div class="text-sm text-muted">
                    <span v-if="step.duration">{{ formatDuration(step.duration) }}</span>
                    <span v-else-if="step.distance">{{ step.distance }}m</span>
                    <span class="mx-2">•</span>
                    <span v-if="step.targetPower">Pace: {{ getPaceFromPower(step.targetPower) }}</span>
                    <span v-else>Easy Pace</span>
                 </div>
             </div>
        </div>
     </div>
      <div v-else class="text-center py-8 text-muted">
        No structured run steps available.
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  workout: any
  generating?: boolean
}>()

defineEmits(['adjust', 'regenerate'])

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getPaceFromPower(power: number) {
    // Placeholder logic for running power -> pace
    return "5:00 /km" 
}
</script>
