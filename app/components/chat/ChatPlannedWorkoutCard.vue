<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import WorkoutMessagesTimeline from '~/components/workouts/WorkoutMessagesTimeline.vue'

  const props = defineProps<{
    toolName: string
    response: any
    args?: Record<string, any>
  }>()

  const isExpanded = ref(false)
  const showSteps = ref(false)
  const showMessages = ref(false)
  const showRaw = ref(false)

  const plannedWorkout = computed(() => {
    const response = props.response || {}

    if (response?.structuredWorkout && typeof response.structuredWorkout === 'object') {
      return response
    }

    const structure = response?.structured_workout || response?.structuredWorkout
    if (structure && typeof structure === 'object') {
      const durationMinutes =
        typeof response.duration_minutes === 'number' ? response.duration_minutes : undefined

      return {
        id: response.workout_id || props.args?.workout_id,
        title: response.title || 'Planned Workout',
        date: response.date,
        type: response.type || 'Ride',
        durationSec:
          typeof response.durationSec === 'number'
            ? response.durationSec
            : durationMinutes
              ? durationMinutes * 60
              : undefined,
        tss: response.tss,
        structuredWorkout: structure
      }
    }

    return null
  })

  const hasVisualization = computed(() => {
    const structured = plannedWorkout.value?.structuredWorkout
    if (!structured || typeof structured !== 'object') return false
    return (
      (Array.isArray(structured.steps) && structured.steps.length > 0) ||
      (Array.isArray(structured.exercises) && structured.exercises.length > 0)
    )
  })

  const chartPreference = computed<'power' | 'hr' | 'pace'>(() => {
    const steps = plannedWorkout.value?.structuredWorkout?.steps
    if (!Array.isArray(steps)) return 'power'

    const hasPace = steps.some((s: any) => s?.pace)
    const hasHr = steps.some((s: any) => s?.heartRate)
    const hasPower = steps.some((s: any) => s?.power)

    if (hasPower) return 'power'
    if (hasHr) return 'hr'
    if (hasPace) return 'pace'
    return 'power'
  })

  const flattenedSteps = computed(() => {
    const steps = plannedWorkout.value?.structuredWorkout?.steps
    if (!Array.isArray(steps)) return []

    const flatten = (items: any[], depth = 0): any[] => {
      const out: any[] = []

      for (const item of items) {
        const children = Array.isArray(item?.steps) ? item.steps : []
        if (children.length > 0) {
          const reps = Number(item?.reps) > 1 ? Number(item.reps) : 1
          for (let i = 0; i < reps; i++) {
            out.push(...flatten(children, depth + 1))
          }
          continue
        }

        out.push({
          ...item,
          _depth: depth
        })
      }

      return out
    }

    return flatten(steps)
  })

  const plannedWorkoutLink = computed(() => {
    const id = plannedWorkout.value?.id
    return id ? `/workouts/planned/${id}` : undefined
  })

  const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value
    if (!isExpanded.value) {
      showSteps.value = false
      showMessages.value = false
      showRaw.value = false
    }
  }

  const formatDuration = (durationSec?: number) => {
    if (!durationSec) return '-'
    const totalMinutes = Math.round(durationSec / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  const formatStepTarget = (step: any) => {
    if (step?.power?.range) {
      return `${Math.round(step.power.range.start * 100)}-${Math.round(step.power.range.end * 100)}% FTP`
    }
    if (step?.power?.value) return `${Math.round(step.power.value * 100)}% FTP`
    if (step?.heartRate?.range) {
      return `${Math.round(step.heartRate.range.start * 100)}-${Math.round(step.heartRate.range.end * 100)}% LTHR`
    }
    if (step?.heartRate?.value) return `${Math.round(step.heartRate.value * 100)}% LTHR`
    if (step?.pace?.range) {
      return `${Math.round(step.pace.range.start * 100)}-${Math.round(step.pace.range.end * 100)}% pace`
    }
    if (step?.pace?.value) return `${Math.round(step.pace.value * 100)}% pace`
    return '-'
  }

  const formatStepDuration = (step: any) => {
    const sec = Number(step?.durationSeconds || step?.duration || 0)
    if (!sec) return '-'
    const min = Math.floor(sec / 60)
    const rem = sec % 60
    if (min === 0) return `${rem}s`
    if (rem === 0) return `${min}m`
    return `${min}:${String(rem).padStart(2, '0')}`
  }

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }
</script>

<template>
  <div
    v-if="hasVisualization"
    class="my-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden"
  >
    <button
      class="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      :class="{ 'border-b border-gray-200 dark:border-gray-700': isExpanded }"
      @click="toggleExpanded"
    >
      <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />

      <div class="flex-1 min-w-0 text-left">
        <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {{ plannedWorkout?.title || 'Planned Workout' }}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap gap-2">
          <span v-if="plannedWorkout?.date">{{ plannedWorkout.date }}</span>
          <span v-if="plannedWorkout?.type">{{ plannedWorkout.type }}</span>
          <span>{{ formatDuration(plannedWorkout?.durationSec) }}</span>
          <span v-if="plannedWorkout?.tss">TSS {{ Math.round(plannedWorkout.tss) }}</span>
        </div>
      </div>

      <MiniWorkoutChart
        :workout="plannedWorkout?.structuredWorkout"
        :preference="chartPreference"
        :show-cadence="true"
        class="h-7 w-24 flex-shrink-0 mt-0.5"
      />

      <UIcon
        :name="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="w-4 h-4 text-gray-400 flex-shrink-0 mt-1"
      />
    </button>

    <div v-if="isExpanded" class="p-4 space-y-3">
      <div class="flex flex-wrap gap-2">
        <UButton
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-heroicons-list-bullet"
          @click="showSteps = !showSteps"
        >
          {{ showSteps ? 'Hide Steps' : 'Show Steps' }}
        </UButton>
        <UButton
          v-if="plannedWorkout?.structuredWorkout?.messages?.length"
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-heroicons-chat-bubble-left-right"
          @click="showMessages = !showMessages"
        >
          {{ showMessages ? 'Hide Cues' : 'Show Cues' }}
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-heroicons-code-bracket-square"
          @click="showRaw = !showRaw"
        >
          {{ showRaw ? 'Hide Raw JSON' : 'Show Raw JSON' }}
        </UButton>
        <UButton
          v-if="plannedWorkoutLink"
          :to="plannedWorkoutLink"
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-heroicons-arrow-top-right-on-square"
        >
          Open
        </UButton>
      </div>

      <div v-if="showSteps && flattenedSteps.length" class="space-y-2">
        <div
          v-for="(step, index) in flattenedSteps"
          :key="`step-${index}`"
          class="rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-950"
        >
          <div class="text-sm font-medium" :style="{ paddingLeft: `${(step._depth || 0) * 10}px` }">
            {{ step.name || step.type || `Step ${index + 1}` }}
          </div>
          <div class="text-xs text-muted mt-1 flex flex-wrap gap-2">
            <span>{{ formatStepDuration(step) }}</span>
            <span>{{ formatStepTarget(step) }}</span>
          </div>
        </div>
      </div>

      <WorkoutMessagesTimeline
        v-if="showMessages && plannedWorkout?.structuredWorkout?.messages?.length"
        :workout="plannedWorkout.structuredWorkout"
      />

      <div
        v-if="showRaw"
        class="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-3 max-h-80 overflow-y-auto"
      >
        <pre
          class="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap break-words"
        ><code>{{ formatJson(response) }}</code></pre>
      </div>
    </div>
  </div>
</template>
