export interface GlycogenBreakdown {
  midnightBaseline: number
  replenishment: {
    value: number
    actualCarbs: number
    targetCarbs: number
  }
  depletion: Array<{
    title: string
    value: number
    intensity: number
    durationMin: number
  }>
  restingMetabolism?: number
}

export interface GlycogenResult {
  percentage: number
  advice: string
  state: number
  breakdown: GlycogenBreakdown
}

export interface EnergyPoint {
  time: string
  timestamp: number
  level: number
  kcalBalance: number
  carbBalance: number
  fluidDeficit: number
  isFuture: boolean
  event?: string
  eventType?: 'workout' | 'meal'
  eventIcon?: string
  eventCarbs?: number
  eventFluid?: number
}

export type JourneyEventType = 'SYMPTOM' | 'WELLNESS_CHECK' | 'RECOVERY_NOTE'
export type JourneyEventCategory =
  | 'GI_DISTRESS'
  | 'MUSCLE_PAIN'
  | 'FATIGUE'
  | 'SLEEP'
  | 'MOOD'
  | 'CRAMPING'
  | 'DIZZINESS'
  | 'HUNGER'

export interface AthleteJourneyEvent {
  id: string
  userId: string
  timestamp: string | Date
  eventType: JourneyEventType
  category: JourneyEventCategory
  severity: number
  description?: string
  metabolicSnapshot?: any
  suspectedTriggerId?: string
}
