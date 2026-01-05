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
    
    <div v-if="recommendationStore.loading || recommendationStore.generating || recommendationStore.generatingAdHoc" class="text-sm text-muted py-4 text-center flex-grow">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin inline" />
      <p class="mt-2">{{ getLoadingText() }}</p>
      <p v-if="recommendationStore.generating || recommendationStore.generatingAdHoc" class="text-xs mt-1">This may take up to 60 seconds</p>
    </div>
    
    <div v-else class="flex-grow space-y-4">
      <!-- The Plan Section -->
      <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
        <div 
          v-if="recommendationStore.todayWorkout" 
          class="flex items-center justify-between gap-3 group cursor-pointer" 
          @click="navigateTo(`/workouts/planned/${recommendationStore.todayWorkout.id}`)"
        >
          <div class="flex items-start gap-3">
            <div class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
              <UIcon :name="getWorkoutIcon(recommendationStore.todayWorkout.type)" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h4 class="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
                {{ recommendationStore.todayWorkout.title }}
              </h4>
              <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span v-if="recommendationStore.todayWorkout.durationSec">{{ Math.round(recommendationStore.todayWorkout.durationSec / 60) }} min</span>
                <span v-if="recommendationStore.todayWorkout.tss">• {{ Math.round(recommendationStore.todayWorkout.tss) }} TSS</span>
                <span>• {{ recommendationStore.todayWorkout.type }}</span>
              </div>
            </div>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
        </div>
        <div v-else class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-gray-500">
            <UIcon name="i-heroicons-calendar" class="w-5 h-5" />
            <span class="text-sm">No workout planned</span>
          </div>
          <UButton 
            size="xs" 
            color="primary" 
            variant="soft" 
            icon="i-heroicons-sparkles"
            @click="openCreateAdHoc"
          >
            Generate
          </UButton>
        </div>
      </div>

      <!-- The Insight Section -->
      <div v-if="recommendationStore.todayRecommendation">
        <p class="text-sm">{{ recommendationStore.todayRecommendation.reasoning }}</p>
        
        <div v-if="recommendationStore.todayRecommendation.analysisJson?.suggested_modifications" class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3">
          <div class="flex justify-between items-start mb-2">
            <p class="text-sm font-medium">Suggested Modification:</p>
            <div v-if="recommendationStore.todayRecommendation.userAccepted" class="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wide bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
              <UIcon name="i-heroicons-check" class="w-3 h-3" />
              <span>Accepted</span>
            </div>
          </div>
          <p class="text-sm">{{ recommendationStore.todayRecommendation.analysisJson.suggested_modifications.description }}</p>
        </div>
      </div>
      <div v-else-if="recommendationStore.todayWorkout" class="text-sm text-muted">
        Get AI-powered guidance for this workout based on your recovery.
      </div>
    </div>
    
    <template #footer>
      <div class="grid grid-cols-2 gap-3">
        <div v-if="recommendationStore.todayRecommendation && !recommendationStore.generating" class="col-span-1 grid grid-cols-2 gap-2">
           <UButton
            color="neutral"
            variant="outline"
            size="sm"
            class="font-bold w-full"
            @click="$emit('open-details')"
          >
            Details
          </UButton>
           <UButton
            color="primary"
            variant="soft"
            size="sm"
            class="font-bold w-full"
            @click="openRefineModal"
          >
            Refine
          </UButton>
        </div>
        <UButton
          v-else-if="!recommendationStore.generating"
          color="neutral"
          variant="outline"
          size="sm"
          class="font-bold"
          @click="$emit('open-details')"
          :disabled="!recommendationStore.todayRecommendation"
        >
          Details
        </UButton>
        
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-bold"
          :class="{ 'col-span-2': !recommendationStore.todayRecommendation || recommendationStore.generating }"
          @click="() => recommendationStore.generateTodayRecommendation()"
          :loading="recommendationStore.generating"
          :disabled="recommendationStore.generating || recommendationStore.generatingAdHoc"
          icon="i-heroicons-arrow-path"
        >
          {{ recommendationStore.generating ? 'Thinking...' : (recommendationStore.todayRecommendation ? 'Refresh' : 'Get Insight') }}
        </UButton>
      </div>
    </template>
  </UCard>
  
  <DashboardCreateAdHocModal
    v-model:open="showCreateAdHoc"
    :loading="recommendationStore.generatingAdHoc"
    @submit="handleCreateAdHoc"
  />

  <DashboardRefineRecommendationModal
    v-model:open="showRefine"
    :loading="recommendationStore.generating"
    @submit="handleRefine"
  />
</template>

<script setup lang="ts">
import DashboardCreateAdHocModal from '~/components/dashboard/DashboardCreateAdHocModal.vue'
import DashboardRefineRecommendationModal from '~/components/dashboard/DashboardRefineRecommendationModal.vue'

const integrationStore = useIntegrationStore()
const recommendationStore = useRecommendationStore()

defineEmits(['open-details'])

const showCreateAdHoc = ref(false)
const showRefine = ref(false)

onMounted(async () => {
  await recommendationStore.fetchTodayWorkout()
})

function openCreateAdHoc() {
  showCreateAdHoc.value = true
}

function openRefineModal() {
  showRefine.value = true
}

async function handleRefine(feedback: string) {
  showRefine.value = false
  await recommendationStore.generateTodayRecommendation(feedback)
}

async function handleCreateAdHoc(data: any) {
  showCreateAdHoc.value = false
  await recommendationStore.generateAdHocWorkout(data)
}

function getLoadingText() {
  if (recommendationStore.generatingAdHoc) return 'Designing your workout...'
  if (recommendationStore.generating) return 'Generating recommendation...'
  return 'Loading...'
}

function getWorkoutIcon(type: string) {
  if (!type) return 'i-heroicons-bolt'
  const t = type.toLowerCase()
  if (t.includes('run')) return 'i-heroicons-play' // Placeholder for run
  if (t.includes('ride') || t.includes('cycle')) return 'i-heroicons-bolt'
  if (t.includes('swim')) return 'i-heroicons-water' // Placeholder
  if (t.includes('weight') || t.includes('gym')) return 'i-heroicons-trophy'
  return 'i-heroicons-bolt'
}

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
