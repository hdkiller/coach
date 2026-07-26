import type { EnergyPoint } from '../nutrition-domain/types'

export type IntakeConfidenceLevel = 'measured' | 'partial' | 'inferred' | 'unknown'

export interface IntakeConfidence {
  measuredDays: number
  totalDays: number
  ratio: number
  level: IntakeConfidenceLevel
}

/**
 * How much of an energy curve rests on logged food rather than on the plan.
 *
 * Barely one production day in a hundred carries logged intake, so most of the curve is inference.
 * Every endpoint that serves these points also serves this, so no client has to present an assumed
 * line as though it were measured.
 */
export function summariseIntakeConfidence(
  points: Array<EnergyPoint & { dateKey?: string }>
): IntakeConfidence {
  const measured = new Set<string>()
  const total = new Set<string>()

  for (const point of points || []) {
    const key = String((point as any)?.dateKey || '')
    if (!key) continue
    total.add(key)
    if (point?.intakeProvenance === 'logged') measured.add(key)
  }

  const totalDays = total.size
  const measuredDays = measured.size
  const ratio = totalDays > 0 ? measuredDays / totalDays : 0

  const level: IntakeConfidenceLevel =
    totalDays === 0 ? 'unknown' : ratio >= 0.7 ? 'measured' : ratio >= 0.3 ? 'partial' : 'inferred'

  return { measuredDays, totalDays, ratio, level }
}
