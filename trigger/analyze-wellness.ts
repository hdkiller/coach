import './init'
import { task } from '@trigger.dev/sdk/v3'
import { analyzeWellness } from '../server/utils/services/wellness-analysis'
import { userAnalysisQueue } from './queues'
import { registerTaskHandler } from '../server/utils/task-registry'

type AnalyzeWellnessPayload = { wellnessId: string; userId: string }

export async function runAnalyzeWellness(payload: AnalyzeWellnessPayload) {
  return analyzeWellness(payload.wellnessId, payload.userId)
}

registerTaskHandler('analyze-wellness', runAnalyzeWellness)

export const analyzeWellnessTask = task({
  id: 'analyze-wellness',
  queue: userAnalysisQueue,
  maxDuration: 300,
  run: runAnalyzeWellness
})
