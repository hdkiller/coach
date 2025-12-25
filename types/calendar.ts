export interface CalendarActivity {
  id: string
  title: string
  date: string // ISO date string
  type: string
  source: 'completed' | 'planned'
  status: 'completed' | 'planned' | 'missed'
  
  // Normalized metrics
  duration: number // seconds
  distance?: number // meters
  tss?: number
  intensity?: number // 0-1+
  
  // Completed specific
  rpe?: number
  feel?: number
  plannedWorkoutId?: string
  
  // Planned specific
  plannedDuration?: number
  plannedDistance?: number
  plannedTss?: number
  
  // UI helpers
  color?: string
  icon?: string
}

export interface CalendarDay {
  date: string
  activities: CalendarActivity[]
  summary?: {
    totalDuration: number
    totalDistance: number
    totalTss: number
  }
}

export interface CalendarWeek {
  startDate: string
  endDate: string
  days: CalendarDay[]
  summary: {
    totalDuration: number
    totalDistance: number
    totalTss: number
    plannedDuration?: number
    plannedTss?: number
  }
}