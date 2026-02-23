type CadenceRange = { start?: number; end?: number }

const HIGH_CADENCE_PATTERNS = [
  /high cadence/i,
  /neuromuscular/i,
  /spin[-\s]?up/i,
  /\b95\+\s*rpm\b/i
]

const RECOVERY_CADENCE_PATTERNS = [
  /recovery/i,
  /easy/i,
  /standard cadence/i,
  /settle/i
]

const VARIATION_INTENT_PATTERNS = [
  /cadence variation/i,
  /vary cadence/i,
  /high cadence/i,
  /neuromuscular/i,
  /\b\d{2,3}\s*\/\s*\d{2,3}\s*rpm\b/i,
  /\b\d{2,3}\+\s*rpm\b/i
]

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function normalizeCadenceRange(raw: unknown): { start: number; end: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const range = raw as CadenceRange
  const start = toPositiveNumber(range.start)
  const end = toPositiveNumber(range.end)
  if (!start || !end) return null
  return start <= end ? { start, end } : { start: end, end: start }
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function extractAlternatingPair(text: string): { high: number; low: number } | null {
  const match = text.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\s*rpm\b/i)
  if (!match) return null
  const a = toPositiveNumber(match[1])
  const b = toPositiveNumber(match[2])
  if (!a || !b) return null
  return a >= b ? { high: a, low: b } : { high: b, low: a }
}

function extractCadenceRange(text: string): { start: number; end: number } | null {
  const match = text.match(/\b(\d{2,3})\s*-\s*(\d{2,3})\s*rpm\b/i)
  if (!match) return null
  const start = toPositiveNumber(match[1])
  const end = toPositiveNumber(match[2])
  if (!start || !end) return null
  return start <= end ? { start, end } : { start: end, end: start }
}

function extractCadencePlus(text: string): number | null {
  const match = text.match(/\b(\d{2,3})\s*\+\s*rpm\b/i)
  if (!match) return null
  return toPositiveNumber(match[1])
}

function extractSingleCadence(text: string): number | null {
  const matches = Array.from(text.matchAll(/\b(\d{2,3})\s*rpm\b/gi))
  if (matches.length === 0) return null
  const value = toPositiveNumber(matches[0]?.[1])
  return value || null
}

function joinHintText(step: any, parentStep?: any): string {
  return [
    step?.name,
    step?.targetSplit,
    step?.description,
    parentStep?.name,
    parentStep?.targetSplit,
    parentStep?.description
  ]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
}

export function resolveCyclingCadence(
  step: any,
  parentStep?: any,
  stepIndex?: number
): number {
  const explicit = toPositiveNumber(step?.cadence)
  if (explicit) return Math.round(explicit)

  const explicitRange = normalizeCadenceRange(step?.cadenceRange)
  if (explicitRange) return Math.round((explicitRange.start + explicitRange.end) / 2)

  const hintText = joinHintText(step, parentStep)
  const isHighCadence = hasPattern(hintText, HIGH_CADENCE_PATTERNS)
  const isRecoveryCadence = hasPattern(hintText, RECOVERY_CADENCE_PATTERNS)

  const pair = extractAlternatingPair(hintText)
  if (pair) {
    if (isRecoveryCadence) return Math.round(pair.low)
    if (isHighCadence) return Math.round(pair.high)
    if (typeof stepIndex === 'number') return Math.round(stepIndex % 2 === 0 ? pair.high : pair.low)
    return Math.round((pair.high + pair.low) / 2)
  }

  const plus = extractCadencePlus(hintText)
  if (plus) {
    if (isRecoveryCadence) return Math.max(80, Math.round(plus - 10))
    return Math.round(plus)
  }

  const rangeHint = extractCadenceRange(hintText)
  if (rangeHint) {
    if (isRecoveryCadence) return Math.round(rangeHint.start)
    if (isHighCadence) return Math.round(rangeHint.end)
    return Math.round((rangeHint.start + rangeHint.end) / 2)
  }

  const single = extractSingleCadence(hintText)
  if (single) {
    if (isRecoveryCadence) return Math.max(80, Math.round(single - 5))
    return Math.round(single)
  }

  if (step?.type === 'Warmup' || step?.type === 'Cooldown') return 85
  if (step?.type === 'Rest') return 80

  const parentCadence = toPositiveNumber(parentStep?.cadence)
  if (parentCadence) return Math.round(parentCadence)

  const parentRange = normalizeCadenceRange(parentStep?.cadenceRange)
  if (parentRange) {
    if (isRecoveryCadence) return Math.round(parentRange.start)
    if (isHighCadence) return Math.round(parentRange.end)
    return Math.round((parentRange.start + parentRange.end) / 2)
  }

  return 90
}

function collectCadenceIntentTexts(structure: any): string[] {
  const texts: string[] = []
  const pushIfText = (value: unknown) => {
    if (typeof value === 'string' && value.trim().length > 0) texts.push(value)
  }

  pushIfText(structure?.description)
  pushIfText(structure?.coachInstructions)

  const visit = (steps: any[]) => {
    if (!Array.isArray(steps)) return
    for (const step of steps) {
      pushIfText(step?.name)
      pushIfText(step?.targetSplit)
      pushIfText(step?.description)
      if (Array.isArray(step?.steps)) visit(step.steps)
    }
  }
  visit(structure?.steps || [])

  return texts
}

function collectActiveLeafCadences(structure: any): number[] {
  const values: number[] = []
  const visit = (steps: any[]) => {
    if (!Array.isArray(steps)) return
    for (const step of steps) {
      if (Array.isArray(step?.steps) && step.steps.length > 0) {
        visit(step.steps)
        continue
      }
      if (step?.type !== 'Active') continue
      const cadence = toPositiveNumber(step?.cadence)
      if (cadence) values.push(Math.round(cadence))
    }
  }
  visit(structure?.steps || [])
  return values
}

function resolveCadenceRecursively(steps: any[], parentStep?: any) {
  if (!Array.isArray(steps)) return
  steps.forEach((step: any, idx: number) => {
    if (!step?.cadence) {
      step.cadence = resolveCyclingCadence(step, parentStep, idx)
    }
    if (Array.isArray(step?.steps) && step.steps.length > 0) {
      resolveCadenceRecursively(step.steps, step)
    }
  })
}

export function enforceCyclingCadenceVariation(structure: any): boolean {
  if (!structure || typeof structure !== 'object') return false
  if (!Array.isArray(structure.steps) || structure.steps.length === 0) return false

  const intentTexts = collectCadenceIntentTexts(structure)
  const hasVariationIntent = intentTexts.some((text) =>
    VARIATION_INTENT_PATTERNS.some((pattern) => pattern.test(text))
  )
  if (!hasVariationIntent) return false

  const before = new Set(collectActiveLeafCadences(structure))
  if (before.size >= 2) return false

  resolveCadenceRecursively(structure.steps)

  const afterValues = collectActiveLeafCadences(structure)
  const after = new Set(afterValues)

  if (after.size < 2) {
    const combinedText = intentTexts.join(' ')
    const pair = extractAlternatingPair(combinedText)
    if (pair && afterValues.length >= 2) {
      let touched = 0
      const visit = (steps: any[]) => {
        if (!Array.isArray(steps)) return
        for (const step of steps) {
          if (Array.isArray(step?.steps) && step.steps.length > 0) {
            visit(step.steps)
            continue
          }
          if (step?.type !== 'Active') continue
          step.cadence = touched % 2 === 0 ? Math.round(pair.high) : Math.round(pair.low)
          touched += 1
        }
      }
      visit(structure.steps)
    }
  }

  const final = new Set(collectActiveLeafCadences(structure))
  return final.size >= 2
}
