import { prisma } from '../db'
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
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
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

function sanitizeRecommendationTitles(options: any[]): any[] {
  return options.map((option) => ({
    ...option,
    title: sanitizeMealTitle(option?.title) || option?.title || 'Meal Option'
  }))
}

function normalizeRecommendationOptions(options: any[]): any[] {
  return sanitizeRecommendationTitles(options).map((option) => {
    const normalizedIngredients = Array.isArray(option?.ingredients)
      ? option.ingredients
      : Array.isArray(option?.items)
        ? option.items
        : []

    return {
      ...option,
      ingredients: normalizedIngredients
    }
  })
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
  /**
   * Generates meal recommendations for a specific user, date, and optionally a window.
   */
  async getRecommendations(userId: string, date: Date, options: MealRecommendationOptions) {
    const { scope, windowType, forceLlm = false, targetCarbs, targetProtein, targetKcal } = options

    // 0. Create PENDING recommendation record
    const recommendation = await prisma.nutritionRecommendation.create({
      data: {
        userId,
        date,
        scope,
        windowType,
        status: 'PROCESSING',
        contextJson: {} // Will update below
      }
    })

    try {
      // 1. Resolve target context from metabolic engine
      const targetContext = await metabolicService.getMealTargetContext(userId, date)

      // 2. Pull user constraints and preference profile
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
        select: { weight: true }
      })

      const context = {
        targetContext,
        constraints: {
          dietaryProfile: toStringArray(settings?.dietaryProfile),
          foodAllergies: toStringArray(settings?.foodAllergies),
          foodIntolerances: toStringArray(settings?.foodIntolerances),
          lifestyleExclusions: toStringArray(settings?.lifestyleExclusions)
        },
        athlete: {
          weightKg: user?.weight || 75
        }
      }

      // Update context snapshot
      await prisma.nutritionRecommendation.update({
        where: { id: recommendation.id },
        data: { contextJson: context as any }
      })

      // 3. Try Catalog-First selection (if not forcing LLM)
      if (!forceLlm) {
        const catalogOptions = await this.selectFromCatalog(context, scope, windowType, {
          carbs: targetCarbs,
          protein: targetProtein,
          kcal: targetKcal
        })
        if (catalogOptions.length >= 2) {
          const result = {
            status: 'ready',
            source: 'catalog',
            recommendations: normalizeRecommendationOptions(catalogOptions)
          }

          await prisma.nutritionRecommendation.update({
            where: { id: recommendation.id },
            data: {
              status: 'COMPLETED',
              resultJson: result as any
            }
          })

          return result
        }
      }

      // 4. Fallback to Gemini
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
          resultJson: llmResult as any
        }
      })

      return llmResult
    } catch (error) {
      logger.error('Failed to get nutrition recommendations', {
        error,
        recommendationId: recommendation.id
      })
      await prisma.nutritionRecommendation.update({
        where: { id: recommendation.id },
        data: { status: 'FAILED' }
      })
      return {
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Internal error generating recommendations'
      }
    }
  },

  /**
   * Deterministic Portion Scaler (Catalog-first mode)
   */
  async selectFromCatalog(
    context: any,
    scope: string,
    windowType?: string,
    targetOverrides?: { carbs?: number; protein?: number; kcal?: number }
  ) {
    const { targetContext, constraints, athlete } = context

    const window = windowType
      ? targetContext.windowProgress.find((w: any) => w.type === windowType)
      : targetContext.nextFuelingWindow

    // Prefer explicit target from UI context (planning flow). Otherwise use unmet/suggested.
    const targetCarbs = Math.round(
      normalizeTarget(targetOverrides?.carbs)
        ? normalizeTarget(targetOverrides?.carbs)!
        : window?.unmetCarbs || targetContext.suggestedIntakeNow?.carbs || 0
    )
    const targetProtein = normalizeTarget(targetOverrides?.protein)
    const targetKcal = normalizeTarget(targetOverrides?.kcal)
    const resolvedWindowType = window?.type || windowType

    if (targetCarbs <= 0) return []

    // 1. Search candidates in catalog
    const query: any = {}
    const resolvedType = window?.type || windowType
    if (resolvedType) {
      const mappedType = mapWindowTypeToCatalogType(resolvedType)
      query.windowType = mappedType
    }

    const candidates = await prisma.mealOptionCatalog.findMany({
      where: query
    })

    const options = candidates
      .map((template) => {
        // 2. Apply hard filters
        const hasConflict = template.constraintTags.some(
          (tag) =>
            constraints.foodAllergies.includes(tag) ||
            constraints.lifestyleExclusions.includes(tag) ||
            constraints.foodIntolerances.includes(tag)
        )
        if (hasConflict) return null

        // 3. Compute scale factor
        const baseMacros = template.baseMacros as any
        const scaleFactor = targetCarbs / baseMacros.carbs

        // 4. Reject unbalanced scales
        if (scaleFactor > 2.5 || scaleFactor < 0.4) return null

        // 5. Scale ingredients
        const ingredients = (template.ingredients as any[]).map((ing) => ({
          ...ing,
          quantity: ing.isScalable ? Math.round(ing.quantity * scaleFactor) : ing.quantity
        }))

        // 6. Enforce per-sitting carb cap
        const carbCap = 2.0 * athlete.weightKg
        let scaledCarbs = Math.round(baseMacros.carbs * scaleFactor)
        let splitRequired = false
        let postWorkoutDebtCarbs = 0

        if (scaledCarbs > carbCap) {
          scaledCarbs = Math.round(carbCap)
          postWorkoutDebtCarbs = Math.round(baseMacros.carbs * scaleFactor - carbCap)
          splitRequired = true
        }

        return {
          id: template.id,
          title: sanitizeMealTitle(template.title) || template.title,
          ingredients,
          totals: {
            carbs: scaledCarbs,
            protein: Math.round(baseMacros.protein * scaleFactor),
            fat: Math.round(baseMacros.fat * scaleFactor),
            kcal: Math.round(baseMacros.kcal * scaleFactor)
          },
          scaleFactor,
          splitRequired,
          postWorkoutDebtCarbs,
          absorptionType: template.absorptionType,
          prepMinutes: template.prepMinutes
        }
      })
      .filter(Boolean)

    // 8. Rank by macro fit (window-aware weighted objective)
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
        return carbsDiff * weights.carbs + proteinDiff * weights.protein + kcalDiff * weights.kcal
      }

      return score(a) - score(b)
    })
  },

  /**
   * Generates structured prompt for Gemini
   */
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
      ? targetContext.windowProgress.find((w: any) => w.type === windowType)
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
   - Keep the user's language naturally, but always output a clean title without numbering/category prefixes.

Return the options in a structured JSON format.`

    try {
      const result = await generateStructuredAnalysis<any>(prompt, recommendationSchema, 'flash', {
        userId,
        operation: 'meal_recommendation',
        entityType: 'Nutrition',
        entityId: undefined
      })

      return {
        status: 'ready',
        source: 'llm',
        recommendations: normalizeRecommendationOptions(result.options || [])
      }
    } catch (error) {
      logger.error('Failed to generate LLM recommendation', { error })
      return {
        status: 'error',
        message: 'Failed to generate AI recommendation'
      }
    }
  }
}
