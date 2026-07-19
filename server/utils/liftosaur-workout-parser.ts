export type ParsedLiftosaurSet = {
  type: 'NORMAL' | 'WARMUP'
  reps: number | null
  weight: number | null
  weightUnit: 'kg' | 'lb' | null
  durationSec: number | null
  rpe: number | null
  source: string
}

export type ParsedLiftosaurExercise = {
  name: string
  equipment: string | null
  sets: ParsedLiftosaurSet[]
  target: string | null
  clauses: Record<string, string>
}

export type ParsedLiftosaurWorkout = {
  date: Date
  program: string | null
  dayName: string | null
  week: number | null
  dayInWeek: number | null
  durationSec: number
  exercises: ParsedLiftosaurExercise[]
  metadata: Record<string, string>
  warnings: string[]
  sourceText: string
}

function splitTopLevel(input: string, separator: string) {
  const parts: string[] = []
  let current = ''
  let braces = 0
  let quoted = false
  let escaped = false

  for (const character of input) {
    if (escaped) {
      current += character
      escaped = false
      continue
    }
    if (character === '\\') {
      current += character
      escaped = true
      continue
    }
    if (character === '"') quoted = !quoted
    if (!quoted && character === '{') braces++
    if (!quoted && character === '}') braces = Math.max(0, braces - 1)

    if (!quoted && braces === 0 && character === separator) {
      parts.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseString(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string
    } catch {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

function parseInteger(value: string | undefined) {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDuration(value: string | undefined) {
  if (!value) return 0
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)$/i)
  if (!match) return 0
  const amount = Number(match[1])
  const multiplier =
    match[2]!.toLowerCase() === 'h' ? 3600 : match[2]!.toLowerCase() === 'm' ? 60 : 1
  return Math.round(amount * multiplier)
}

function parseSetGroup(source: string, type: ParsedLiftosaurSet['type']) {
  const trimmed = source.trim()
  const match = trimmed.match(/^(\d+)x(\d+)(.*)$/i)
  if (!match) return []

  const count = Number(match[1])
  const reps = Number(match[2])
  const suffix = match[3]!.trim()
  const weightMatch = suffix.match(/(?:^|\s)(-?\d+(?:\.\d+)?)\s*(kg|lb)(?:\s|$)/i)
  const durationMatch = suffix.match(/(?:^|\s)(\d+(?:\.\d+)?)s(?:\s|$)/i)
  const rpeMatch = suffix.match(/(?:rpe\s*:?\s*|@)(\d+(?:\.\d+)?)/i)
  const weight = weightMatch ? Number(weightMatch[1]) : null
  const weightUnit = weightMatch ? (weightMatch[2]!.toLowerCase() as 'kg' | 'lb') : null
  const durationSec = durationMatch ? Math.round(Number(durationMatch[1])) : null
  const rpe = rpeMatch ? Number(rpeMatch[1]) : null

  return Array.from({ length: Math.min(Math.max(count, 0), 100) }, () => ({
    type,
    reps: Number.isFinite(reps) ? reps : null,
    weight: weight !== null && Number.isFinite(weight) ? weight : null,
    weightUnit,
    durationSec: durationSec !== null && Number.isFinite(durationSec) ? durationSec : null,
    rpe: rpe !== null && Number.isFinite(rpe) ? rpe : null,
    source: trimmed
  }))
}

function parseSets(source: string, type: ParsedLiftosaurSet['type'], warnings: string[]) {
  const sets: ParsedLiftosaurSet[] = []
  for (const group of splitTopLevel(source, ',')) {
    const parsed = parseSetGroup(group, type)
    if (parsed.length === 0 && group.trim())
      warnings.push(`Unsupported set notation: ${group.trim()}`)
    sets.push(...parsed)
  }
  return sets
}

function parseExercise(line: string, warnings: string[]): ParsedLiftosaurExercise | null {
  const parts = splitTopLevel(line, '/')
  const heading = parts.shift()?.trim()
  if (!heading) return null

  const headingParts = splitTopLevel(heading, ',')
  const name = headingParts.shift()?.trim()
  if (!name) return null

  const equipment = headingParts.join(', ').trim() || null
  const sets: ParsedLiftosaurSet[] = []
  const clauses: Record<string, string> = {}
  let target: string | null = null

  for (const part of parts) {
    const clauseMatch = part.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/s)
    if (!clauseMatch) {
      sets.push(...parseSets(part, 'NORMAL', warnings))
      continue
    }

    const key = clauseMatch[1]!.toLowerCase()
    const value = clauseMatch[2]!.trim()
    clauses[key] = value
    if (key === 'warmup') sets.push(...parseSets(value, 'WARMUP', warnings))
    if (key === 'target') target = value
  }

  return { name, equipment, sets, target, clauses }
}

function extractExerciseLines(block: string) {
  const body = block.trim().replace(/^\{/, '').replace(/\}$/, '').trim()
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function parseLiftosaurWorkout(sourceText: string): ParsedLiftosaurWorkout {
  const source = sourceText.trim()
  const parts = splitTopLevel(source, '/')
  const timestamp = parts.shift()
  const date = new Date(timestamp || '')
  if (!timestamp || Number.isNaN(date.getTime())) {
    throw new Error('Liftosaur workout has an invalid or missing timestamp.')
  }

  const metadata: Record<string, string> = {}
  const warnings: string[] = []
  let exerciseBlock = ''

  for (const part of parts) {
    const match = part.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/s)
    if (!match) {
      warnings.push(`Unsupported workout clause: ${part}`)
      continue
    }
    const key = match[1]!
    const value = match[2]!.trim()
    if (key.toLowerCase() === 'exercises') exerciseBlock = value
    else metadata[key] = parseString(value)
  }

  const exercises = extractExerciseLines(exerciseBlock)
    .map((line) => parseExercise(line, warnings))
    .filter((exercise): exercise is ParsedLiftosaurExercise => exercise !== null)

  if (exercises.length === 0) warnings.push('Workout contains no parseable exercises.')

  return {
    date,
    program: metadata.program || null,
    dayName: metadata.dayName || null,
    week: parseInteger(metadata.week),
    dayInWeek: parseInteger(metadata.dayInWeek),
    durationSec: parseDuration(metadata.duration),
    exercises,
    metadata,
    warnings,
    sourceText
  }
}
