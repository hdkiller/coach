import { prisma } from '../db'
import { metabolicService } from './metabolicService'
import { getUserTimezone, getStartOfDayUTC, getEndOfDayUTC } from '../date'
import type { JourneyEventType, JourneyEventCategory } from '@prisma/client'

export interface WellnessEventInput {
  userId: string
  timestamp: Date
  eventType: JourneyEventType
  category: JourneyEventCategory
  severity: number
  description?: string
}

export const journeyService = {
  /**
   * Records a wellness event and performs metabolic Root Cause Analysis (RCA).
   */
  async recordEvent(input: WellnessEventInput) {
    const { userId, timestamp, eventType, category, severity, description } = input
    const timezone = await getUserTimezone(userId)

    // 1. Get Metabolic Snapshot at the time of the event
    // We fetch the metabolic state for the day to get accurate starting points
    const dateUtc = new Date(timestamp)
    dateUtc.setUTCHours(0, 0, 0, 0)

    const state = await metabolicService.getMetabolicStateForDate(userId, dateUtc)
    const { points } = await metabolicService.getDailyTimeline(
      userId,
      dateUtc,
      state.startingGlycogen,
      state.startingFluid,
      timestamp // Simulate up to the event timestamp
    )

    // Find the point closest to the event timestamp
    const snapshot =
      [...points].reverse().find((p) => p.timestamp <= timestamp.getTime()) || points[0]

    // 2. Perform Root Cause Analysis (Lookback 4 hours)
    const lookbackStart = new Date(timestamp.getTime() - 4 * 60 * 60 * 1000)
    const rca = await this.performRCA(
      userId,
      category,
      timestamp,
      lookbackStart,
      snapshot,
      timezone
    )

    // 3. Persist Event
    const event = await prisma.athleteJourneyEvent.create({
      data: {
        userId,
        timestamp,
        eventType,
        category,
        severity,
        description,
        metabolicSnapshot: {
          glycogenLevel: snapshot?.level,
          fluidDeficit: snapshot?.fluidDeficit,
          kcalBalance: snapshot?.kcalBalance,
          carbBalance: snapshot?.carbBalance
        } as any,
        suspectedTriggerId: rca.suspectedTriggerId
      }
    })

    return {
      event,
      rca: rca.analysis,
      remediation: rca.remediation
    }
  },

  /**
   * Performs Root Cause Analysis for a specific symptom.
   */
  async performRCA(
    userId: string,
    category: JourneyEventCategory,
    timestamp: Date,
    lookbackStart: Date,
    snapshot: any,
    timezone: string
  ) {
    let analysis = ''
    let remediation = ''
    let suspectedTriggerId: string | undefined

    // Fetch nutrition and workouts in the lookback window
    const nutrition = await prisma.nutrition.findFirst({
      where: {
        userId,
        date: {
          gte: getStartOfDayUTC(timezone, lookbackStart),
          lte: getEndOfDayUTC(timezone, timestamp)
        }
      }
    })

    const workouts = await prisma.workout.findMany({
      where: {
        userId,
        date: {
          gte: lookbackStart,
          lte: timestamp
        }
      }
    })

    if (category === 'GI_DISTRESS') {
      // Check for high intra-workout carbs (> 90g/hr)
      const intraWorkoutWorkouts = workouts.filter((w) => w.durationSec && w.durationSec > 0)
      let highCarbDetected = false

      for (const w of intraWorkoutWorkouts) {
        // Approximate check: if nutrition record fueling plan suggests high carbs during this workout
        const plan = nutrition?.fuelingPlan as any
        const intraWindow = plan?.windows?.find(
          (win: any) =>
            win.type === 'INTRA_WORKOUT' &&
            new Date(win.startTime) <= timestamp &&
            new Date(win.endTime) >= lookbackStart
        )

        if (intraWindow && intraWindow.targetCarbs > 90) {
          highCarbDetected = true
          suspectedTriggerId = w.id
          break
        }
      }

      if (highCarbDetected) {
        analysis = 'It looks like your intra-workout carbohydrate intake exceeded 90g/hr.'
        remediation = 'Try capping your intake at 80g/hr next time to build gut tolerance.'
      } else {
        analysis = 'No obvious metabolic red flags for GI distress in the last 4 hours.'
        remediation =
          'Monitor your next meal for fiber or fat content which can also cause distress.'
      }
    } else if (category === 'FATIGUE' || category === 'MUSCLE_PAIN') {
      const isGlycogenLow = snapshot && snapshot.level < 20
      const isFluidDebtHigh = snapshot && snapshot.fluidDeficit > 2000

      if (isGlycogenLow) {
        analysis = `Your glycogen tank was very low (${snapshot.level}%) when you felt this way.`
        remediation = 'Increase your immediate carbohydrate intake to accelerate recovery.'
      } else if (isFluidDebtHigh) {
        analysis = `Your fluid debt was significant (${snapshot.fluidDeficit}ml) at the time of the event.`
        remediation = 'Focus on rehydration with electrolytes over the next 2 hours.'
      } else {
        analysis = 'Your energy and hydration levels seemed stable.'
        remediation =
          'This might be cumulative fatigue. Consider an extra rest day or Z1 recovery session.'
      }
    }

    return { analysis, remediation, suspectedTriggerId }
  }
}
