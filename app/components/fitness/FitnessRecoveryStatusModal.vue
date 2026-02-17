<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
              <UBadge :color="statusColor" variant="subtle" size="sm" class="font-black uppercase text-[10px]">
                {{ status }}
              </UBadge>
              Recovery Status Guide
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Status Interpretation -->
          <div class="space-y-3">
            <h4 class="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">What your status means</h4>
            <div class="p-3 rounded-lg border" :class="statusBgClass">
              <p class="text-sm font-medium leading-relaxed">
                {{ statusExplanation }}
              </p>
            </div>
          </div>

          <!-- How to Read the Chart -->
          <div class="space-y-4">
            <h4 class="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">How to read this chart</h4>
            
            <div class="grid grid-cols-1 gap-4">
              <div class="flex gap-3">
                <div class="size-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <div class="space-y-1">
                  <div class="text-sm font-bold text-gray-900 dark:text-white">Heart Rate Variability (HRV)</div>
                  <p class="text-xs text-muted leading-normal text-gray-500 dark:text-gray-400">
                    Measures the variation in time between heartbeats. Higher HRV relative to your baseline indicates a well-rested nervous system (Parasympathetic dominance).
                  </p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="size-2 rounded-full bg-red-500 border-2 border-dashed border-red-500 mt-1.5 shrink-0 bg-transparent" />
                <div class="space-y-1">
                  <div class="text-sm font-bold text-gray-900 dark:text-white">Resting Heart Rate (RHR)</div>
                  <p class="text-xs text-muted leading-normal text-gray-500 dark:text-gray-400">
                    The number of times your heart beats per minute while at rest. An elevated RHR often correlates with lower HRV and indicates physical strain or impending illness.
                  </p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="size-2 rounded-md bg-gray-200 dark:bg-gray-800 mt-1.5 shrink-0" />
                <div class="space-y-1">
                  <div class="text-sm font-bold text-gray-900 dark:text-white">The Normal Range (Shaded Area)</div>
                  <p class="text-xs text-muted leading-normal text-gray-500 dark:text-gray-400">
                    This is your "Green Zone" based on your {{ baselineDays }}d rolling average. Trends staying within or above this band are ideal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Pro Tip -->
          <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
            <div class="flex items-center gap-2 mb-1">
              <UIcon name="i-heroicons-light-bulb" class="size-4 text-blue-500" />
              <span class="text-xs font-black uppercase text-blue-700 dark:text-blue-400">Pro Interpretation</span>
            </div>
            <p class="text-xs text-blue-800 dark:text-blue-300 italic">
              Look for the "Scissors" pattern: HRV trending up while RHR trends down. This is the gold standard for improving cardiovascular fitness and recovery integrity.
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton color="primary" @click="isOpen = false"> Got it </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  const props = defineProps<{
    status: string
    statusColor: string
    baselineDays: number
    hrv: number
    baseline: number
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })

  const statusBgClass = computed(() => {
    if (props.statusColor === 'success') return 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800/50 text-green-800 dark:text-green-300'
    if (props.statusColor === 'error') return 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50 text-red-800 dark:text-red-300'
    return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-300'
  })

  const statusExplanation = computed(() => {
    if (props.status === 'Optimal') {
      return `Your HRV (${props.hrv}ms) is currently above your ${props.baselineDays}-day baseline (${props.baseline}ms). This indicates strong parasympathetic nervous system activity and high readiness for intense training.`
    }
    if (props.status === 'Strained') {
      return `Your HRV (${props.hrv}ms) has dropped significantly below your ${props.baselineDays}-day baseline (${props.baseline}ms). This suggests sympathetic dominance—often caused by high training load, poor sleep, alcohol, or early signs of sickness. Consider a recovery day.`
    }
    return `Your recovery is currently balanced within your normal range. Your autonomic nervous system is stable and handling your current training load appropriately.`
  })
</script>
