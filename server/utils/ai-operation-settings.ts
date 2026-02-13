import { prisma } from './db'
import type { GeminiModel } from './ai-config'

export interface LlmOperationSettings {
  model: GeminiModel
  modelId: string
  thinkingBudget: number
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high'
  maxSteps: number
}

// Memory cache to avoid DB hits on every LLM call
// Keyed by "level:operation" or "level:default"
let settingsCache: Record<string, LlmOperationSettings> = {}
let lastCacheUpdate = 0
const CACHE_TTL = 60 * 1000 // 1 minute

const DEFAULT_FLASH_SETTINGS: LlmOperationSettings = {
  model: 'flash',
  modelId: 'gemini-2.5-flash-preview-09-2025',
  thinkingBudget: 2000,
  thinkingLevel: 'low',
  maxSteps: 3
}

/**
 * Get LLM settings based on user AI preference, with optional operation override
 */
export async function getLlmOperationSettings(
  userId?: string,
  operation?: string
): Promise<LlmOperationSettings> {
  // 1. Resolve Analysis Level
  let level = 'flash'

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiModelPreference: true
      }
    })

    if (user?.aiModelPreference) {
      level = user.aiModelPreference
    }
  }

  // 2. Check Cache
  const now = Date.now()
  if (now - lastCacheUpdate > CACHE_TTL || Object.keys(settingsCache).length === 0) {
    await refreshLlmSettingsCache()
  }

  // 3. Resolve Hierarchy: Operation Override > Level Default > Global Default
  if (operation) {
    const overrideKey = `${level}:${operation}`
    if (settingsCache[overrideKey]) {
      return settingsCache[overrideKey]
    }
  }

  const defaultKey = `${level}:default`
  return settingsCache[defaultKey] || DEFAULT_FLASH_SETTINGS
}

/**
 * Refresh the global settings cache from DB
 */
export async function refreshLlmSettingsCache() {
  const [allLevelSettings, allOverrides] = await Promise.all([
    prisma.llmAnalysisLevelSettings.findMany(),
    prisma.llmOperationOverride.findMany()
  ])

  const newCache: Record<string, LlmOperationSettings> = {}

  for (const s of allLevelSettings) {
    const levelDefault: LlmOperationSettings = {
      model: s.model as GeminiModel,
      modelId: s.modelId,
      thinkingBudget: s.thinkingBudget,
      thinkingLevel: s.thinkingLevel as any,
      maxSteps: s.maxSteps
    }

    // Store level default
    newCache[`${s.level}:default`] = levelDefault

    // Store operation overrides
    const levelOverrides = allOverrides.filter((o) => o.analysisLevelSettingsId === s.id)
    for (const o of levelOverrides) {
      newCache[`${s.level}:${o.operation}`] = {
        model: (o.model as GeminiModel) || levelDefault.model,
        modelId: o.modelId || levelDefault.modelId,
        thinkingBudget: o.thinkingBudget ?? levelDefault.thinkingBudget,
        thinkingLevel: (o.thinkingLevel as any) || levelDefault.thinkingLevel,
        maxSteps: o.maxSteps ?? levelDefault.maxSteps
      }
    }
  }

  settingsCache = newCache
  lastCacheUpdate = Date.now()
}
