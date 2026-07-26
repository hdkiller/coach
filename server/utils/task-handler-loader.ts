let loadPromise: Promise<void> | null = null

/** Loads every Redis/inline-capable handler exactly once in the current process. */
export function ensureTaskHandlersRegistered(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all([
      import('./services/accountDeletionService'),
      import('./services/checkin-service'),
      import('./services/emailDeliveryService'),
      import('./services/garminService'),
      import('./services/intervalsService'),
      import('./services/ouraService'),
      import('./services/stravaService'),
      import('./services/whoopService'),
      import('./services/workoutAnalysisService'),
      import('../../trigger/adjust-structured-workout'),
      import('../../trigger/analyze-nutrition'),
      import('../../trigger/analyze-wellness'),
      import('../../trigger/autodetect-intervals-profile'),
      import('../../trigger/generate-athlete-profile'),
      import('../../trigger/generate-ad-hoc-workout'),
      import('../../trigger/generate-recommendations'),
      import('../../trigger/generate-report'),
      import('../../trigger/generate-score-explanations'),
      import('../../trigger/generate-structured-workout'),
      import('../../trigger/generate-training-block'),
      import('../../trigger/generate-weekly-plan'),
      import('../../trigger/hello-world'),
      import('../../trigger/ingest-all'),
      import('../../trigger/ingest-fit-file'),
      import('../../trigger/ingest-strava-activity'),
      import('../../trigger/ingest-strava-streams'),
      import('../../trigger/ingest-intervals'),
      import('../../trigger/ingest-oura'),
      import('../../trigger/ingest-whoop'),
      import('../../trigger/recommend-today-activity'),
      import('../../trigger/sentry-error-test')
    ]).then(() => undefined)
  }
  return loadPromise
}
