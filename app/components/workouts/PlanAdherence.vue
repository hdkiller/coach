<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
  >
    <div class="flex items-center justify-between mb-8">
      <h2
        class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2"
      >
        <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5 text-primary-500" />
        Prescribed Plan Adherence
      </h2>
      <div v-if="!readOnly" class="flex gap-2">
        <UButton
          v-if="plannedWorkout?.id"
          icon="i-heroicons-calendar"
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-black uppercase tracking-widest text-[10px]"
          :to="`/workouts/planned/${plannedWorkout.id}`"
        >
          View Plan
        </UButton>
        <UButton
          icon="i-heroicons-arrow-path"
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-black uppercase tracking-widest text-[10px]"
          :loading="regenerating"
          @click="$emit('regenerate')"
        >
          {{ adherence ? 'Regenerate' : 'Analyze' }}
        </UButton>
      </div>
    </div>

    <!-- Plan Info and Adherence Score Row -->
    <div
      class="mb-8 bg-gray-50 dark:bg-gray-950 rounded-xl p-5 flex flex-wrap items-center gap-6 border border-gray-100 dark:border-gray-800"
    >
      <!-- Adherence Score (if exists) -->
      <div
        v-if="adherence"
        class="flex items-center gap-4 pr-6 border-r border-gray-200 dark:border-gray-800"
      >
        <div
          class="relative w-16 h-16 flex items-center justify-center rounded-xl border-2 flex-shrink-0 bg-white dark:bg-gray-900 shadow-sm"
          :class="getScoreBorderColor(adherence.overallScore)"
        >
          <span
            class="text-2xl font-black tracking-tighter"
            :class="getScoreTextColor(adherence.overallScore)"
          >
            {{ adherence.overallScore }}
          </span>
        </div>
        <div class="hidden sm:block">
          <div class="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">
            Adherence Score
          </div>
          <div class="text-sm font-black text-gray-900 dark:text-white uppercase mt-0.5">
            {{ getScoreLabel(adherence.overallScore) }}
          </div>
        </div>
      </div>

      <!-- Planned Workout Details -->
      <div
        v-if="plannedWorkout"
        class="flex-1 min-w-[200px] flex flex-wrap items-center gap-x-8 gap-y-3"
      >
        <div class="flex-1 min-w-[150px]">
          <div
            class="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-widest mb-1"
          >
            Target Objectives
          </div>
          <div
            class="text-base font-black text-gray-900 dark:text-white truncate uppercase tracking-tight"
          >
            {{ plannedWorkout.title }}
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            v-if="plannedWorkout.type"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <UIcon name="i-heroicons-tag" class="w-3.5 h-3.5 text-gray-400" />
            <span
              class="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest"
              >{{ plannedWorkout.type }}</span
            >
          </div>

          <div
            v-if="plannedWorkout.durationSec"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-gray-400" />
            <span
              class="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest"
              >{{ formatDuration(plannedWorkout.durationSec) }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <div v-if="adherence" class="space-y-8">
      <!-- Summary -->
      <div
        class="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30"
      >
        <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
          {{ adherence.summary }}
        </p>
      </div>

      <!-- Deviations -->
      <div v-if="adherence.deviations && adherence.deviations.length > 0">
        <h3 class="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em]">
          Key Objective Deviations
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="(dev, idx) in adherence.deviations"
            :key="idx"
            class="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div
              class="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-900/30"
            >
              <span
                class="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest"
                >{{ dev.metric }}</span
              >
              <UBadge
                :color="getDeviationColor(dev.metric)"
                variant="soft"
                size="xs"
                class="font-black uppercase tracking-widest text-[9px]"
              >
                {{ dev.deviation }}
              </UBadge>
            </div>
            <div class="px-5 py-4">
              <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                Planned: <span class="text-gray-900 dark:text-white">{{ dev.planned }}</span> •
                Actual: <span class="text-gray-900 dark:text-white">{{ dev.actual }}</span>
              </div>
              <p
                class="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic"
              >
                "{{ dev.impact }}"
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div
        v-if="adherence.recommendations && adherence.recommendations.length > 0"
        class="bg-gray-50/50 dark:bg-gray-950/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800"
      >
        <h3 class="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em]">
          Strategic Course Corrections
        </h3>
        <ul class="space-y-4">
          <li
            v-for="(rec, idx) in adherence.recommendations"
            :key="idx"
            class="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 font-medium border-l-2 border-primary-500 pl-4 py-0.5"
          >
            <UIcon
              name="i-heroicons-light-bulb"
              class="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0"
            />
            <span>{{ rec }}</span>
          </li>
        </ul>
      </div>

      <div
        v-if="adherence.analyzedAt"
        class="text-[9px] font-black text-gray-400 text-center pt-4 uppercase tracking-widest"
      >
        Audit Synchronized • {{ formatShortDate(adherence.analyzedAt) }}
      </div>
    </div>

    <div v-else-if="regenerating" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"
      />
      <p class="text-sm text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest">
        Executing Adherence Audit...
      </p>
    </div>

    <div v-else class="text-center py-12">
      <div
        class="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-gray-400" />
      </div>
      <p class="text-sm font-black uppercase tracking-widest text-gray-500">Audit Data Pending</p>
      <p class="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
        Initialize performance auditing to discover how well this session adhered to your prescribed
        plan.
      </p>
      <UButton
        v-if="!readOnly"
        size="sm"
        color="primary"
        variant="solid"
        class="mt-6 font-black uppercase tracking-widest text-[10px]"
        @click="$emit('regenerate')"
      >
        Analyze Adherence
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    adherence: any | null
    regenerating: boolean
    plannedWorkout?: {
      id: string
      title: string
      type?: string
      durationSec?: number
    }
    readOnly?: boolean
  }>()

  defineEmits(['regenerate'])

  const { formatDuration } = useFormatters()
  const { formatShortDate } = useFormat()

  function getScoreBorderColor(score: number) {
    if (score >= 90) return 'border-green-500'
    if (score >= 70) return 'border-yellow-500'
    return 'border-red-500'
  }

  function getScoreTextColor(score: number) {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  function getScoreLabel(score: number) {
    if (score >= 90) return 'High Integrity'
    if (score >= 70) return 'Functional Sync'
    if (score >= 50) return 'Partial Slippage'
    return 'Critical Deviation'
  }

  function getDeviationColor(metric: string) {
    return 'warning' as const
  }

  function getDeviationBorderColor(metric: string) {
    return 'border-orange-400'
  }
</script>
