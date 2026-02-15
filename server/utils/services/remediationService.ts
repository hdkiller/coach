import { prisma } from '../db'
import { JourneyEventCategory } from '@prisma/client'

export interface FuelingOverride {
  strategy?: string
  carbAdjustment?: number
  notes: string[]
  isRescueProtocol: boolean
}

export const remediationService = {
  /**
   * Checks for severe symptoms in the last 24 hours and returns a fueling override if needed.
   */
  async getActiveFuelingOverride(userId: string, date: Date): Promise<FuelingOverride | null> {
    const lookback = new Date(date.getTime() - 24 * 60 * 60 * 1000)

    const severeEvents = await prisma.athleteJourneyEvent.findMany({
      where: {
        userId,
        timestamp: {
          gte: lookback,
          lte: date
        },
        severity: { gte: 7 }
      },
      orderBy: { timestamp: 'desc' }
    })

    if (severeEvents.length === 0) return null

    const mostRecent = severeEvents[0]
    if (!mostRecent) return null

    const notes: string[] = []
    let strategy: string | undefined
    let carbAdjustment: number | undefined
    let isRescueProtocol = false

    if (mostRecent.category === 'GI_DISTRESS') {
      strategy = 'LOW_FIBER_LIQUID'
      isRescueProtocol = true
      notes.push(
        `RESCUE PROTOCOL: Severe GI distress logged recently (Severity ${mostRecent.severity}).`
      )
      notes.push('Switching to low-fiber, liquid-primary fueling for the next 24 hours.')
    } else if (mostRecent.category === 'FATIGUE' || mostRecent.category === 'MUSCLE_PAIN') {
      carbAdjustment = 1.25 // +25% carbs
      notes.push(`RECOVERY BOOST: High fatigue logged (Severity ${mostRecent.severity}).`)
      notes.push('Increasing carbohydrate targets by 25% to prioritize glycogen restoration.')
    }

    return { strategy, carbAdjustment, notes, isRescueProtocol }
  }
}
