import { resourceCatalog } from '@trigger.dev/core/v3'
import { registerCanonicalTaskHandler } from '../../server/utils/task-registry'

export interface LoadedTaskDefinition {
  id: string
  maxDuration?: number
  retry?: {
    maxAttempts?: number
    factor?: number
    minTimeoutInMs?: number
    maxTimeoutInMs?: number
    randomize?: boolean
  }
  queue?: { name?: string; concurrencyLimit?: number }
  schedule?: { cron: string; timezone?: string }
}

class RedisTaskResourceCatalog {
  private tasks = new Map<string, any>()
  private queues = new Map<string, any>()

  registerTaskMetadata(task: any) {
    this.tasks.set(task.id, task)
  }

  updateTaskMetadata(id: string, updates: any) {
    this.tasks.set(id, { ...this.tasks.get(id), ...updates })
  }

  getTask(id: string) {
    return this.tasks.get(id)
  }

  taskExists(id: string) {
    return this.tasks.has(id)
  }

  listTaskManifests() {
    return Array.from(this.tasks.values())
  }

  getTaskManifest(id: string) {
    return this.tasks.get(id)
  }

  getTaskSchema(id: string) {
    return this.tasks.get(id)?.schema
  }

  registerQueueMetadata(queue: any) {
    this.queues.set(queue.name, queue)
  }

  listQueueManifests() {
    return Array.from(this.queues.values())
  }

  setCurrentFileContext() {}
  clearCurrentFileContext() {}
  registerWorkerManifest() {}
  listTaskIdCollisions() {
    return []
  }
  registerPromptMetadata() {}
  listPromptManifests() {
    return []
  }
  getPrompt() {}
  getPromptSchema() {}
  registerSkillMetadata() {}
  listSkillManifests() {
    return []
  }
  getSkillManifest() {}
}

const localCatalog = new RedisTaskResourceCatalog()
let loadPromise: Promise<void> | null = null

function createRunContext(
  taskId: string,
  runId?: string,
  signal?: AbortSignal,
  attemptNumber = 1,
  maxAttempts = 1
) {
  return {
    ctx: {
      task: { id: taskId },
      run: { id: runId || `redis:${taskId}`, maxAttempts },
      attempt: { number: attemptNumber },
      queue: {},
      environment: {},
      organization: {},
      project: {}
    },
    signal: signal || new AbortController().signal
  }
}

async function loadTriggerModules() {
  resourceCatalog.setGlobalResourceCatalog(localCatalog as any)

  await Promise.all([
    import('../../trigger/adapt-training-plan'),
    import('../../trigger/adjust-fueling-post-workout'),
    import('../../trigger/adjust-structured-workout'),
    import('../../trigger/analyze-last-3-nutrition'),
    import('../../trigger/analyze-last-3-workouts'),
    import('../../trigger/analyze-last-7-nutrition'),
    import('../../trigger/analyze-nutrition'),
    import('../../trigger/analyze-plan-adherence'),
    import('../../trigger/analyze-wellness'),
    import('../../trigger/analyze-workout'),
    import('../../trigger/autodetect-intervals-profile'),
    import('../../trigger/daily-checkin'),
    import('../../trigger/daily-coach'),
    import('../../trigger/deduplicate-workouts'),
    import('../../trigger/delete-user-account'),
    import('../../trigger/execute-chat-turn'),
    import('../../trigger/finalize-daily-nutrition'),
    import('../../trigger/garmin-backfill'),
    import('../../trigger/generate-ad-hoc-workout'),
    import('../../trigger/generate-athlete-profile'),
    import('../../trigger/generate-custom-report'),
    import('../../trigger/generate-fueling-plan'),
    import('../../trigger/generate-implementation-guide'),
    import('../../trigger/generate-recommendations'),
    import('../../trigger/generate-report'),
    import('../../trigger/generate-score-explanations'),
    import('../../trigger/generate-structured-workout'),
    import('../../trigger/generate-training-block'),
    import('../../trigger/generate-weekly-plan'),
    import('../../trigger/generate-weekly-report'),
    import('../../trigger/generate-workout-messages'),
    import('../../trigger/hello-world'),
    import('../../trigger/ingest-all'),
    import('../../trigger/ingest-fit-file'),
    import('../../trigger/ingest-fitbit'),
    import('../../trigger/ingest-garmin'),
    import('../../trigger/ingest-hevy'),
    import('../../trigger/ingest-intervals-streams'),
    import('../../trigger/ingest-intervals'),
    import('../../trigger/ingest-liftosaur'),
    import('../../trigger/ingest-oura'),
    import('../../trigger/ingest-polar'),
    import('../../trigger/ingest-rouvy-fit'),
    import('../../trigger/ingest-rouvy'),
    import('../../trigger/ingest-strava-activity'),
    import('../../trigger/ingest-strava-streams'),
    import('../../trigger/ingest-strava'),
    import('../../trigger/ingest-ultrahuman'),
    import('../../trigger/ingest-wahoo'),
    import('../../trigger/ingest-whoop'),
    import('../../trigger/ingest-withings'),
    import('../../trigger/ingest-yazio'),
    import('../../trigger/nutrition-last-call'),
    import('../../trigger/poll-ultrahuman'),
    import('../../trigger/process-resend-webhook'),
    import('../../trigger/process-sync-queue'),
    import('../../trigger/recommend-nutrition-meal'),
    import('../../trigger/recommend-today-activity'),
    import('../../trigger/review-goals'),
    import('../../trigger/schedule-onboarding-drip'),
    import('../../trigger/send-email'),
    import('../../trigger/sentry-error-test'),
    import('../../trigger/suggest-goals'),
    import('../../trigger/summarize-chat'),
    import('../../trigger/trial-ending-reminder')
  ])

  for (const manifest of resourceCatalog.listTaskManifests()) {
    const metadata = resourceCatalog.getTask(manifest.id)
    if (!metadata?.fns?.run) continue

    registerCanonicalTaskHandler(manifest.id, async (payload, context) => {
      const parsedPayload = metadata.fns.parsePayload
        ? await metadata.fns.parsePayload(payload)
        : payload
      return metadata.fns.run(
        parsedPayload,
        createRunContext(
          manifest.id,
          context?.runId,
          context?.signal,
          context?.attemptNumber,
          context?.maxAttempts
        ) as any
      )
    })
  }
}

/** Loads every Trigger task and adapts its canonical run function for Redis/inline execution. */
export function ensureTaskHandlersRegistered(): Promise<void> {
  if (!loadPromise) loadPromise = loadTriggerModules()
  return loadPromise
}

export function getLoadedTaskDefinitions(): LoadedTaskDefinition[] {
  return resourceCatalog.listTaskManifests().map((manifest: any) => ({
    id: manifest.id,
    maxDuration: manifest.maxDuration,
    retry: manifest.retry,
    queue: manifest.queue,
    schedule: manifest.schedule
  }))
}

export function getLoadedTaskDefinition(taskId: string): LoadedTaskDefinition | undefined {
  return getLoadedTaskDefinitions().find((task) => task.id === taskId)
}
