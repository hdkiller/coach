<template>
  <UCard
    class="flex flex-col h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer overflow-hidden group"
    @click="$emit('view', athlete)"
  >
    <template #header>
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <UAvatar
            :src="athlete.image"
            :alt="athlete.name"
            size="lg"
            class="ring-2 ring-gray-100 dark:ring-gray-800"
          />
          <div class="min-w-0">
            <h4
              class="font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors"
            >
              {{ athlete.name }}
            </h4>
            <p class="text-xs text-neutral-500 truncate">{{ athlete.email }}</p>
          </div>
        </div>

        <div class="flex flex-col items-end gap-1">
          <UBadge
            v-if="athlete.recommendations?.length"
            :color="getRecommendationColor(athlete.recommendations[0].recommendation)"
            size="xs"
            variant="subtle"
            class="font-bold uppercase tracking-wider"
          >
            {{ getRecommendationLabel(athlete.recommendations[0].recommendation) }}
          </UBadge>
          <p v-if="athlete.profileLastUpdated" class="text-[10px] text-neutral-400 font-medium">
            {{ formatRelativeTime(athlete.profileLastUpdated) }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- 1. Primary Metrics Grid -->
      <div class="grid grid-cols-3 gap-2">
        <div
          class="bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-center border border-gray-100 dark:border-gray-800"
        >
          <p class="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">Fitness</p>
          <p class="text-lg font-black text-blue-600 dark:text-blue-400 leading-tight">
            {{ currentCTL !== undefined && currentCTL !== null ? Math.round(currentCTL) : '--' }}
          </p>
          <p class="text-[9px] text-neutral-400">CTL</p>
        </div>
        <div
          class="bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-center border border-gray-100 dark:border-gray-800"
        >
          <p class="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">Form</p>
          <p class="text-lg font-black leading-tight" :class="getTSBColor(currentTSB)">
            {{ currentTSB !== null ? Math.round(currentTSB) : '--' }}
          </p>
          <p class="text-[9px] text-neutral-400">TSB</p>
        </div>
        <div
          class="bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-center border border-gray-100 dark:border-gray-800"
        >
          <p class="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">7d Comp.</p>
          <p
            class="text-lg font-black leading-tight"
            :class="(athlete.stats?.adherence7d || 0) >= 80 ? 'text-green-600' : 'text-orange-500'"
          >
            {{ athlete.stats?.adherence7d ?? '--' }}%
          </p>
          <p class="text-[9px] text-neutral-400">
            {{ athlete.stats?.completedCount ?? 0 }}/{{ athlete.stats?.plannedCount ?? 0 }}
          </p>
        </div>
      </div>

      <!-- 2. Sparkline (Fitness Trend) -->
      <div class="h-16 w-full px-1 relative">
        <LineChart v-if="chartData" :data="chartData" :options="chartOptions" />
        <div
          v-else
          class="h-full flex items-center justify-center text-[10px] text-neutral-400 italic"
        >
          Insufficient trend data
        </div>
        <!-- Alert Pulse -->
        <div
          v-if="isOvertrained || isSlacking"
          class="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 animate-ping"
          :title="isOvertrained ? 'High Fatigue Alert' : 'Low Compliance Alert'"
        />
      </div>

      <!-- 3. Training Preview -->
      <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-neutral-400 uppercase tracking-tighter">Next Session</span>
          <span v-if="nextWorkout" class="text-neutral-500 font-medium">{{
            formatDate(nextWorkout.date)
          }}</span>
        </div>

        <div
          v-if="nextWorkout"
          class="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/30 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700"
        >
          <UIcon
            :name="getWorkoutIcon(nextWorkout.type)"
            class="w-4 h-4 text-primary-500 shrink-0"
          />
          <span class="text-xs font-bold truncate text-gray-700 dark:text-gray-300">
            {{ nextWorkout.title }}
          </span>
          <UBadge
            v-if="nextWorkout.tss"
            size="xs"
            color="neutral"
            variant="soft"
            class="ml-auto text-[9px]"
          >
            {{ Math.round(nextWorkout.tss) }} TSS
          </UBadge>
        </div>
        <div v-else class="text-[11px] text-neutral-400 italic py-1">
          No upcoming workouts planned.
        </div>

        <!-- Next Major Event -->
        <div
          v-if="nextEvent"
          class="flex items-center gap-2 mt-2 px-1 text-orange-600 dark:text-orange-400"
        >
          <UIcon name="i-heroicons-flag" class="w-3.5 h-3.5" />
          <span class="text-[11px] font-black uppercase tracking-tight">
            {{ daysToEvent }} DAYS TO {{ nextEvent.title }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          class="flex-1 font-bold"
          label="Analyze Athlete"
          icon="i-heroicons-chart-bar"
          variant="soft"
          size="sm"
          @click.stop="$emit('view', athlete)"
        />
        <UTooltip text="Message Athlete">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-chat-bubble-left-right"
            size="sm"
            @click.stop="$emit('message', athlete)"
          />
        </UTooltip>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
  import { Line as LineChart } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler
  } from 'chart.js'
  import { formatDistanceToNow } from 'date-fns'

  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

  const props = defineProps<{
    athlete: any
  }>()

  defineEmits(['view', 'message'])

  const currentWellness = computed(() => props.athlete.wellness?.[0] || null)
  const performanceSummary = computed(() => props.athlete.performanceSummary || null)
  const currentCTL = computed(
    () => performanceSummary.value?.currentCTL ?? currentWellness.value?.ctl ?? null
  )
  const currentTSB = computed(() => {
    if (
      performanceSummary.value?.currentTSB !== undefined &&
      performanceSummary.value?.currentTSB !== null
    ) {
      return performanceSummary.value.currentTSB
    }
    if (!currentWellness.value) return null
    if (currentWellness.value.ctl == null || currentWellness.value.atl == null) return null
    return currentWellness.value.ctl - currentWellness.value.atl
  })

  const nextWorkout = computed(() => props.athlete.plannedWorkouts?.[0] || null)
  const nextEvent = computed(() => props.athlete.events?.[0] || null)

  const daysToEvent = computed(() => {
    if (!nextEvent.value) return 0
    const diff = new Date(nextEvent.value.date).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  })

  // Alert Logic
  const isOvertrained = computed(() => currentTSB.value !== null && currentTSB.value < -25)
  const isSlacking = computed(() => (props.athlete.stats?.adherence7d || 100) < 60)

  const getTSBColor = (tsb: number | null) => {
    if (tsb === null) return 'text-neutral-400'
    if (tsb > 5) return 'text-green-500'
    if (tsb < -20) return 'text-red-500'
    return 'text-gray-900 dark:text-white'
  }

  const getRecommendationColor = (rec: string) => {
    const colors: Record<string, any> = {
      proceed: 'success',
      modify: 'warning',
      reduce_intensity: 'warning',
      rest: 'error'
    }
    return colors[rec] || 'neutral'
  }

  const getRecommendationLabel = (rec: string) => {
    const labels: Record<string, string> = {
      proceed: 'Optimal',
      modify: 'Caution',
      reduce_intensity: 'Overreach',
      rest: 'Recover'
    }
    return labels[rec] || rec
  }

  const getWorkoutIcon = (type: string) => {
    if (type?.toLowerCase().includes('run')) return 'i-heroicons-bolt'
    if (type?.toLowerCase().includes('ride') || type?.toLowerCase().includes('bike'))
      return 'i-heroicons-command-line'
    if (type?.toLowerCase().includes('weight') || type?.toLowerCase().includes('gym'))
      return 'i-heroicons-square-3-stack-3d'
    return 'i-heroicons-activity-diet'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch (e) {
      return ''
    }
  }

  // Chart Logic
  const chartData = computed(() => {
    const history = props.athlete.stats?.wellnessHistory || []
    if (history.length < 2) return null

    return {
      labels: history.map((w: any) => w.date),
      datasets: [
        {
          label: 'Fitness',
          data: history.map((w: any) => w.ctl),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true
        }
      ]
    }
  })

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 8,
        titleFont: { size: 10 },
        bodyFont: { size: 12, weight: 'bold' as const },
        callbacks: {
          label: (context: any) => `Fitness: ${Math.round(context.raw)} CTL`,
          title: (context: any) => {
            const date = new Date(context[0].label)
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
        }
      }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  }
</script>
