import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

export interface TriggerRun {
  id: string
  taskIdentifier: string
  status: string
  startedAt: string
  finishedAt?: string
  output?: any
  error?: any
  isTest?: boolean
}

// Global Singleton State
const runs = ref<TriggerRun[]>([])
const isConnected = ref(false)
const isLoading = ref(false)
let ws: WebSocket | null = null
let activeSubscribers = 0
let initPromise: Promise<void> | null = null
let pollInterval: NodeJS.Timeout | null = null

export function useUserRuns() {
  const { data: session } = useAuth()

  // --- Initial Fetch ---
  const fetchActiveRuns = async () => {
    if (isLoading.value && !pollInterval) return

    console.log('[useUserRuns] Fetching active runs...')
    isLoading.value = true
    try {
      const data = await $fetch<TriggerRun[]>('/api/runs/active')
      console.log('[useUserRuns] Fetched runs:', data.length)

      const finalRuns = [...runs.value]
      const existingMap = new Map(finalRuns.map((r) => [r.id, r]))

      data.forEach((apiRun) => {
        const existing = existingMap.get(apiRun.id)
        if (existing) {
          const isLocalFinal = ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(
            existing.status
          )
          const isApiFinal = ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(
            apiRun.status
          )

          if (isLocalFinal && !isApiFinal) {
            console.log(
              `[useUserRuns] Preserving local final status for ${apiRun.id} (${existing.status} vs API ${apiRun.status})`
            )
            Object.assign(existing, { ...apiRun, status: existing.status })
          } else {
            Object.assign(existing, apiRun)
          }
        } else {
          finalRuns.push(apiRun)
          existingMap.set(apiRun.id, apiRun)
        }
      })

      finalRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      runs.value = finalRuns
    } catch (e) {
      console.error('[useUserRuns] Failed to fetch active runs:', e)
    } finally {
      isLoading.value = false
    }
  }

  // --- Polling ---
  const startPolling = () => {
    if (pollInterval) return
    console.log('[useUserRuns] Starting polling fallback')
    pollInterval = setInterval(() => {
      if (!isConnected.value && activeSubscribers > 0) {
        fetchActiveRuns()
      }
    }, 5000)
  }

  const stopPolling = () => {
    if (pollInterval) {
      console.log('[useUserRuns] Stopping polling')
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  // --- WebSocket ---
  const connectWebSocket = () => {
    if (ws) return
    if (!session.value?.user?.id) {
      console.log('[useUserRuns] Skipping WS connect: No user ID')
      return
    }

    console.log('[useUserRuns] Connecting WebSocket...')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/websocket`

    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('[useUserRuns] WS Connected')
      isConnected.value = true
      stopPolling()
      ws?.send(
        JSON.stringify({
          type: 'subscribe_user',
          userId: session.value.user.id
        })
      )
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'run_update') {
          console.log('[useUserRuns] Received update:', data.taskIdentifier, data.status)
          handleRunUpdate(data)
        }
      } catch (e) {
        // Ignore
      }
    }

    ws.onclose = () => {
      console.log('[useUserRuns] WS Closed')
      isConnected.value = false
      ws = null
      startPolling()
      if (activeSubscribers > 0) {
        setTimeout(connectWebSocket, 3000)
      }
    }
  }

  const handleRunUpdate = (update: any) => {
    const existingIndex = runs.value.findIndex((r) => r.id === update.runId)

    const updatedRun: TriggerRun = {
      id: update.runId,
      taskIdentifier:
        update.taskIdentifier ||
        (existingIndex !== -1 ? runs.value[existingIndex].taskIdentifier : 'Unknown Task'),
      status: update.status,
      startedAt:
        update.startedAt ||
        (existingIndex !== -1 ? runs.value[existingIndex].startedAt : new Date().toISOString()),
      finishedAt: update.finishedAt,
      output: update.output,
      error: update.error
    }

    if (existingIndex !== -1) {
      runs.value[existingIndex] = { ...runs.value[existingIndex], ...updatedRun }
    } else {
      runs.value.unshift(updatedRun)
    }
  }

  const cancelRun = async (runId: string) => {
    try {
      await $fetch(`/api/runs/${runId}`, { method: 'DELETE' })
    } catch (e) {
      console.error(`[useUserRuns] Failed to cancel run ${runId}:`, e)
      throw e
    }
  }

  const init = async () => {
    if (!initPromise) {
      initPromise = fetchActiveRuns()
    }
    await initPromise
    connectWebSocket()
    if (!isConnected.value) {
      startPolling()
    }
  }

  if (import.meta.client) {
    watch(
      () => session.value?.user?.id,
      (newId) => {
        if (newId && !ws) {
          connectWebSocket()
        }
      }
    )
  }

  onMounted(() => {
    activeSubscribers++
    init()
  })

  onUnmounted(() => {
    activeSubscribers--
    if (activeSubscribers === 0) {
      if (ws) {
        ws.close()
        ws = null
      }
      isConnected.value = false
      initPromise = null
      stopPolling()
    }
  })

  return {
    runs,
    isConnected,
    isLoading,
    refresh: fetchActiveRuns,
    cancelRun
  }
}

export function useUserRunsState() {
  const { runs, cancelRun } = useUserRuns()

  const activeRunCount = computed(
    () =>
      runs.value.filter((r) =>
        ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING', 'FROZEN'].includes(r.status)
      ).length
  )

  const onTaskCompleted = (
    taskIdentifier: string,
    callback: (run: TriggerRun) => void | Promise<void>
  ) => {
    watch(
      runs,
      (newRuns, oldRuns) => {
        const newMatches = newRuns.filter((r) => r.taskIdentifier === taskIdentifier)
        newMatches.forEach((newRun) => {
          const isCompleted = newRun.status === 'COMPLETED'
          if (isCompleted) {
            const oldRun = oldRuns?.find((r) => r.id === newRun.id)
            if (!oldRun || oldRun.status !== 'COMPLETED') {
              console.log(`[useUserRuns] Task completed: ${taskIdentifier} (${newRun.id})`)
              callback(newRun)
            }
          }
        })
      },
      { deep: true }
    )
  }

  return {
    activeRunCount,
    runs,
    onTaskCompleted,
    cancelRun
  }
}
