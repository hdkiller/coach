import type { LlmTrackingContext } from '../../server/utils/gemini'
import type { TargetFormatPolicy } from '../../server/utils/workout-target-format-policy'
import type { TargetPolicy } from '../../server/utils/workout-target-policy'
import { formatCompactTargetingBlock } from './workout-targeting'

const AI_CONTEXT_MAX_CHARS = 500
const AI_CONTEXT_SKIP_IF_DESCRIPTION_CHARS = 120
const CORRECTIVE_DRAFT_JSON_MAX_CHARS = 12_000

export function formatAiContextForStructureGen(params: {
  aiContext?: string | null
  workoutDescription?: string | null
}): string {
  const raw = String(params.aiContext || '').trim()
  if (!raw) return ''

  const description = String(params.workoutDescription || '').trim()
  if (description.length >= AI_CONTEXT_SKIP_IF_DESCRIPTION_CHARS) {
    return ''
  }

  const capped = raw.length <= AI_CONTEXT_MAX_CHARS ? raw : `${raw.slice(0, AI_CONTEXT_MAX_CHARS)}…`
  return `- User Preferences/Context: ${capped}`
}

export function buildCompactZoneDefinitions(params: {
  workoutType: string
  sportSettings: any
  primaryMetric: string
  loadPreference: string
  ftp: number
  lthr: number
}) {
  const { workoutType, sportSettings, primaryMetric, loadPreference, ftp, lthr } = params
  const parts: string[] = []
  const addZones = (label: string, zones: any[], unit: string, limit = 5) => {
    if (!Array.isArray(zones) || zones.length === 0) return
    const compact = zones
      .slice(0, limit)
      .map((z: any) => `${z.name}: ${z.min}-${z.max}${unit}`)
      .join(' | ')
    if (compact) parts.push(`${label}: ${compact}`)
  }

  if (primaryMetric === 'heartRate')
    addZones(`${workoutType} HR Zones`, sportSettings?.hrZones, ' bpm')
  if (primaryMetric === 'power')
    addZones(`${workoutType} Power Zones`, sportSettings?.powerZones, ' W')
  if (primaryMetric === 'pace')
    addZones(`${workoutType} Pace Zones`, sportSettings?.paceZones, ' m/s')

  if (
    primaryMetric !== 'heartRate' &&
    Array.isArray(sportSettings?.hrZones) &&
    sportSettings.hrZones.length > 0
  ) {
    addZones(`${workoutType} HR Zones`, sportSettings.hrZones, ' bpm', 3)
  }
  if (
    primaryMetric !== 'power' &&
    Array.isArray(sportSettings?.powerZones) &&
    sportSettings.powerZones.length > 0
  ) {
    addZones(`${workoutType} Power Zones`, sportSettings.powerZones, ' W', 3)
  }
  if (
    primaryMetric !== 'pace' &&
    Array.isArray(sportSettings?.paceZones) &&
    sportSettings.paceZones.length > 0
  ) {
    addZones(`${workoutType} Pace Zones`, sportSettings.paceZones, ' m/s', 3)
  }

  if (lthr) parts.push(`Reference LTHR: ${lthr} bpm`)
  if (ftp) parts.push(`Reference FTP: ${ftp} W`)
  if (sportSettings?.thresholdPace) {
    const metersPerSecond = Number(sportSettings.thresholdPace)
    if (metersPerSecond > 0) {
      const secondsPerKm = 1000 / metersPerSecond
      const minutes = Math.floor(secondsPerKm / 60)
      const seconds = Math.round(secondsPerKm % 60)
      parts.push(
        `Reference Threshold Pace: ${metersPerSecond} m/s (${minutes}:${seconds
          .toString()
          .padStart(2, '0')}/km)`
      )
    }
  }
  parts.push(`Preferred Load Metric: ${loadPreference}`)
  if (sportSettings?.warmupTime) parts.push(`Default Warmup: ${sportSettings.warmupTime} min`)
  if (sportSettings?.cooldownTime) parts.push(`Default Cooldown: ${sportSettings.cooldownTime} min`)

  return parts.join('\n')
}

export function buildRunPaceUnitInstruction(targetFormatPolicy: TargetFormatPolicy): string {
  return targetFormatPolicy.pace.mode === 'absolutePace'
    ? 'Use pace.units="/km" with decimal minute values (5.33-5.67 for 5:20-5:40/km) when absolute pace is requested.'
    : 'Use heartRate.units="LTHR" and pace.units="Pace" for percentage targets.'
}

export function buildSportSpecificInstructions(params: {
  workoutType: string
  targetFormatPolicy: TargetFormatPolicy
  steadyTargetStyleRule: string
}): string {
  const workoutType = String(params.workoutType || '').toLowerCase()
  const isCycling = workoutType.includes('ride')
  const isRun = workoutType.includes('run')
  const isSwim = workoutType.includes('swim')
  const isStrength = workoutType.includes('gym') || workoutType.includes('weight')
  const runPaceUnitInstruction = buildRunPaceUnitInstruction(params.targetFormatPolicy)

  if (isCycling) {
    return `FOR CYCLING:
- Use % FTP for power (0.95 = 95%), power.units="%".
- Include cadence (RPM) on every step; vary cadence on focus steps.
- Use power ramps (start/end) for warmup/cooldown when appropriate.
- Avoid repeated identical 20+ minute blocks unless repeats are requested.`
  }

  if (isRun) {
    return `FOR RUNNING:
- Include distance (meters) on every step; estimate from pace when duration-based.
- ${runPaceUnitInstruction}
- ${params.steadyTargetStyleRule}
- In-session segments only; no static stretching as steps.
- Respect quality spacing between hard efforts.`
  }

  if (isSwim) {
    return `FOR SWIMMING:
- Prefer distanceMeters; use stroke, equipment, sendoffSeconds, restSeconds, targetSplit, cssPercent when relevant.
- One intensity cue per step when possible; drills may omit targets if send-off/rest defines the task.
- Total session time must land near planned duration; sanity-check before returning.`
  }

  if (isStrength) {
    return `FOR STRENGTH:
- Return native 'blocks' with steps and setRows; not flat interval-style top-level steps.
- Loaded lifts use real sets/reps/load, not one long duration row.
- Block types: warmup, single_exercise, superset, circuit, cooldown.`
  }

  return `FOR THIS SPORT: use sport-relevant fields with clear work/recovery structure.`
}

export function buildStructureAiCallOptions(params: {
  attempt: number
  userId: string
  operation: string
  entityType: string
  entityId: string
  timeoutMs: number
}): LlmTrackingContext {
  const base: LlmTrackingContext = {
    userId: params.userId,
    operation: params.operation,
    entityType: params.entityType,
    entityId: params.entityId,
    maxRetries: 0,
    timeoutMs: params.timeoutMs
  }

  if (params.attempt === 1) {
    return { ...base, disableThinking: true }
  }

  return {
    ...base,
    modelOverride: 'gemini-3-pro-preview',
    thinkingLevelOverride: 'low'
  }
}

export function buildCorrectiveStructureRetryPrompt(params: {
  workout: { title?: string | null; type?: string | null; durationSec?: number | null }
  reason: string
  previousDraft?: unknown
  generatorMode: 'draft_json_v1' | 'legacy_json'
  extraInstructions?: string
}): string {
  const durationMinutes = Math.round(Number(params.workout.durationSec || 3600) / 60)
  const draftJson = params.previousDraft
    ? JSON.stringify(params.previousDraft, null, 2).slice(0, CORRECTIVE_DRAFT_JSON_MAX_CHARS)
    : null

  const schemaHint =
    params.generatorMode === 'draft_json_v1'
      ? 'Return compact JSON matching the draft schema (single target object per step).'
      : 'Return valid JSON matching the full structure schema.'

  return `Fix this ${params.workout.type || 'workout'} structure.

WORKOUT: ${params.workout.title || 'Untitled'} | ${durationMinutes} min

FAILURE: ${params.reason}
${params.extraInstructions ? `\n${params.extraInstructions}` : ''}
${draftJson ? `\nPREVIOUS DRAFT:\n${draftJson}\n` : ''}
Preserve valid steps where possible. ${schemaHint}`
}

export function buildDraftOutputRules(params: { preserveExistingStructure: boolean }): string {
  return `- Return compact JSON only.
- Use ONE \`target\` object per step, never multiple metric objects.
- \`target.metric\` must be one of: power, heartRate, pace, rpe.
- Use \`target.units\` from: %, w, bpm, LTHR, Pace, /km.
- Percentages use decimal fractions (0.80 LTHR, 0.95 FTP).
- Use \`durationSeconds\` for timed steps; \`distanceMeters\` when distance is central.
- Use nested \`steps\` plus \`reps\` for repeats.
- Every step needs a clear purpose and \`intent\`.
- In-session steps only; no stretching/mobility as steps.
- Put recovery guidance in \`coachInstructions\`, not \`steps\`.
- ${params.preserveExistingStructure ? 'Preserve session identity unless the workout clearly requires change.' : 'Build the full session from scratch.'}`
}

export { formatCompactTargetingBlock }
