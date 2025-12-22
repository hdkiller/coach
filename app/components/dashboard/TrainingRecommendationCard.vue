<template>
  <UCard v-if="integrationStore.intervalsConnected" class="flex flex-col overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">Today's Training</h3>
        </div>
        <UBadge v-if="recommendationStore.todayRecommendation" :color="getRecommendationColor(recommendationStore.todayRecommendation.recommendation)" variant="subtle" size="sm" class="font-bold">
          {{ getRecommendationLabel(recommendationStore.todayRecommendation.recommendation) }}
        </UBadge>
      </div>
    </template>
    
    <div v-if="recommendationStore.loading || recommendationStore.generating" class="text-sm text-muted py-4 text-center flex-grow">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin inline" />
      <p class="mt-2">{{ recommendationStore.generating ? 'Generating recommendation...' : 'Loading...' }}</p>
      <p v-if="recommendationStore.generating" class="text-xs mt-1">This may take up to 60 seconds</p>
    </div>
    
    <div v-else-if="!recommendationStore.todayRecommendation" class="flex-grow">
      <p class="text-sm text-muted">
        Get AI-powered guidance for today's training based on your recovery and planned workout.
      </p>
    </div>
    
    <div v-else class="flex-grow">
      <p class="text-sm">{{ recommendationStore.todayRecommendation.reasoning }}</p>
      
      <div v-if="recommendationStore.todayRecommendation.analysisJson?.suggested_modifications" class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3">
        <p class="text-sm font-medium mb-2">Suggested Modification:</p>
        <p class="text-sm">{{ recommendationStore.todayRecommendation.analysisJson.suggested_modifications.description }}</p>
      </div>
    </div>
    
    <template #footer>
      <div class="grid grid-cols-2 gap-3">
        <UButton
          v-if="recommendationStore.todayRecommendation && !recommendationStore.generating"
          color="neutral"
          variant="outline"
          size="sm"
          class="font-bold"
          @click="$emit('open-details')"
        >
          Details
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-bold"
          :class="{ 'col-span-2': !recommendationStore.todayRecommendation || recommendationStore.generating }"
          @click="recommendationStore.generateTodayRecommendation"
          :loading="recommendationStore.generating"
          :disabled="recommendationStore.generating"
          icon="i-heroicons-arrow-path"
        >
          {{ recommendationStore.generating ? 'Thinking...' : (recommendationStore.todayRecommendation ? 'Refresh' : 'Get Insight') }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
const integrationStore = useIntegrationStore()
const recommendationStore = useRecommendationStore()

defineEmits(['open-details'])

function getRecommendationColor(rec: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    'proceed': 'success',
    'modify': 'warning',
    'reduce_intensity': 'warning',
    'rest': 'error'
  }
  return colors[rec] || 'neutral'
}

function getRecommendationLabel(rec: string) {
  const labels: Record<string, string> = {
    'proceed': '✓ Proceed as Planned',
    'modify': '⟳ Modify Workout',
    'reduce_intensity': '↓ Reduce Intensity',
    'rest': '⏸ Rest Day'
  }
  return labels[rec] || rec
}
</script>
