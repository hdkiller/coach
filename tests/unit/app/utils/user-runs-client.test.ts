import { describe, expect, it } from 'vitest'

import {
  mergeActiveRunsFromApi,
  pruneRunsForCurrentUser,
  runBelongsToUser,
  type TriggerRun
} from '../../../app/utils/user-runs-client'

describe('user-runs-client', () => {
  it('matches runs to the current user tag', () => {
    const run: TriggerRun = {
      id: 'run-1',
      taskIdentifier: 'generate-structured-workout',
      status: 'EXECUTING',
      startedAt: new Date().toISOString(),
      tags: ['user:user-a']
    }

    expect(runBelongsToUser(run, 'user-a')).toBe(true)
    expect(runBelongsToUser(run, 'user-b')).toBe(false)
  })

  it('does not merge prior-user runs when API returns a fresh identity list', () => {
    const existingRuns: TriggerRun[] = [
      {
        id: 'old-run',
        taskIdentifier: 'generate-structured-workout',
        status: 'COMPLETED',
        startedAt: new Date().toISOString(),
        tags: ['user:user-a']
      }
    ]

    const apiRuns: TriggerRun[] = [
      {
        id: 'new-run',
        taskIdentifier: 'generate-structured-workout',
        status: 'EXECUTING',
        startedAt: new Date().toISOString(),
        tags: ['user:user-b']
      }
    ]

    const merged = mergeActiveRunsFromApi(existingRuns, apiRuns)
    const pruned = pruneRunsForCurrentUser(merged, 'user-b')

    expect(pruned.map((run) => run.id)).toEqual(['new-run'])
  })

  it('drops completed runs after the client TTL', () => {
    const now = Date.parse('2026-07-07T12:00:00.000Z')
    const runs: TriggerRun[] = [
      {
        id: 'fresh-complete',
        taskIdentifier: 'generate-structured-workout',
        status: 'COMPLETED',
        startedAt: '2026-07-07T11:58:00.000Z',
        finishedAt: '2026-07-07T11:59:30.000Z',
        tags: ['user:user-a']
      },
      {
        id: 'stale-complete',
        taskIdentifier: 'generate-structured-workout',
        status: 'COMPLETED',
        startedAt: '2026-07-07T11:00:00.000Z',
        finishedAt: '2026-07-07T11:50:00.000Z',
        tags: ['user:user-a']
      }
    ]

    const pruned = pruneRunsForCurrentUser(runs, 'user-a', now)
    expect(pruned.map((run) => run.id)).toEqual(['fresh-complete'])
  })
})
