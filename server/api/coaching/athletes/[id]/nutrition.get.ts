import { z } from 'zod/v3'
import { requireCoachAccessToAthlete } from '../../../../utils/coaching-auth'
import { getUserTimezone, getUserLocalDate, formatDateUTC } from '../../../../utils/date'
import { getUserNutritionSettings } from '../../../../utils/nutrition/settings'
import { metabolicService } from '../../../../utils/services/metabolicService'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Get athlete nutrition summary',
    description:
      'Returns a read-only summary of fueling strategy/targets for an athlete coached by the ' +
      'authenticated user. Does not include daily food logs or logged meal entries.',
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden (Not coaching this athlete)' }
    }
  }
})

const paramsSchema = z.object({
  id: z.string()
})

// Only the next few days are surfaced here - enough for a coach to see the upcoming fueling
// plan shape without exposing a long history of the athlete's logged intake.
const UPCOMING_DAYS = 7

export default defineEventHandler(async (event) => {
  const { id: athleteId } = await getValidatedRouterParams(event, paramsSchema.parse)

  // Verify the coaching relationship is ACTIVE before returning anything.
  await requireCoachAccessToAthlete(event, athleteId)

  const timezone = await getUserTimezone(athleteId)
  const today = getUserLocalDate(timezone)
  const settings = await getUserNutritionSettings(athleteId)

  const upcomingFuelingPlan = []
  for (let i = 0; i < UPCOMING_DAYS; i++) {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() + i)

    const dayPlan = await metabolicService.calculateFuelingPlanForDate(athleteId, date, {
      persist: false
    })
    const plan = dayPlan.plan as any
    const totals = plan?.dailyTotals
    const state = totals?.fuelState || 1

    upcomingFuelingPlan.push({
      date: formatDateUTC(date),
      state,
      label: state === 3 ? 'Performance' : state === 2 ? 'Steady' : 'Eco',
      carbsTarget: totals ? Math.round(totals.carbs) : null,
      isRest: !plan?.windows?.some((w: any) => w.type !== 'DAILY_BASE')
    })
  }

  return {
    athleteId,
    timezone,
    // Fueling strategy/targets only - intentionally excludes logged meals, hydration debt,
    // and symptom history since those are more sensitive, log-derived athlete data.
    targets: {
      goalProfile: settings.goalProfile,
      targetAdjustmentPercent: settings.targetAdjustmentPercent,
      carbsPerHour: {
        low: settings.carbsPerHourLow,
        medium: settings.carbsPerHourMedium,
        high: settings.carbsPerHourHigh
      },
      currentCarbMaxPerHour: settings.currentCarbMax,
      ultimateCarbGoalPerHour: settings.ultimateCarbGoal,
      sodiumTargetMgPerHour: settings.sodiumTarget,
      proteinPerKg: settings.baseProteinPerKg,
      fatPerKg: settings.baseFatPerKg,
      preWorkoutWindowMinutes: settings.preWorkoutWindow,
      postWorkoutWindowMinutes: settings.postWorkoutWindow
    },
    upcomingFuelingPlan
  }
})
