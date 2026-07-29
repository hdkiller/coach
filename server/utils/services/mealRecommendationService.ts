import { prisma } from '../db'
import { bodyMetricResolver } from './bodyMetricResolver'
import { metabolicService } from './metabolicService'
import { generateStructuredAnalysis } from '../gemini'
import { logger } from '@trigger.dev/sdk/v3'

export interface MealRecommendationOptions {
  scope: 'MEAL' | 'DAY'
  windowType?: string
  forceLlm?: boolean
  targetCarbs?: number
  targetProtein?: number
  targetKcal?: number
  recommendationId?: string
  runId?: string
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

function toUpperStringArray(value: unknown): string[] {
  return toStringArray(value).map((entry) => entry.trim().toUpperCase())
}

function joinOrNone(values: unknown): string {
  const normalized = toStringArray(values)
  return normalized.length ? normalized.join(', ') : 'None'
}

/**
 * Reduces a window identity to the catalog's coarse bucket.
 *
 * Callers pass anything from a bare type (`PRE_WORKOUT`) to a stable window key
 * (`PRE_WORKOUT#2`, `DAILY_BASE:breakfast`); all of them must resolve to the same bucket, or the
 * catalog query silently matches nothing and every suggestion falls through to the LLM.
 */
export function mapWindowTypeToCatalogType(windowType?: string): string | undefined {
  if (!windowType) return undefined

  const base = String(windowType).split('#')[0]?.split(':')[0]?.trim().toUpperCase()
  if (!base) return undefined

  if (base === 'DAILY_BASE' || base === 'BASE') return 'BASE'
  if (base.endsWith('_WORKOUT')) return base.split('_')[0]
  return base
}

function normalizeTarget(value?: number): number | undefined {
  if (typeof value !== 'number') return undefined
  if (!Number.isFinite(value) || value <= 0) return undefined
  return Math.round(value)
}

function getScoringWeights(windowType?: string) {
  if (mapWindowTypeToCatalogType(windowType) === 'BASE') {
    return { carbs: 0.55, protein: 0.35, kcal: 0.1 }
  }
  return { carbs: 0.75, protein: 0.2, kcal: 0.05 }
}

/**
 * Finds the window a recommendation is for. Several windows of the same type can exist on one day,
 * so an exact key match is tried before falling back to the type.
 */
function findWindow(targetContext: any, windowType?: string) {
  if (!windowType) return targetContext?.nextFuelingWindow

  const progress: any[] = Array.isArray(targetContext?.windowProgress)
    ? targetContext.windowProgress
    : []

  return (
    progress.find((entry) => entry?.windowKey === windowType) ||
    progress.find((entry) => entry?.type === windowType) ||
    targetContext?.nextFuelingWindow
  )
}

/**
 * Rounds a scaled ingredient quantity without losing small amounts. Rounding everything to whole
 * units made the listed ingredients drift away from the stated macros - a 5g item scaled by 0.4
 * became 2g, a 25% error the totals never reflected.
 */
function roundQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value >= 10) return Math.round(value)
  return Math.round(value * 10) / 10
}

/**
 * How much carbohydrate the day still has room for, if the context knows.
 */
function getDayRemainingCarbs(targetContext: any): number | undefined {
  const remaining = Number(targetContext?.dailyCarbStatus?.remaining)
  return Number.isFinite(remaining) && remaining >= 0 ? Math.round(remaining) : undefined
}

/**
 * Rejects an option whose ingredients name something the athlete cannot eat.
 *
 * The catalog path enforces constraints through tags, but the model only ever sees them as prose,
 * so its output is checked here rather than trusted.
 */
function violatesConstraints(option: any, constraints: any): boolean {
  const banned: string[] = [
    ...toUpperStringArray(constraints?.foodAllergies),
    ...toUpperStringArray(constraints?.foodIntolerances),
    ...toUpperStringArray(constraints?.lifestyleExclusions)
  ]
    .map((entry) => entry.replace(/[_-]+/g, ' ').trim())
    .filter((entry) => entry.length >= 3)

  if (banned.length === 0) return false

  const haystack = [
    option?.title,
    ...(Array.isArray(option?.ingredients) ? option.ingredients : []).map(
      (i: any) => i?.item || i?.name
    )
  ]
    .filter((entry) => typeof entry === 'string')
    .join(' ')
    .toUpperCase()

  return banned.some((term) => haystack.includes(term))
}

/** Drops options whose carbohydrate lands nowhere near what was asked for. */
function missesTarget(option: any, targetCarbs?: number): boolean {
  if (!targetCarbs || targetCarbs <= 0) return false
  const carbs = Number(option?.totals?.carbs || 0)
  if (!Number.isFinite(carbs) || carbs <= 0) return true
  return Math.abs(carbs - targetCarbs) / targetCarbs > 0.4
}

function sanitizeMealTitle(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  return raw.replace(/^(?:\s*(?:option\s*\d+|daily\s*base)\s*[:\-–]\s*)+/i, '').trim()
}

function normalizeOptionShape(option: any) {
  const normalizedIngredients = Array.isArray(option?.ingredients)
    ? option.ingredients
    : Array.isArray(option?.items)
      ? option.items
      : []

  return {
    ...option,
    title: sanitizeMealTitle(option?.title) || option?.title || 'Meal Option',
    ingredients: normalizedIngredients
  }
}

function normalizeRecommendationOptions(options: any[]): any[] {
  return options.map((option) => normalizeOptionShape(option))
}

function buildRecommendationResult(
  source: 'catalog' | 'llm',
  options: any[],
  extra: Record<string, unknown> = {}
) {
  const normalized = normalizeRecommendationOptions(options)
  return {
    status: 'ready',
    source,
    options: normalized,
    recommendations: normalized,
    ...extra
  }
}

const recommendationSchema = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                isScalable: { type: 'boolean' }
              },
              required: ['item', 'quantity', 'unit', 'isScalable']
            }
          },
          totals: {
            type: 'object',
            properties: {
              carbs: { type: 'number' },
              protein: { type: 'number' },
              fat: { type: 'number' },
              kcal: { type: 'number' }
            },
            required: ['carbs', 'protein', 'fat', 'kcal']
          },
          prepMinutes: { type: 'number' },
          timing: { type: 'string' },
          absorptionType: {
            type: 'string',
            enum: ['RAPID', 'FAST', 'BALANCED', 'DENSE', 'HYPER_LOAD']
          },
          substitutions: {
            type: 'array',
            items: { type: 'string' }
          },
          reasoningText: { type: 'string' }
        },
        required: ['title', 'items', 'totals', 'absorptionType', 'timing']
      }
    }
  },
  required: ['options']
}

export const mealRecommendationService = {
  sanitizeMealTitle,

  async ensureRecommendationRecord(userId: string, date: Date, options: MealRecommendationOptions) {
    const { recommendationId, runId, scope, windowType } = options
    if (recommendationId) {
      await prisma.nutritionRecommendation.update({
        where: { id: recommendationId },
        data: {
          status: 'PROCESSING',
          runId: runId || undefined
        }
      })
      return { id: recommendationId }
    }

    return prisma.nutritionRecommendation.create({
      data: {
        userId,
        date,
        scope,
        windowType,
        status: 'PROCESSING',
        runId,
        contextJson: {}
      }
    })
  },

  /**
   * Generates meal recommendations for a specific user, date, and optionally a window.
   */
  async getRecommendations(userId: string, date: Date, options: MealRecommendationOptions) {
    const {
      scope,
      windowType,
      forceLlm = false,
      targetCarbs,
      targetProtein,
      targetKcal,
      runId
    } = options

    const recommendation = await this.ensureRecommendationRecord(userId, date, options)

    try {
      const targetContext = await metabolicService.getMealTargetContext(userId, date)

      const settings = await prisma.userNutritionSettings.findUnique({
        where: { userId },
        select: {
          dietaryProfile: true,
          foodAllergies: true,
          foodIntolerances: true,
          lifestyleExclusions: true
        }
      })
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { weight: true, weightSourceMode: true }
      })
      const effectiveWeight = await bodyMetricResolver.resolveEffectiveWeight(userId, {
        weight: user?.weight,
        weightSourceMode: user?.weightSourceMode
      })

      const context = {
        targetContext,
        constraints: {
          dietaryProfile: toUpperStringArray(settings?.dietaryProfile),
          foodAllergies: toUpperStringArray(settings?.foodAllergies),
          foodIntolerances: toUpperStringArray(settings?.foodIntolerances),
          lifestyleExclusions: toUpperStringArray(settings?.lifestyleExclusions)
        },
        athlete: {
          weightKg: effectiveWeight.value || 75
        }
      }

      await prisma.nutritionRecommendation.update({
        where: { id: recommendation.id },
        data: {
          contextJson: {
            ...context,
            // Kept so a repeat request for the same window and targets can reuse this result
            // instead of paying for another model run.
            requestedTargets: {
              carbs: Number(targetCarbs || 0),
              protein: Number(targetProtein || 0),
              kcal: Number(targetKcal || 0)
            }
          } as any,
          runId: runId || undefined
        }
      })

      if (!forceLlm) {
        const catalogOptions = await this.selectFromCatalog(context, scope, windowType, {
          carbs: targetCarbs,
          protein: targetProtein,
          kcal: targetKcal
        })

        if (catalogOptions.length >= 1) {
          const result = buildRecommendationResult('catalog', catalogOptions)

          await prisma.nutritionRecommendation.update({
            where: { id: recommendation.id },
            data: {
              status: 'COMPLETED',
              resultJson: result as any
            }
          })

          return {
            recommendationId: recommendation.id,
            runId: runId || null,
            ...result
          }
        }
      }

      const llmResult = await this.generateLlmRecommendation(
        userId,
        date,
        context,
        scope,
        windowType,
        {
          carbs: targetCarbs,
          protein: targetProtein,
          kcal: targetKcal
        }
      )

      await prisma.nutritionRecommendation.update({
        where: { id: recommendation.id },
        data: {
          status: llmResult.status === 'ready' ? 'COMPLETED' : 'FAILED',
          resultJson: llmResult as any,
          runId: runId || undefined
        }
      })

      return {
        recommendationId: recommendation.id,
        runId: runId || null,
        ...llmResult
      }
    } catch (error) {
      logger.error('Failed to get nutrition recommendations', {
        error,
        recommendationId: recommendation.id
      })
      await prisma.nutritionRecommendation.update({
        where: { id: recommendation.id },
        data: { status: 'FAILED', runId: runId || undefined }
      })
      return {
        recommendationId: recommendation.id,
        runId: runId || null,
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Internal error generating recommendations'
      }
    }
  },

  /**
   * Deterministic portion scaling with hard constraint enforcement.
   */
  async selectFromCatalog(
    context: any,
    scope: string,
    windowType?: string,
    targetOverrides?: { carbs?: number; protein?: number; kcal?: number }
  ) {
    const { targetContext, constraints, athlete } = context

    const window = findWindow(targetContext, windowType)

    const requestedCarbs = Math.round(
      normalizeTarget(targetOverrides?.carbs)
        ? normalizeTarget(targetOverrides?.carbs)!
        : window?.unmetCarbs || targetContext.suggestedIntakeNow?.carbs || 0
    )

    // Never suggest more than the day still has room for. Without this, planning each window in
    // isolation could add up to a day well past its own target.
    const dayRemaining = getDayRemainingCarbs(targetContext)
    const targetCarbs =
      dayRemaining !== undefined && dayRemaining > 0
        ? Math.min(requestedCarbs, dayRemaining)
        : requestedCarbs

    const targetProtein = normalizeTarget(targetOverrides?.protein)
    const targetKcal = normalizeTarget(targetOverrides?.kcal)
    const resolvedWindowType = window?.type || windowType

    if (targetCarbs <= 0) return []

    const query: any = {}
    const resolvedType = window?.type || windowType
    if (resolvedType) {
      const mappedType = mapWindowTypeToCatalogType(resolvedType)
      query.windowType = mappedType
    }

    const candidates = await prisma.mealOptionCatalog.findMany({
      where: query
    })

    const dietaryProfile = constraints.dietaryProfile || []

    const options = candidates
      .map((template) => {
        const normalizedConstraintTags = toUpperStringArray(template.constraintTags)
        const normalizedDietaryBuckets = toUpperStringArray(template.dietaryBuckets)

        const hasConflict = normalizedConstraintTags.some(
          (tag) =>
            constraints.foodAllergies.includes(tag) ||
            constraints.lifestyleExclusions.includes(tag) ||
            constraints.foodIntolerances.includes(tag)
        )
        if (hasConflict) return null

        const violatesDietaryProfile =
          dietaryProfile.length > 0 &&
          dietaryProfile.some((profile: string) => !normalizedDietaryBuckets.includes(profile))
        if (violatesDietaryProfile) return null

        const baseMacros = template.baseMacros as any
        const baseCarbs = Number(baseMacros?.carbs || 0)
        if (!Number.isFinite(baseCarbs) || baseCarbs <= 0) return null

        const requestedScaleFactor = targetCarbs / baseCarbs
        if (requestedScaleFactor > 2.5 || requestedScaleFactor < 0.4) return null

        const carbCap = 2.0 * athlete.weightKg
        const finalCarbs = Math.min(targetCarbs, carbCap)
        const finalScaleFactor = finalCarbs / baseCarbs
        const splitRequired = targetCarbs > carbCap
        const postWorkoutDebtCarbs = Math.max(0, Math.round(targetCarbs - finalCarbs))

        const ingredients = (template.ingredients as any[]).map((ingredient) => ({
          ...ingredient,
          quantity: ingredient.isScalable
            ? roundQuantity(Number(ingredient.quantity || 0) * finalScaleFactor)
            : ingredient.quantity
        }))

        return normalizeOptionShape({
          id: template.id,
          title: template.title,
          ingredients,
          totals: {
            carbs: Math.round(baseCarbs * finalScaleFactor),
            protein: Math.round(Number(baseMacros?.protein || 0) * finalScaleFactor),
            fat: Math.round(Number(baseMacros?.fat || 0) * finalScaleFactor),
            kcal: Math.round(Number(baseMacros?.kcal || 0) * finalScaleFactor)
          },
          scaleFactor: Number(finalScaleFactor.toFixed(4)),
          splitRequired,
          postWorkoutDebtCarbs,
          absorptionType: template.absorptionType,
          prepMinutes: template.prepMinutes,
          reasoningText: splitRequired
            ? `Capped to ${Math.round(carbCap)}g carbs for one sitting; ${postWorkoutDebtCarbs}g remains to place elsewhere.`
            : undefined
        })
      })
      .filter(Boolean)

    const weights = getScoringWeights(resolvedWindowType)
    return (options as any[]).sort((a, b) => {
      const score = (candidate: any) => {
        const carbsDiff =
          Math.abs((candidate?.totals?.carbs || 0) - targetCarbs) / Math.max(targetCarbs, 1)
        const proteinDiff = targetProtein
          ? Math.abs((candidate?.totals?.protein || 0) - targetProtein) / Math.max(targetProtein, 1)
          : 0
        const kcalDiff = targetKcal
          ? Math.abs((candidate?.totals?.kcal || 0) - targetKcal) / Math.max(targetKcal, 1)
          : 0
        const prepPenalty = Number(candidate?.prepMinutes || 0) / 120
        return (
          carbsDiff * weights.carbs +
          proteinDiff * weights.protein +
          kcalDiff * weights.kcal +
          prepPenalty * 0.02
        )
      }

      return score(a) - score(b)
    })
  },

  async generateLlmRecommendation(
    userId: string,
    date: Date,
    context: any,
    scope: string,
    windowType?: string,
    targetOverrides?: { carbs?: number; protein?: number; kcal?: number; fat?: number }
  ) {
    const { targetContext, constraints, athlete } = context
    const window = findWindow(targetContext, windowType)

    const requestedCarbs = Math.round(
      normalizeTarget(targetOverrides?.carbs)
        ? normalizeTarget(targetOverrides?.carbs)!
        : window?.unmetCarbs || targetContext.suggestedIntakeNow?.carbs || 0
    )

    const dayRemaining = getDayRemainingCarbs(targetContext)
    const targetCarbs =
      dayRemaining !== undefined && dayRemaining > 0
        ? Math.min(requestedCarbs, dayRemaining)
        : requestedCarbs

    const targetProtein = normalizeTarget(targetOverrides?.protein)
    const targetKcal = normalizeTarget(targetOverrides?.kcal)
    const targetFat = normalizeTarget(targetOverrides?.fat) ?? normalizeTarget(window?.targetFat)
    const resolvedWindowType = window?.type || windowType || 'General'

    const buildPrompt = (
      repairNote?: string
    ) => `You are an elite sports performance nutritionist operating from a high-protein, plant-based (vegan) fueling framework.
Generate 3 personalized, plant-based meal options for an endurance athlete based on their current metabolic window. Specifically design these options as pre/intra/post-workout endurance fueling strategies.

ATHLETE CONTEXT:
- Weight: ${athlete.weightKg}kg
- Target Carbs for this window: ${targetCarbs}g
- Target Protein for this window: ${targetProtein ?? 'not specified'}g
- Target Fat for this window: ${targetFat ?? 'not specified'}g
- Target Calories for this window: ${targetKcal ?? 'not specified'} kcal
- Window Type: ${resolvedWindowType}
- Carbohydrate remaining in the athlete's day: ${dayRemaining ?? 'not specified'}g
- Current Tank: ${targetContext?.currentTank?.percentage ?? 0}% (${targetContext?.currentTank?.advice || 'No advice available'})

CONSTRAINTS (MUST FOLLOW):
- Dietary Profile: ${joinOrNone(constraints.dietaryProfile)}
- Allergies: ${joinOrNone(constraints.foodAllergies)}
- Intolerances: ${joinOrNone(constraints.foodIntolerances)}
- Exclusions: ${joinOrNone(constraints.lifestyleExclusions)}

GUIDELINES:
1. Provide exact portions in grams (g) or milliliters (ml).
2. Ensure totals match targets with priority order:
   - For DAILY_BASE: carbs + protein first, kcal second.
   - For PRE/INTRA/POST: carbs first, protein second, kcal third.
3. Carbohydrate totals must be within 20% of the target. Do not exceed the day's remaining carbohydrate.
4. Choose the appropriate absorption type (RAPID, FAST, BALANCED, DENSE, HYPER_LOAD) based on the window.
5. If the target carbs exceed ${2.0 * athlete.weightKg}g, cap the meal at that limit and note it in the reasoning.
6. Meal titles must be plain dish names only.
   - Do NOT include list labels or prefixes such as "Option 1:", "Option 2 -", "Daily Base:", "Meal 1:", or equivalents in any language.
7. Use "items" for ingredient rows and keep them suitable for a future grocery list aggregation flow.
8. No ingredient may contain anything listed under Allergies, Intolerances or Exclusions.
${repairNote ? `\nCORRECTION REQUIRED: ${repairNote}\n` : ''}
Return the options in a structured JSON format.`

    const requestOptions = async (repairNote?: string) => {
      const result = await generateStructuredAnalysis<any>(
        buildPrompt(repairNote),
        recommendationSchema,
        'flash',
        {
          userId,
          operation: 'meal_recommendation',
          entityType: 'Nutrition',
          entityId: undefined
        }
      )
      return Array.isArray(result?.options) ? result.options : []
    }

    /**
     * The model is told the constraints but nothing guarantees it honoured them, so anything that
     * names an excluded food or lands far from the target is discarded rather than shown.
     */
    const screen = (options: any[]) =>
      options
        .map((option) => normalizeOptionShape(option))
        .filter((option) => !violatesConstraints(option, constraints))
        .filter((option) => !missesTarget(option, targetCarbs))

    try {
      let accepted = screen(await requestOptions())

      if (accepted.length === 0) {
        // One repair attempt, naming what went wrong, before giving up.
        accepted = screen(
          await requestOptions(
            `The previous response was rejected. Every option must avoid ${joinOrNone([
              ...toStringArray(constraints.foodAllergies),
              ...toStringArray(constraints.foodIntolerances),
              ...toStringArray(constraints.lifestyleExclusions)
            ])} and land within 20% of ${targetCarbs}g carbohydrate.`
          )
        )
      }

      if (accepted.length === 0) {
        logger.error('LLM meal recommendations failed validation', {
          userId,
          windowType: resolvedWindowType,
          targetCarbs
        })
        return {
          status: 'error',
          message: 'Could not generate a meal that fits your targets and dietary constraints.'
        }
      }

      return buildRecommendationResult('llm', accepted)
    } catch (error) {
      logger.error('Failed to generate LLM recommendation', { error })
      return {
        status: 'error',
        message: 'Failed to generate AI recommendation'
      }
    }
  }
}
