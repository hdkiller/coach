/** Task identifiers with handlers loaded by cw:worker. Keep this list in sync with registrations. */
export const REDIS_TASK_IDS = new Set([
  'adjust-structured-workout',
  'analyze-nutrition',
  'analyze-wellness',
  'analyze-workout',
  'autodetect-intervals-profile',
  'delete-user-account',
  'generate-athlete-profile',
  'generate-ad-hoc-workout',
  'generate-daily-checkin',
  'generate-recommendations',
  'generate-report',
  'generate-score-explanations',
  'generate-structured-workout',
  'generate-training-block',
  'generate-weekly-plan',
  'hello-world',
  'ingest-garmin',
  'ingest-intervals',
  'ingest-oura',
  'ingest-strava',
  'ingest-strava-activity',
  'ingest-strava-streams',
  'ingest-whoop',
  'recommend-today-activity',
  'send-email',
  'sentry-error-test'
])

export function isRedisTaskSupported(taskIdentifier: string): boolean {
  return REDIS_TASK_IDS.has(taskIdentifier)
}
