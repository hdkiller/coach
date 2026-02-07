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
// Keyed by "tier:operation" or "tier:default"
let settingsCache: Record<string, LlmOperationSettings> = {}
let lastCacheUpdate = 0
const CACHE_TTL = 60 * 1000 // 1 minute

const DEFAULT_FLASH_SETTINGS: LlmOperationSettings = {
  model: 'flash',
  modelId: 'gemini-flash-latest',
  thinkingBudget: 2000,
  thinkingLevel: 'low',
  maxSteps: 3
}

/**
 * Get LLM settings based on user tier and status, with optional operation override
 */
export async function getLlmOperationSettings(
  userId?: string,
  operation?: string
): Promise<LlmOperationSettings> {
  // 1. Resolve Tier
  let tier = 'FREE'
  let isContributor = false

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true
      }
    })

    if (user) {
      tier = user.subscriptionTier || 'FREE'
      isContributor = user.subscriptionStatus === 'CONTRIBUTOR'
    }
  }

  // Use CONTRIBUTOR tier if user is a contributor, otherwise use subscription tier
  const targetTier = isContributor ? 'CONTRIBUTOR' : tier

  // 2. Check Cache
  const now = Date.now()
  if (now - lastCacheUpdate > CACHE_TTL || Object.keys(settingsCache).length === 0) {
    await refreshLlmSettingsCache()
  }

  // 3. Resolve Hierarchy: Operation Override > Tier Default > Global Default
  if (operation) {
    const overrideKey = `${targetTier}:${operation}`
    if (settingsCache[overrideKey]) {
      return settingsCache[overrideKey]
    }
  }

  const defaultKey = `${targetTier}:default`
  return settingsCache[defaultKey] || DEFAULT_FLASH_SETTINGS
}

/**
 * Refresh the global settings cache from DB
 */
export async function refreshLlmSettingsCache() {
  const [allTierSettings, allOverrides] = await Promise.all([
    prisma.llmTierSettings.findMany(),
    prisma.llmOperationOverride.findMany()
  ])

  const newCache: Record<string, LlmOperationSettings> = {}

  for (const s of allTierSettings) {
    const tierDefault: LlmOperationSettings = {
      model: s.model as GeminiModel,
      modelId: s.modelId,
      thinkingBudget: s.thinkingBudget,
      thinkingLevel: s.thinkingLevel as any,
      maxSteps: s.maxSteps
    }

    // Store tier default
    newCache[`${s.tier}:default`] = tierDefault

    // Store operation overrides
    const tierOverrides = allOverrides.filter((o) => o.tierSettingsId === s.id)
    for (const o of tierOverrides) {
      newCache[`${s.tier}:${o.operation}`] = {
        model: (o.model as GeminiModel) || tierDefault.model,
        modelId: o.modelId || tierDefault.modelId,
        thinkingBudget: o.thinkingBudget ?? tierDefault.thinkingBudget,
        thinkingLevel: (o.thinkingLevel as any) || tierDefault.thinkingLevel,
        maxSteps: o.maxSteps ?? tierDefault.maxSteps
      }
    }
  }

  settingsCache = newCache
  lastCacheUpdate = Date.now()
}
