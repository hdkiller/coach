<script setup lang="ts">
  import { computed, onUnmounted, ref, watch } from 'vue'
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import WorkoutMessagesTimeline from '~/components/workouts/WorkoutMessagesTimeline.vue'

  const props = defineProps<{
    toolName: string
    response: any
    args?: Record<string, any>
  }>()
  const { formatDateUTC } = useFormat()

  const ACTIVE_RUN_STATUSES = new Set([
    'EXECUTING',
    'QUEUED',
    'WAITING_FOR_DEPLOY',
    'REATTEMPTING',
    'FROZEN',
    'PENDING_VERSION',
    'DELAYED',
    'WAITING'
  ])
  const FINAL_RUN_STATUSES = new Set([
    'COMPLETED',
    'FAILED',
    'CANCELED',
    'TIMED_OUT',
    'CRASHED',
    'SYSTEM_FAILURE'
  ])
  const SYNC_PENDING_STATUSES = new Set(['PENDING', 'QUEUED_FOR_SYNC'])
  const EXPECTS_STRUCTURE_TOOL_NAMES = new Set([
    'create_planned_workout',
    'update_planned_workout',
    'adjust_planned_workout',
    'generate_planned_workout_structure',
    'set_planned_workout_structure',
    'patch_planned_workout_structure'
  ])

  const isExpanded = ref(false)
  const showSteps = ref(false)
  const showMessages = ref(false)
  const showRaw = ref(false)

  const liveWorkout = ref<any | null>(null)
  const runStatus = ref<string | null>(null)
  const runError = ref<string | null>(null)
  const pollError = ref<string | null>(null)
  const isPolling = ref(false)
  const fallbackWorkoutId = ref<string | null>(null)

  const directWorkoutId = computed(() => {
    const response = props.response || {}
    return response.workout_id || props.args?.workout_id
  })

  const workoutId = computed(() => directWorkoutId.value || fallbackWorkoutId.value)

  const runId = computed(() => {
    const response = props.response || {}
    return response.run_id || response.taskId || null
  })

  const expectsStructure = computed(() => {
    return EXPECTS_STRUCTURE_TOOL_NAMES.has(props.toolName)
  })

  const runStatusLabel = computed(() => {
    if (!runStatus.value) return null
    if (ACTIVE_RUN_STATUSES.has(runStatus.value)) return 'Job running'
    if (runStatus.value === 'COMPLETED') return 'Job completed'
    return `Job ${runStatus.value.toLowerCase()}`
  })

  const plannedWorkout = computed(() => {
    if (liveWorkout.value && typeof liveWorkout.value === 'object') {
      return {
        id: liveWorkout.value.id,
        title: liveWorkout.value.title || 'Planned Workout',
        date: liveWorkout.value.date,
        startTime: liveWorkout.value.startTime,
        type: liveWorkout.value.type || 'Ride',
        durationSec: liveWorkout.value.durationSec,
        tss: liveWorkout.value.tss,
        syncStatus: liveWorkout.value.syncStatus,
        syncError: liveWorkout.value.syncError,
        structuredWorkout: liveWorkout.value.structuredWorkout
      }
    }

    const response = props.response || {}

    if (response?.structuredWorkout && typeof response.structuredWorkout === 'object') {
      return {
        ...response,
        id: response.workout_id || props.args?.workout_id,
        startTime: response.start_time || response.startTime,
        syncStatus: response.status
      }
    }

    const structure = response?.structured_workout || response?.structuredWorkout
    if (structure && typeof structure === 'object') {
      const durationMinutes =
        typeof response.duration_minutes === 'number' ? response.duration_minutes : undefined

      return {
        id: response.workout_id || props.args?.workout_id,
        title: response.title || 'Planned Workout',
        date: response.date,
        startTime: response.start_time || response.startTime,
        type: response.type || 'Ride',
        durationSec:
          typeof response.durationSec === 'number'
            ? response.durationSec
            : durationMinutes
              ? durationMinutes * 60
              : undefined,
        tss: response.tss,
        syncStatus: response.status,
        structuredWorkout: structure
      }
    }

    if (workoutId.value) {
      return {
        id: workoutId.value,
        title: response.title || 'Planned Workout',
        date: response.date,
        startTime: response.start_time || response.startTime,
        type: response.type || 'Ride',
        durationSec:
          typeof response.duration_minutes === 'number'
            ? response.duration_minutes * 60
            : undefined,
        syncStatus: response.status,
        structuredWorkout: null
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
          const repsRaw = Number(item?.reps ?? item?.repeat ?? item?.intervals)
          const reps = repsRaw > 1 ? repsRaw : 1
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

  const syncStatusLabel = computed(() => {
    const status = (plannedWorkout.value?.syncStatus || props.response?.status || '').toUpperCase()
    if (!status) return null
    if (status === 'SYNCED') return 'Synced to Intervals'
    if (status === 'LOCAL_ONLY') return 'Local only'
    if (SYNC_PENDING_STATUSES.has(status)) return 'Waiting for sync'
    if (status === 'FAILED') return 'Sync failed'
    return `Sync status: ${status}`
  })

  const operationStatusText = computed(() => {
    if (props.response?.success === false) {
      return props.response?.error || 'Operation failed'
    }

    const parts: string[] = []
    if (props.response?.success) {
      parts.push('Operation successful')
    }

    if (runStatusLabel.value) {
      parts.push(runStatusLabel.value)
    }

    if (syncStatusLabel.value) {
      parts.push(syncStatusLabel.value)
    }

    if (runError.value) {
      parts.push(runError.value)
    }

    if (!parts.length) {
      return null
    }

    return parts.join(' • ')
  })

  const currentSyncStatus = computed(() =>
    String(plannedWorkout.value?.syncStatus || props.response?.status || '').toUpperCase()
  )

  const isOperationComplete = computed(() => {
    if (props.response?.success === false) return false
    if (runError.value || pollError.value) return false
    if (runStatus.value && ACTIVE_RUN_STATUSES.has(runStatus.value)) return false
    if (SYNC_PENDING_STATUSES.has(currentSyncStatus.value)) return false
    if (expectsStructure.value && !hasVisualization.value) return false
    if (runId.value && runStatus.value && !FINAL_RUN_STATUSES.has(runStatus.value)) return false
    return true
  })

  const showStatusLine = computed(() => {
    if (props.response?.success === false) return true
    if (runError.value || pollError.value) return true
    if (runStatus.value && ACTIVE_RUN_STATUSES.has(runStatus.value)) return true
    if (SYNC_PENDING_STATUSES.has(currentSyncStatus.value)) return true
    return !isOperationComplete.value
  })

  const isJobRunning = computed(() => {
    return Boolean(runStatus.value && ACTIVE_RUN_STATUSES.has(runStatus.value))
  })

  const displayDate = computed(() => {
    const date = plannedWorkout.value?.date
    if (!date) return null
    return formatDateUTC(date, 'MMM d, yyyy')
  })

  const displayStartTime = computed(() => {
    if (!isOperationComplete.value) return null
    const time = plannedWorkout.value?.startTime
    return time || null
  })

  const shouldRenderCard = computed(() => {
    return Boolean(plannedWorkout.value || operationStatusText.value || workoutId.value)
  })

  const rawPayload = computed(() => {
    if (liveWorkout.value && typeof liveWorkout.value === 'object') {
      return liveWorkout.value
    }
    return props.response
  })

  let runPollTimer: ReturnType<typeof setInterval> | null = null
  let workoutPollTimer: ReturnType<typeof setInterval> | null = null

  const clearRunPolling = () => {
    if (runPollTimer) {
      clearInterval(runPollTimer)
      runPollTimer = null
    }
  }

  const clearWorkoutPolling = () => {
    if (workoutPollTimer) {
      clearInterval(workoutPollTimer)
      workoutPollTimer = null
    }
  }

  const clearPolling = () => {
    clearRunPolling()
    clearWorkoutPolling()
    isPolling.value = false
  }

  const fetchWorkout = async () => {
    if (!workoutId.value) return

    try {
      const data = await $fetch<{ workout?: any }>(`/api/workouts/planned/${workoutId.value}`)
      const workout = data?.workout || data
      if (workout && typeof workout === 'object') {
        liveWorkout.value = workout
      }
      pollError.value = null
    } catch (error: any) {
      pollError.value = error?.data?.message || error?.message || 'Failed to refresh workout status'
    }
  }

  const resolveWorkoutIdFromCreateArgs = async () => {
    if (directWorkoutId.value || fallbackWorkoutId.value) return
    if (props.toolName !== 'create_planned_workout') return
    const date = String(props.args?.date || '').slice(0, 10)
    if (!date) return

    try {
      const data = await $fetch<{ workouts?: any[] }>(
        `/api/workouts/planned/range?start=${date}&end=${date}`
      )
      const workouts = Array.isArray(data?.workouts) ? data.workouts : []
      if (!workouts.length) return

      const title = String(props.args?.title || '')
        .trim()
        .toLowerCase()
      const type = String(props.args?.type || '')
        .trim()
        .toLowerCase()
      const durationMinutes =
        typeof props.args?.duration_minutes === 'number' ? props.args.duration_minutes : null

      const byScore = [...workouts]
        .map((w) => {
          let score = 0
          if (
            title &&
            String(w.title || '')
              .trim()
              .toLowerCase() === title
          )
            score += 4
          else if (
            title &&
            String(w.title || '')
              .trim()
              .toLowerCase()
              .includes(title)
          )
            score += 2
          if (
            type &&
            String(w.type || '')
              .trim()
              .toLowerCase() === type
          )
            score += 2
          if (durationMinutes && typeof w.durationSec === 'number') {
            const minutes = Math.round(w.durationSec / 60)
            if (minutes === durationMinutes) score += 2
          }
          return { workout: w, score }
        })
        .sort((a, b) => b.score - a.score)

      const best = byScore[0]?.workout
      if (best?.id) {
        fallbackWorkoutId.value = best.id
      }
    } catch {
      // Ignore and keep generic card state.
    }
  }

  const fetchRunStatus = async () => {
    if (!runId.value) return

    try {
      const run = await $fetch<{ status?: string; error?: any }>(`/api/runs/${runId.value}`)
      runStatus.value = run?.status || null
      runError.value =
        typeof run?.error === 'string' ? run.error : run?.error?.message || run?.error?.name || null
    } catch (error: any) {
      runError.value = error?.data?.message || error?.message || 'Failed to read trigger job status'
      clearRunPolling()
    }
  }

  const startPolling = async () => {
    clearPolling()

    await resolveWorkoutIdFromCreateArgs()

    const hasRun = Boolean(runId.value)
    const hasWorkout = Boolean(workoutId.value)
    if (!hasRun && !hasWorkout) return

    isPolling.value = true

    if (hasWorkout) {
      await fetchWorkout()
      workoutPollTimer = setInterval(async () => {
        await fetchWorkout()

        const syncStatus = String(liveWorkout.value?.syncStatus || '').toUpperCase()
        const hasStructure = hasVisualization.value
        const shouldContinueForSync = SYNC_PENDING_STATUSES.has(syncStatus)
        const shouldContinueForStructure = expectsStructure.value && !hasStructure

        if (!shouldContinueForSync && !shouldContinueForStructure && !hasRun) {
          clearPolling()
        }
      }, 4000)
    }

    if (hasRun) {
      await fetchRunStatus()
      runPollTimer = setInterval(async () => {
        await fetchRunStatus()

        if (runStatus.value && FINAL_RUN_STATUSES.has(runStatus.value)) {
          clearRunPolling()

          if (hasWorkout) {
            await fetchWorkout()
          }

          const syncStatus = String(liveWorkout.value?.syncStatus || '').toUpperCase()
          const waitingSync = SYNC_PENDING_STATUSES.has(syncStatus)
          const waitingStructure = expectsStructure.value && !hasVisualization.value
          if (!waitingSync && !waitingStructure) {
            clearWorkoutPolling()
            isPolling.value = false
          }
        }
      }, 3000)
    }
  }

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

  watch(
    () => [
      workoutId.value,
      runId.value,
      props.response?.status,
      props.response?.success,
      props.toolName,
      props.args?.date,
      props.args?.title
    ],
    () => {
      startPolling()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    clearPolling()
  })
</script>

<template>
  <div
    v-if="shouldRenderCard"
    class="my-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-hidden"
  >
    <button
      class="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      :class="{ 'border-b border-gray-200 dark:border-gray-700': isExpanded }"
      @click="toggleExpanded"
    >
      <UIcon
        :name="hasVisualization ? 'i-heroicons-calendar-days' : 'i-heroicons-wrench-screwdriver'"
        class="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500"
      />

      <div class="flex-1 min-w-0 text-left">
        <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {{ plannedWorkout?.title || 'Planned Workout Operation' }}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap gap-2">
          <span v-if="displayDate">{{ displayDate }}</span>
          <span v-if="displayStartTime">{{ displayStartTime }}</span>
          <span v-if="plannedWorkout?.type">{{ plannedWorkout.type }}</span>
          <span v-if="plannedWorkout?.durationSec">{{
            formatDuration(plannedWorkout?.durationSec)
          }}</span>
          <span v-if="plannedWorkout?.tss">TSS {{ Math.round(plannedWorkout.tss) }}</span>
        </div>
        <div
          v-if="showStatusLine && (operationStatusText || isPolling)"
          class="text-xs mt-1"
          :class="
            props.response?.success === false
              ? 'text-red-500'
              : 'text-emerald-600 dark:text-emerald-400'
          "
        >
          <span v-if="isJobRunning" class="inline-flex items-center gap-1.5">
            <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
            {{ operationStatusText || 'Job running' }}
          </span>
          <span v-else>
            {{ operationStatusText || 'Checking status...' }}
          </span>
        </div>
      </div>

      <MiniWorkoutChart
        v-if="hasVisualization"
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
          v-if="flattenedSteps.length"
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

      <div
        v-if="pollError"
        class="rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-2 text-xs text-red-700 dark:text-red-300"
      >
        {{ pollError }}
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
        ><code>{{ formatJson(rawPayload) }}</code></pre>
      </div>
    </div>
  </div>
</template>
