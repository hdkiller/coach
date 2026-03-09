<template>
  <div
    class="bg-zinc-50 dark:bg-gray-900 rounded-none sm:rounded-3xl shadow-sm dark:shadow-2xl p-6 sm:p-10 border border-zinc-200 dark:border-white/5 relative overflow-hidden flex flex-col gap-8"
  >
    <!-- GHOST DECORATION -->
    <div
      class="absolute top-0 left-0 w-64 h-64 bg-primary-500/5 blur-[100px] pointer-events-none -ml-32 -mt-32"
    />

    <div class="flex items-center justify-between relative z-10">
      <h2
        class="text-xl sm:text-2xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-primary-500" />
        Prescribed Plan Adherence
      </h2>
      <div v-if="!readOnly" class="flex gap-2">
        <UButton
          v-if="plannedWorkout?.id"
          icon="i-heroicons-calendar"
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-black uppercase tracking-widest text-[10px] hidden sm:flex text-zinc-600 dark:text-zinc-400"
          :to="`/workouts/planned/${plannedWorkout.id}`"
        >
          View Plan
        </UButton>
        <UButton
          icon="i-heroicons-arrow-path"
          color="neutral"
          variant="subtle"
          size="sm"
          class="font-black uppercase tracking-widest text-[10px] bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10"
          :loading="regenerating"
          @click="$emit('regenerate')"
        >
          {{ adherence ? 'Regenerate' : 'Analyze' }}
        </UButton>
      </div>
    </div>

    <!-- TARGET OBJECTIVES CARD -->
    <div
      class="relative group/plan overflow-hidden p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-inner transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.04] z-10"
    >
      <!-- 1px Gradient Border Overlay -->
      <div
        class="absolute inset-0 pointer-events-none opacity-30 group-hover/plan:opacity-100 transition-opacity border border-primary-500/20 rounded-2xl"
      />

      <div class="flex flex-wrap items-center justify-between gap-6 relative z-10">
        <div class="flex-1 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <UIcon
              name="i-heroicons-viewfinder-circle"
              class="w-4 h-4 text-zinc-400 dark:text-zinc-500"
            />
            <span
              class="font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em]"
              >Target Objectives</span
            >
          </div>
          <h3
            class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter truncate"
          >
            {{ plannedWorkout?.title || 'No Prescribed Plan' }}
          </h3>
        </div>

        <div class="flex items-center gap-4">
          <!-- Compliance Score Dial (if exists) -->
          <div
            v-if="adherence"
            class="flex items-center gap-5 pl-6 border-l border-zinc-100 dark:border-white/5"
          >
            <div class="flex flex-col items-end">
              <span
                class="font-mono text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
                >Compliance</span
              >
              <span class="text-sm font-black text-zinc-900 dark:text-white uppercase mt-0.5">{{
                getScoreLabel(adherence.overallScore)
              }}</span>
            </div>
            <div
              class="relative w-16 h-16 flex items-center justify-center rounded-2xl border-2 shadow-sm dark:shadow-2xl transition-all duration-500 bg-white dark:bg-black"
              :class="getScoreBorderColor(adherence.overallScore)"
            >
              <!-- Glowing Edge -->
              <div
                class="absolute inset-0 rounded-2xl opacity-20 blur-md"
                :class="getScoreBgColor(adherence.overallScore)"
              />
              <span
                class="text-3xl font-black tabular-nums tracking-tighter relative z-10"
                :class="getScoreTextColor(adherence.overallScore)"
              >
                {{ adherence.overallScore }}<span class="text-[10px] opacity-50 ml-0.5">%</span>
              </span>
            </div>
          </div>

          <div v-else class="flex flex-wrap gap-2">
            <div
              v-if="plannedWorkout?.type"
              class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/5 font-mono text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest"
            >
              {{ plannedWorkout.type }}
            </div>
            <div
              v-if="plannedWorkout?.durationSec"
              class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/5 font-mono text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest"
            >
              {{ formatDuration(plannedWorkout.durationSec) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AUDIT RESULTS LAYER -->
    <div v-if="adherence" class="space-y-10 relative z-10">
      <!-- Executive Summary (Briefing Style) -->
      <div
        class="bg-white dark:bg-white/[0.03] backdrop-blur-md rounded-2xl p-6 border border-zinc-200 dark:border-white/5 relative overflow-hidden shadow-sm dark:shadow-none"
      >
        <div class="absolute top-0 left-0 w-1 h-full bg-primary-500/40" />
        <div class="flex items-center gap-2 mb-4">
          <UIcon
            name="i-heroicons-chat-bubble-bottom-center-text"
            class="w-4 h-4 text-primary-500"
          />
          <span
            class="font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]"
            >Coach's Briefing</span
          >
        </div>
        <p class="text-base text-zinc-700 dark:text-zinc-200 leading-relaxed font-medium">
          {{ adherence.summary }}
        </p>
      </div>

      <!-- Deviations HUD Grid -->
      <div
        v-if="adherence.deviations && adherence.deviations.length > 0"
        class="flex flex-col gap-4"
      >
        <h3
          class="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em]"
        >
          Technical Deviations Detected
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="(dev, idx) in adherence.deviations"
            :key="idx"
            class="bg-white dark:bg-white/[0.01] rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden group/dev hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-all duration-300 shadow-sm dark:shadow-none"
          >
            <div
              class="px-5 py-3 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.02]"
            >
              <span
                class="font-mono text-[9px] font-black text-zinc-700 dark:text-white uppercase tracking-[0.2em]"
                >{{ dev.metric }}</span
              >
              <div
                class="px-2 py-0.5 rounded border font-black uppercase tracking-widest text-[8px] transition-colors duration-500"
                :class="[
                  dev.deviation.toLowerCase().includes('high') ||
                  dev.deviation.toLowerCase().includes('low')
                    ? 'border-red-500/30 text-red-500 dark:text-red-400 bg-red-500/5'
                    : 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/5'
                ]"
              >
                {{ dev.deviation }}
              </div>
            </div>
            <div class="px-5 py-5 flex flex-col gap-3">
              <div class="flex items-center gap-4 font-mono text-[10px] font-black">
                <div class="flex flex-col">
                  <span
                    class="text-zinc-400 dark:text-zinc-600 uppercase text-[8px] tracking-widest mb-0.5"
                    >Planned</span
                  >
                  <span class="text-zinc-600 dark:text-zinc-400">{{ dev.planned }}</span>
                </div>
                <div class="w-px h-6 bg-zinc-100 dark:bg-white/5" />
                <div class="flex flex-col">
                  <span
                    class="text-zinc-400 dark:text-zinc-600 uppercase text-[8px] tracking-widest mb-0.5"
                    >Actual</span
                  >
                  <span
                    class="text-zinc-900 dark:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                    >{{ dev.actual }}</span
                  >
                </div>
              </div>
              <p
                class="text-xs text-zinc-500 dark:text-zinc-500 font-medium leading-relaxed italic border-l border-zinc-100 dark:border-white/10 pl-3 py-1"
              >
                "{{ dev.impact }}"
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Strategic Recommendations -->
      <div
        v-if="adherence.recommendations && adherence.recommendations.length > 0"
        class="bg-white dark:bg-white/[0.01] rounded-2xl p-8 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-inner"
      >
        <h3
          class="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] mb-6"
        >
          Strategic Course Corrections
        </h3>
        <div class="space-y-5">
          <div
            v-for="(rec, idx) in adherence.recommendations"
            :key="idx"
            class="flex items-start gap-4 text-sm text-zinc-700 dark:text-zinc-300 font-medium group/rec"
          >
            <div
              class="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0 group-hover/rec:shadow-[0_0_10px_#00DC82] transition-all"
            />
            <span class="leading-relaxed">{{ rec }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="adherence.analyzedAt"
        class="font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-600 text-center pt-4 uppercase tracking-[0.3em]"
      >
        Audit Synchronized • {{ formatShortDate(adherence.analyzedAt) }}
      </div>
    </div>

    <!-- PENDING SCANNING STATE -->
    <div
      v-else-if="regenerating"
      class="flex flex-col items-center justify-center py-20 relative z-10"
    >
      <div class="relative w-24 h-24 mb-8">
        <div class="absolute inset-0 rounded-full border-2 border-primary-500/20 animate-ping" />
        <div class="absolute inset-0 rounded-full border-t-2 border-primary-500 animate-spin" />
        <div class="absolute inset-4 rounded-full border border-primary-500/40 animate-pulse" />
        <div class="absolute inset-0 flex items-center justify-center">
          <UIcon name="i-heroicons-cpu-chip" class="w-8 h-8 text-primary-500" />
        </div>
      </div>
      <p
        class="text-sm font-black uppercase tracking-[0.3em] text-zinc-900 dark:text-white animate-pulse"
      >
        Executing Adherence Audit...
      </p>
      <p
        class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase mt-2 tracking-widest"
      >
        Scanning telemetry patterns
      </p>
    </div>

    <!-- INITIAL STATE -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-20 text-center relative z-10 group"
    >
      <div
        class="w-20 h-20 bg-white dark:bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-zinc-200 dark:border-white/10 group-hover:border-primary-500/30 transition-colors shadow-sm"
      >
        <UIcon
          name="i-heroicons-adjustments-horizontal"
          class="w-10 h-10 text-zinc-400 dark:text-zinc-600 group-hover:text-primary-500 transition-colors"
        />
      </div>
      <h3 class="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-2">
        Audit Data Pending
      </h3>
      <p class="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
        Initialize performance auditing to discover how well this session adhered to your prescribed
        metabolic goals.
      </p>
      <UButton
        v-if="!readOnly"
        size="lg"
        color="primary"
        variant="solid"
        class="mt-10 font-black uppercase tracking-[0.2em] text-[11px] px-10 py-4 shadow-lg dark:shadow-[0_0_30px_rgba(0,220,130,0.2)] rounded-xl"
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
    if (score >= 90) return 'border-[#00DC82]/40 shadow-[#00DC82]/10'
    if (score >= 75) return 'border-yellow-500/40 shadow-yellow-500/10'
    return 'border-pink-500/40 shadow-pink-500/10'
  }

  function getScoreBgColor(score: number) {
    if (score >= 90) return 'bg-[#00DC82]'
    if (score >= 75) return 'bg-yellow-500'
    return 'bg-pink-500'
  }

  function getScoreTextColor(score: number) {
    if (score >= 90) return 'text-[#00DC82]'
    if (score >= 75) return 'text-yellow-500'
    return 'text-pink-500'
  }

  function getScoreLabel(score: number) {
    if (score >= 90) return 'High Integrity'
    if (score >= 75) return 'Functional Sync'
    if (score >= 60) return 'Partial Slippage'
    return 'Critical Deviation'
  }
</script>
