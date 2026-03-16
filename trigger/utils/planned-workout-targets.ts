type AnyRecord = Record<string, any>

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toNumber(value: unknown): number | null {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return numeric
}

function formatDuration(secondsRaw: unknown): string {
  const seconds = toNumber(secondsRaw)
  if (!seconds || seconds <= 0) return 'Lap'
  const rounded = Math.round(seconds)
  const mins = Math.floor(rounded / 60)
  const secs = rounded % 60
  if (mins <= 0) return `${secs}s`
  if (secs === 0) return `${mins}m`
  return `${mins}m ${secs}s`
}

function isPowerUnits(units: string): boolean {
  const normalized = units.toLowerCase()
  return ['w', 'watt', 'watts', 'power'].some((token) => normalized.includes(token))
}

function isPercentUnits(units: string): boolean {
  const normalized = units.toLowerCase()
  return normalized.includes('%')
}

function formatPercentOrRatio(value: number): string {
  if (value <= 2) return `${Math.round(value * 100)}%`
  return `${Math.round(value)}%`
}

function formatPowerTarget(target: any, ftp?: number | null): string | null {
  if (!target || typeof target !== 'object') return null
  const units = String(target.units || '').trim()
  const powerLabel = (value: number): string => {
    if (isPowerUnits(units)) {
      return `${Math.round(value)}W`
    }
    if (isPercentUnits(units) || value <= 2) {
      const pct = formatPercentOrRatio(value)
      if (isFiniteNumber(ftp) && ftp > 0) {
        const ratio = value <= 2 ? value : value / 100
        return `${pct} FTP (~${Math.round(ratio * ftp)}W)`
      }
      return `${pct} FTP`
    }
    return `${Math.round(value)}W`
  }

  if (target.range && typeof target.range === 'object') {
    const start = toNumber(target.range.start)
    const end = toNumber(target.range.end)
    if (start !== null && end !== null) {
      return `${powerLabel(start)} - ${powerLabel(end)}`
    }
  }

  const value = toNumber(target.value)
  if (value !== null) return powerLabel(value)
  return null
}

function formatHrTarget(target: any): string | null {
  if (!target || typeof target !== 'object') return null
  const units = String(target.units || '').trim()
  const hrLabel = (value: number): string => {
    if (isPercentUnits(units) || value <= 2) {
      return `${formatPercentOrRatio(value)} LTHR`
    }
    return `${Math.round(value)} bpm`
  }

  if (target.range && typeof target.range === 'object') {
    const start = toNumber(target.range.start)
    const end = toNumber(target.range.end)
    if (start !== null && end !== null) return `${hrLabel(start)} - ${hrLabel(end)}`
  }

  const value = toNumber(target.value)
  if (value !== null) return hrLabel(value)
  return null
}

function formatPaceTarget(target: any): string | null {
  if (!target || typeof target !== 'object') return null
  const units = String(target.units || '').trim()
  const paceLabel = (value: number): string => {
    if (isPercentUnits(units) || value <= 2) return `${formatPercentOrRatio(value)} threshold pace`
    return units ? `${value} ${units}` : String(value)
  }

  if (target.range && typeof target.range === 'object') {
    const start = toNumber(target.range.start)
    const end = toNumber(target.range.end)
    if (start !== null && end !== null) return `${paceLabel(start)} - ${paceLabel(end)}`
  }

  const value = toNumber(target.value)
  if (value !== null) return paceLabel(value)
  return null
}

function formatLegacyTarget(step: AnyRecord): string | null {
  const raw = toNumber(step.target_value)
  if (raw === null) return null
  if (String(step.target_type || '').toUpperCase() === 'POWER') return `${Math.round(raw)}W`
  return String(raw)
}

function extractTarget(step: AnyRecord, ftp?: number | null): string {
  return (
    formatPowerTarget(step.power, ftp) ||
    formatHrTarget(step.heartRate || step.hr) ||
    formatPaceTarget(step.pace) ||
    formatLegacyTarget(step) ||
    'N/A'
  )
}

function extractCadence(step: AnyRecord): string | null {
  const explicit = toNumber(step.cadence)
  if (explicit !== null && explicit > 0) return `${Math.round(explicit)}rpm`

  const cadenceValue = toNumber(step.cadence?.value)
  if (cadenceValue !== null && cadenceValue > 0) return `${Math.round(cadenceValue)}rpm`

  const start = toNumber(step.cadenceRange?.start ?? step.cadence?.start)
  const end = toNumber(step.cadenceRange?.end ?? step.cadence?.end)
  if (start !== null && end !== null && start > 0 && end > 0) {
    return `${Math.round(start)}-${Math.round(end)}rpm`
  }

  return null
}

function stepDurationSeconds(step: AnyRecord): number | null {
  return (
    toNumber(step.durationSeconds) ??
    toNumber(step.duration) ??
    toNumber(step.duration_s) ??
    toNumber(step.elapsed_time)
  )
}

function extractTopLevelSteps(structuredWorkout: unknown): AnyRecord[] {
  if (Array.isArray(structuredWorkout))
    return structuredWorkout.filter((s) => s && typeof s === 'object')
  if (
    structuredWorkout &&
    typeof structuredWorkout === 'object' &&
    Array.isArray((structuredWorkout as AnyRecord).steps)
  ) {
    return (structuredWorkout as AnyRecord).steps
  }
  return []
}

function flattenSteps(steps: AnyRecord[], depth = 0): Array<{ step: AnyRecord; depth: number }> {
  const rows: Array<{ step: AnyRecord; depth: number }> = []
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue
    rows.push({ step, depth })

    const nested = Array.isArray(step.steps)
      ? step.steps.filter((s: any) => s && typeof s === 'object')
      : []
    if (!nested.length) continue

    const reps = toNumber(step.reps)
    const repeatedDepth = depth + 1
    if (reps && reps > 1) {
      for (let i = 0; i < Math.round(reps); i++) {
        rows.push(...flattenSteps(nested, repeatedDepth))
      }
      continue
    }
    rows.push(...flattenSteps(nested, repeatedDepth))
  }
  return rows
}

export function formatStructuredPlanForPrompt(
  structuredWorkout: unknown,
  options: { ftp?: number | null } = {}
): string {
  const steps = extractTopLevelSteps(structuredWorkout)
  if (!steps.length) return 'N/A'

  const flattened = flattenSteps(steps)
  if (!flattened.length) return 'N/A'

  return flattened
    .map(({ step, depth }, index) => {
      const indent = '  '.repeat(depth)
      const duration = formatDuration(stepDurationSeconds(step))
      const type = step.type || 'Interval'
      const target = extractTarget(step, options.ftp)
      const cadence = extractCadence(step)
      return `${indent}Step ${index + 1} [${type}]: ${duration} @ ${target}${cadence ? ` | cadence ${cadence}` : ''}`
    })
    .join('\n')
}
