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

function mapWindowTypeToCatalogType(windowType?: string): string | undefined {
  if (!windowType) return undefined
  if (windowType === 'DAILY_BASE') return 'BASE'
  if (windowType.endsWith('_WORKOUT')) return windowType.split('_')[0]
  return windowType
}

function normalizeTarget(value?: number): number | undefined {
  if (typeof value !== 'number') return undefined
  if (!Number.isFinite(value) || value <= 0) return undefined
  return Math.round(value)
}

function getScoringWeights(windowType?: string) {
  if (windowType === 'DAILY_BASE') {
    return { carbs: 0.55, protein: 0.35, kcal: 0.1 }
  }
  return { carbs: 0.75, protein: 0.2, kcal: 0.05 }
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
          reasoning: { type: 'string' }
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
          contextJson: context as any,
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

    const window = windowType
      ? targetContext.windowProgress.find((entry: any) => entry.type === windowType)
      : targetContext.nextFuelingWindow

    const targetCarbs = Math.round(
      normalizeTarget(targetOverrides?.carbs)
        ? normalizeTarget(targetOverrides?.carbs)!
        : window?.unmetCarbs || targetContext.suggestedIntakeNow?.carbs || 0
    )
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
            ? Math.round(Number(ingredient.quantity || 0) * finalScaleFactor)
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
          reasoning: splitRequired
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
    targetOverrides?: { carbs?: number; protein?: number; kcal?: number }
  ) {
    const { targetContext, constraints, athlete } = context
    const window = windowType
      ? targetContext.windowProgress.find((entry: any) => entry.type === windowType)
      : targetContext.nextFuelingWindow

    const targetCarbs = Math.round(
      normalizeTarget(targetOverrides?.carbs)
        ? normalizeTarget(targetOverrides?.carbs)!
        : window?.unmetCarbs || targetContext.suggestedIntakeNow?.carbs || 0
    )
    const targetProtein = normalizeTarget(targetOverrides?.protein)
    const targetKcal = normalizeTarget(targetOverrides?.kcal)
    const resolvedWindowType = window?.type || windowType || 'General'

    const prompt = `You are an elite sports performance nutritionist.
Generate 3 personalized meal options for an endurance athlete based on their current metabolic window.

ATHLETE CONTEXT:
- Weight: ${athlete.weightKg}kg
- Target Carbs for this window: ${targetCarbs}g
- Target Protein for this window: ${targetProtein ?? 'not specified'}g
- Target Calories for this window: ${targetKcal ?? 'not specified'} kcal
- Window Type: ${resolvedWindowType}
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
3. Choose the appropriate absorption type (RAPID, FAST, BALANCED, DENSE, HYPER_LOAD) based on the window.
4. If the target carbs exceed ${2.0 * athlete.weightKg}g, cap the meal at that limit and note it in the reasoning.
5. Meal titles must be plain dish names only.
   - Do NOT include list labels or prefixes such as "Option 1:", "Option 2 -", "Daily Base:", "Meal 1:", or equivalents in any language.
6. Use "items" for ingredient rows and keep them suitable for a future grocery list aggregation flow.

Return the options in a structured JSON format.`

    try {
      const result = await generateStructuredAnalysis<any>(prompt, recommendationSchema, 'flash', {
        userId,
        operation: 'meal_recommendation',
        entityType: 'Nutrition',
        entityId: undefined
      })

      return buildRecommendationResult('llm', result.options || [])
    } catch (error) {
      logger.error('Failed to generate LLM recommendation', { error })
      return {
        status: 'error',
        message: 'Failed to generate AI recommendation'
      }
    }
  }
}
