<template>
  <UModal v-model:open="isOpen" title="Today's Training Recommendation">
    <template #body>
      <div v-if="recommendation" class="space-y-4">
        <!-- Recommendation Badge -->
        <div class="text-center">
          <UBadge
            :color="getRecommendationColor(recommendation.recommendation)"
            size="lg"
            class="text-lg px-4 py-2"
          >
            {{ getRecommendationLabel(recommendation.recommendation) }}
          </UBadge>
          <p class="text-sm text-muted mt-2">Confidence: {{ (recommendation.confidence * 100).toFixed(0) }}%</p>
        </div>

        <!-- Reasoning -->
        <div>
          <h4 class="font-medium mb-2">Why?</h4>
          <p class="text-sm text-muted">{{ recommendation.reasoning }}</p>
        </div>

        <!-- Key Factors -->
        <div v-if="recommendation.analysisJson?.key_factors">
          <h4 class="font-medium mb-2">Key Factors:</h4>
          <ul class="space-y-1">
            <li v-for="(factor, idx) in recommendation.analysisJson.key_factors" :key="idx" class="text-sm flex gap-2">
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 mt-0.5" />
              <span>{{ factor }}</span>
            </li>
          </ul>
        </div>

        <!-- Planned Workout -->
        <div v-if="recommendation.analysisJson?.planned_workout">
          <h4 class="font-medium mb-2">Original Plan:</h4>
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p class="font-medium">{{ recommendation.analysisJson.planned_workout.original_title }}</p>
            <p class="text-sm text-muted">
              {{ recommendation.analysisJson.planned_workout.original_duration_min }} min •
              {{ recommendation.analysisJson.planned_workout.original_tss }} TSS
            </p>
          </div>
        </div>

        <!-- Suggested Modifications -->
        <div v-if="recommendation.analysisJson?.suggested_modifications">
          <h4 class="font-medium mb-2">Suggested Changes:</h4>
          <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <p class="font-medium">{{ recommendation.analysisJson.suggested_modifications.new_title }}</p>
            <p class="text-sm text-muted mb-2">
              {{ recommendation.analysisJson.suggested_modifications.new_duration_min }} min •
              {{ recommendation.analysisJson.suggested_modifications.new_tss }} TSS
            </p>
            <p class="text-sm">{{ recommendation.analysisJson.suggested_modifications.description }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton color="neutral" variant="outline" @click="isOpen = false">
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  recommendation: any
}>()

const emit = defineEmits(['update:open'])

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

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
