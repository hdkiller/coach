type FactConfidence = 'low' | 'medium' | 'high'
type FactSeverity = 'low' | 'moderate' | 'high' | 'unknown'
type AnalysisMode = 'power' | 'pace' | 'rpe' | 'mixed'
type PowerSourceType = 'measured' | 'estimated' | 'unknown'
type DecouplingDirection = 'positive_drift' | 'stable' | 'efficiency_gain'
type LrSourceSemantics = 'true_left_right' | 'human_vs_motor' | 'unknown'
type LrInterpretationMode = 'normal' | 'corrected' | 'disabled'
type ErgSource = 'explicit' | 'inferred' | 'unknown'
type PowerControlMode = 'erg' | 'resistance' | 'free_ride' | 'unknown'
type PromptDecision = {
  include: boolean
  reason: string
}

export interface WorkoutAnalysisFacts {
  subjective: {
    rpe: number | null
    sessionRpeLoad: number | null
    subjectiveObjectiveGap: FactSeverity
    musculoskeletalToll: FactSeverity
    impactProfile: 'low' | 'medium' | 'high'
  }
  telemetry: {
    analysisMode: AnalysisMode
    hrUsable: boolean
    hrZeroRatio: number | null
    hrMissingRatio: number | null
    hrArtifactFlag: boolean
    powerSourceType: PowerSourceType
    powerAbsoluteUsable: boolean
    powerRelativeUsable: boolean
    lrBalanceUsable: boolean
  }
  physiology: {
    normalHrLagExpected: boolean
    normalHrLagDetected: boolean
    steadyStateSegmentsAvailable: boolean
    warmupExcludedMinutes: number
    decouplingValid: boolean
    decouplingEffective: number | null
    decouplingDirection: DecouplingDirection | 'unknown'
    decouplingConfidence: FactConfidence
  }
  lrBalance: {
    sourceSemantics: LrSourceSemantics
    inversionSuspected: boolean
    correctedLeftPct: number | null
    correctedRightPct: number | null
    interpretationMode: LrInterpretationMode
    correctionReason: string | null
  }
  erg: {
    detected: boolean
    confidence: FactConfidence
    source: ErgSource
    powerControlMode: PowerControlMode
    reasons: string[]
  }
  debugMeta: {
    factVersion: string
    computedFrom: string[]
    unavailableInputs: string[]
    disabledInterpretations: string[]
    promptDecisions: Record<string, PromptDecision>
  }
}

interface BuildWorkoutAnalysisFactsOptions {
  workout: any
  sportSettings?: any
  plannedWorkout?: any
  userProfile?: {
    weight?: number | null
    weightUnits?: string | null
    language?: string | null
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number | null | undefined, decimals = 1): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'number') return entry
      if (typeof entry === 'string') {
        const parsed = Number(entry)
        return Number.isFinite(parsed) ? parsed : null
      }
      if (entry && typeof entry === 'object') {
        const candidate = (entry as any).value ?? (entry as any).y ?? (entry as any).v
        const parsed = Number(candidate)
        return Number.isFinite(parsed) ? parsed : null
      }
      return null
    })
    .filter((entry): entry is number => entry !== null)
}

function getWorkoutFamily(workoutType: string | null | undefined) {
  const lower = String(workoutType || '').toLowerCase()
  if (
    ['ride', 'virtualride', 'ebike', 'bike', 'cycling', 'cycle', 'gravel', 'mtb'].some((token) =>
      lower.includes(token)
    )
  ) {
    return 'ride'
  }
  if (['run', 'trailrun', 'virtualrun', 'treadmill'].some((token) => lower.includes(token))) {
    return 'run'
  }
  if (['gym', 'weighttraining', 'strength', 'crossfit'].some((token) => lower.includes(token))) {
    return 'strength'
  }
  if (['swim', 'ski', 'row'].some((token) => lower.includes(token))) {
    return 'nonimpact_cardio'
  }
  return 'other'
}

function inferImpactProfile(
  family: ReturnType<typeof getWorkoutFamily>
): 'low' | 'medium' | 'high' {
  if (family === 'run') return 'high'
  if (family === 'strength') return 'medium'
  if (family === 'ride' || family === 'nonimpact_cardio') return 'low'
  return 'medium'
}

function inferPowerSourceType(
  workout: any,
  family: ReturnType<typeof getWorkoutFamily>
): PowerSourceType {
  const hasPower =
    Boolean(workout?.averageWatts) ||
    Boolean(workout?.normalizedPower) ||
    asNumberArray(workout?.streams?.watts).length > 0
  if (!hasPower) return 'unknown'
  if (
    family === 'run' ||
    String(workout?.type || '')
      .toLowerCase()
      .includes('ski')
  )
    return 'estimated'
  if (family === 'ride') return 'measured'
  return 'unknown'
}

function getHrStats(workout: any) {
  const hrStream = asNumberArray(workout?.streams?.heartrate)
  if (hrStream.length === 0) {
    return {
      zeroRatio: workout?.averageHr ? 0 : null,
      missingRatio: workout?.averageHr ? 0 : null,
      artifactFlag: false,
      usable: Boolean(workout?.averageHr)
    }
  }

  const invalidCount = hrStream.filter((value) => !Number.isFinite(value) || value <= 0).length
  const zeroCount = hrStream.filter((value) => value === 0).length
  const validCount = hrStream.filter((value) => value > 0).length
  const zeroRatio = zeroCount / hrStream.length
  const missingRatio = invalidCount / hrStream.length
  const artifactFlag = zeroRatio >= 0.05 || missingRatio >= 0.15
  const usable = validCount >= Math.max(60, hrStream.length * 0.75) && !artifactFlag

  return {
    zeroRatio: round(zeroRatio, 3),
    missingRatio: round(missingRatio, 3),
    artifactFlag,
    usable
  }
}

function getAnalysisMode(params: {
  family: ReturnType<typeof getWorkoutFamily>
  powerSourceType: PowerSourceType
  hrUsable: boolean
  hasPace: boolean
  hasRpe: boolean
}) {
  if (params.family === 'run' && params.hasPace) return 'pace'
  if (params.powerSourceType === 'measured') return params.hrUsable ? 'mixed' : 'power'
  if (params.powerSourceType === 'estimated') return params.hasPace ? 'pace' : 'mixed'
  if (params.hrUsable) return 'mixed'
  if (params.hasRpe) return 'rpe'
  return 'mixed'
}

function deriveSubjectiveObjectiveGap(
  sessionRpeLoad: number | null,
  objectiveLoad: number | null
): FactSeverity {
  if (sessionRpeLoad === null || objectiveLoad === null || objectiveLoad <= 0) return 'unknown'
  const ratio = sessionRpeLoad / objectiveLoad
  if (ratio >= 1.6 || ratio <= 0.6) return 'high'
  if (ratio >= 1.3 || ratio <= 0.8) return 'moderate'
  return 'low'
}

function deriveMusculoskeletalToll(params: {
  impactProfile: 'low' | 'medium' | 'high'
  sessionRpeLoad: number | null
  objectiveLoad: number | null
}) {
  const { impactProfile, sessionRpeLoad, objectiveLoad } = params
  if (sessionRpeLoad === null) return 'unknown'
  const ratio = objectiveLoad && objectiveLoad > 0 ? sessionRpeLoad / objectiveLoad : null
  if (impactProfile === 'high') {
    if (sessionRpeLoad >= 300 || (ratio !== null && ratio >= 1.25)) return 'high'
    if (sessionRpeLoad >= 180 || (ratio !== null && ratio >= 0.95)) return 'moderate'
    return 'low'
  }
  if (impactProfile === 'medium') {
    if (sessionRpeLoad >= 360 || (ratio !== null && ratio >= 1.4)) return 'high'
    if (sessionRpeLoad >= 220 || (ratio !== null && ratio >= 1.05)) return 'moderate'
    return 'low'
  }
  if (sessionRpeLoad >= 420 || (ratio !== null && ratio >= 1.5)) return 'high'
  if (sessionRpeLoad >= 260 || (ratio !== null && ratio >= 1.15)) return 'moderate'
  return 'low'
}

function deriveDecoupling(workout: any, hrUsable: boolean, warmupExcludedMinutes: number) {
  const durationMinutes = Math.round((workout?.durationSec || 0) / 60)
  const fallback = round(workout?.decoupling, 1)
  if (!hrUsable || durationMinutes < 40) {
    return {
      valid: false,
      effective: fallback,
      direction: 'unknown' as const,
      confidence: 'low' as FactConfidence,
      steadyStateSegmentsAvailable: false
    }
  }

  const time = asNumberArray(workout?.streams?.time)
  const power = asNumberArray(workout?.streams?.watts)
  const paceProxy = asNumberArray(workout?.streams?.velocity)
  const hr = asNumberArray(workout?.streams?.heartrate)
  const usePower = power.length > 0
  const workload = usePower ? power : paceProxy

  if (time.length > 0 && workload.length === time.length && hr.length === time.length) {
    const startIndex = time.findIndex((value) => value >= warmupExcludedMinutes * 60)
    const effectiveStartIndex = startIndex >= 0 ? startIndex : 0
    const samples = time
      .map((_, index) => ({ hr: hr[index], work: workload[index] }))
      .slice(effectiveStartIndex)
      .filter((sample) => sample.hr > 0 && sample.work > 0)

    if (samples.length >= 120) {
      const midpoint = Math.floor(samples.length / 2)
      const firstHalf = samples.slice(0, midpoint)
      const secondHalf = samples.slice(midpoint)
      const avgRatio = (segment: Array<{ hr: number; work: number }>) =>
        segment.reduce((sum, sample) => sum + sample.work / sample.hr, 0) / segment.length
      const firstRatio = avgRatio(firstHalf)
      const secondRatio = avgRatio(secondHalf)
      const effective = round(((firstRatio - secondRatio) / firstRatio) * 100, 1)
      const direction =
        effective === null
          ? 'unknown'
          : effective < -3
            ? 'efficiency_gain'
            : effective > 3
              ? 'positive_drift'
              : 'stable'
      return {
        valid: effective !== null,
        effective,
        direction,
        confidence: durationMinutes >= 75 ? 'high' : 'medium',
        steadyStateSegmentsAvailable: true
      }
    }
  }

  if (fallback === null) {
    return {
      valid: false,
      effective: null,
      direction: 'unknown' as const,
      confidence: 'low' as FactConfidence,
      steadyStateSegmentsAvailable: false
    }
  }

  return {
    valid: true,
    effective: fallback,
    direction:
      fallback < -3
        ? ('efficiency_gain' as const)
        : fallback > 3
          ? ('positive_drift' as const)
          : ('stable' as const),
    confidence: 'low' as FactConfidence,
    steadyStateSegmentsAvailable: durationMinutes >= 50
  }
}

function detectNormalHrLag(
  workout: any,
  family: ReturnType<typeof getWorkoutFamily>,
  hrUsable: boolean
) {
  if (!hrUsable || (family !== 'ride' && family !== 'run')) return false
  const time = asNumberArray(workout?.streams?.time)
  const watts = asNumberArray(workout?.streams?.watts)
  const hr = asNumberArray(workout?.streams?.heartrate)

  if (time.length === 0 || watts.length !== time.length || hr.length !== time.length) return false

  for (let index = 10; index < time.length - 20; index++) {
    const prevPower = watts[index - 1]
    const nextPower = watts[index]
    const jump = nextPower - prevPower
    if (jump < 60) continue
    const baselineHr = hr[index - 1]
    const immediateHr = hr[index]
    const laterIndex = Math.min(time.length - 1, index + 10)
    const laterHr = hr[laterIndex]
    if (baselineHr > 0 && immediateHr > 0 && laterHr > 0) {
      if (immediateHr - baselineHr <= 3 && laterHr - baselineHr >= 5) {
        return true
      }
    }
  }

  return false
}

function deriveLrBalance(workout: any) {
  const rawRightPct =
    workout?.lrBalance !== null && workout?.lrBalance !== undefined
      ? Number(workout.lrBalance)
      : null
  const unavailable = {
    sourceSemantics: 'unknown' as LrSourceSemantics,
    inversionSuspected: false,
    correctedLeftPct: null,
    correctedRightPct: null,
    interpretationMode: 'disabled' as LrInterpretationMode,
    correctionReason:
      rawRightPct === null ? 'No L/R balance data available.' : 'Unable to infer channel semantics.'
  }

  if (rawRightPct === null || !Number.isFinite(rawRightPct)) return unavailable

  const lower =
    `${workout?.deviceName || ''} ${workout?.title || ''} ${workout?.description || ''} ${workout?.source || ''}`.toLowerCase()
  const leftPct = 100 - rawRightPct
  const humanVsMotor = ['bulcan', 'bosch', 'cargo', 'e-bike', 'ebike'].some((token) =>
    lower.includes(token)
  )

  if (humanVsMotor) {
    const inversionSuspected = rawRightPct >= 60
    return {
      sourceSemantics: 'human_vs_motor' as LrSourceSemantics,
      inversionSuspected,
      correctedLeftPct: inversionSuspected ? round(rawRightPct, 1) : round(leftPct, 1),
      correctedRightPct: inversionSuspected ? round(leftPct, 1) : round(rawRightPct, 1),
      interpretationMode: inversionSuspected
        ? ('corrected' as LrInterpretationMode)
        : ('disabled' as LrInterpretationMode),
      correctionReason: inversionSuspected
        ? 'Cargo/e-bike semantics likely inverted. Swapped channels for inspection.'
        : 'Detected cargo/e-bike semantics; disabled biomechanical left/right interpretation.'
    }
  }

  return {
    sourceSemantics: 'true_left_right' as LrSourceSemantics,
    inversionSuspected: false,
    correctedLeftPct: round(leftPct, 1),
    correctedRightPct: round(rawRightPct, 1),
    interpretationMode: 'normal' as LrInterpretationMode,
    correctionReason: null
  }
}

function detectErg(workout: any, plannedWorkout: any) {
  const reasons: string[] = []
  const deviceContext = `${workout?.deviceName || ''} ${workout?.source || ''}`.toLowerCase()
  const hasExplicitHint =
    ['trainerroad', 'erg', 'wahoo systm', 'bkool'].some((token) => deviceContext.includes(token)) ||
    Boolean((workout?.rawJson as any)?.erg) ||
    Boolean((workout?.rawJson as any)?.erg_mode)

  if (hasExplicitHint) {
    reasons.push('Explicit trainer-control metadata detected.')
    return {
      detected: true,
      confidence: 'high' as FactConfidence,
      source: 'explicit' as ErgSource,
      powerControlMode: 'erg' as PowerControlMode,
      reasons
    }
  }

  const trainer = Boolean(workout?.trainer)
  const targetPower = asNumberArray(workout?.streams?.targetPower)
  const watts = asNumberArray(workout?.streams?.watts)
  const cadence = asNumberArray(workout?.streams?.cadence)
  const hasStructuredPlan = Boolean(plannedWorkout?.structuredWorkout)

  if (!trainer) {
    return {
      detected: false,
      confidence: 'low' as FactConfidence,
      source: 'unknown' as ErgSource,
      powerControlMode: 'unknown' as PowerControlMode,
      reasons: ['Indoor trainer flag not present.']
    }
  }

  if (targetPower.length > 30 && watts.length === targetPower.length) {
    const active = targetPower
      .map((target, index) => ({ target, actual: watts[index] }))
      .filter((entry) => entry.target > 0 && entry.actual > 0)
    if (active.length >= 30) {
      const meanAbsPctError =
        active.reduce(
          (sum, entry) => sum + Math.abs(entry.actual - entry.target) / entry.target,
          0
        ) / active.length
      const avgPower = active.reduce((sum, entry) => sum + entry.actual, 0) / active.length
      const variance =
        active.reduce((sum, entry) => sum + Math.pow(entry.actual - avgPower, 2), 0) / active.length
      const cov = avgPower > 0 ? Math.sqrt(variance) / avgPower : 1
      const cadenceSpread =
        cadence.length === watts.length ? Math.max(...cadence) - Math.min(...cadence) : 0

      if (meanAbsPctError <= 0.06 && cov <= 0.08) {
        reasons.push('Target power stream and actual power stay tightly locked.')
        if (cadenceSpread >= 8) {
          reasons.push('Cadence varied while power remained pinned to target.')
        }
        return {
          detected: true,
          confidence:
            meanAbsPctError <= 0.04 ? ('high' as FactConfidence) : ('medium' as FactConfidence),
          source: 'inferred' as ErgSource,
          powerControlMode: 'erg' as PowerControlMode,
          reasons
        }
      }
    }
  }

  if (trainer && hasStructuredPlan) {
    reasons.push('Indoor trainer with structured workout context detected.')
    return {
      detected: false,
      confidence: 'low' as FactConfidence,
      source: 'inferred' as ErgSource,
      powerControlMode: 'resistance' as PowerControlMode,
      reasons
    }
  }

  return {
    detected: false,
    confidence: 'low' as FactConfidence,
    source: 'unknown' as ErgSource,
    powerControlMode: trainer
      ? ('resistance' as PowerControlMode)
      : ('unknown' as PowerControlMode),
    reasons: ['No reliable ERG signature detected.']
  }
}

export function buildWorkoutAnalysisFacts({
  workout,
  sportSettings,
  plannedWorkout,
  userProfile
}: BuildWorkoutAnalysisFactsOptions): WorkoutAnalysisFacts {
  const computedFrom = ['workout.summary']
  const unavailableInputs: string[] = []
  const disabledInterpretations: string[] = []

  if (workout?.rawJson) computedFrom.push('workout.rawJson')
  else unavailableInputs.push('workout.rawJson')

  if (workout?.streams) computedFrom.push('workout.streams')
  else unavailableInputs.push('workout.streams')

  if (plannedWorkout) computedFrom.push('plannedWorkout')
  else unavailableInputs.push('plannedWorkout')

  if (sportSettings) computedFrom.push('sportSettings')
  else unavailableInputs.push('sportSettings')

  if (userProfile) computedFrom.push('userProfile')
  else unavailableInputs.push('userProfile')

  const family = getWorkoutFamily(workout?.type)
  const impactProfile = inferImpactProfile(family)
  const rpe = workout?.sessionRpe ?? workout?.rpe ?? null
  const durationMinutes = Math.round((workout?.durationSec || 0) / 60)
  const sessionRpeLoad = rpe ? rpe * durationMinutes : null
  const objectiveLoad =
    workout?.trainingLoad ?? workout?.tss ?? (workout?.kilojoules ? workout.kilojoules / 4 : null)
  const subjectiveObjectiveGap = deriveSubjectiveObjectiveGap(sessionRpeLoad, objectiveLoad)
  const musculoskeletalToll = deriveMusculoskeletalToll({
    impactProfile,
    sessionRpeLoad,
    objectiveLoad
  })

  const hrStats = getHrStats(workout)
  if (!hrStats.usable) {
    disabledInterpretations.push(
      'Heart-rate-derived analysis disabled because HR telemetry is missing or artifact-prone.'
    )
  }

  const powerSourceType = inferPowerSourceType(workout, family)
  const powerAbsoluteUsable = powerSourceType === 'measured'
  const powerRelativeUsable =
    powerSourceType !== 'unknown' ||
    Boolean(workout?.averageWatts) ||
    Boolean(workout?.normalizedPower) ||
    asNumberArray(workout?.streams?.watts).length > 0
  if (!powerAbsoluteUsable && powerRelativeUsable) {
    disabledInterpretations.push(
      'Absolute power benchmarking disabled because available power is estimated or uncertain.'
    )
  }

  const hasPace =
    Boolean(workout?.averageSpeed) || asNumberArray(workout?.streams?.velocity).length > 0
  const analysisMode = getAnalysisMode({
    family,
    powerSourceType,
    hrUsable: hrStats.usable,
    hasPace,
    hasRpe: Boolean(rpe)
  })

  const warmupExcludedMinutes = clamp(Number(sportSettings?.warmupTime || 10), 10, 15)
  const decoupling = deriveDecoupling(workout, hrStats.usable, warmupExcludedMinutes)
  if (!decoupling.valid) {
    disabledInterpretations.push(
      'Decoupling interpretation disabled because the workout lacks enough reliable steady-state HR/work data.'
    )
  }

  const normalHrLagExpected = family === 'ride' || family === 'run'
  const normalHrLagDetected = detectNormalHrLag(workout, family, hrStats.usable)

  const lrBalance = deriveLrBalance(workout)
  if (lrBalance.interpretationMode === 'disabled') {
    disabledInterpretations.push(
      lrBalance.correctionReason || 'L/R balance interpretation disabled.'
    )
  }
  if (lrBalance.interpretationMode === 'corrected') {
    disabledInterpretations.push('L/R balance channels were corrected before interpretation.')
  }

  const erg = detectErg(workout, plannedWorkout)
  if (erg.detected) {
    disabledInterpretations.push(
      'Pacing discipline should be interpreted with ERG trainer control in mind.'
    )
  }

  const facts: WorkoutAnalysisFacts = {
    subjective: {
      rpe: rpe ?? null,
      sessionRpeLoad: sessionRpeLoad ?? null,
      subjectiveObjectiveGap,
      musculoskeletalToll,
      impactProfile
    },
    telemetry: {
      analysisMode,
      hrUsable: hrStats.usable,
      hrZeroRatio: hrStats.zeroRatio,
      hrMissingRatio: hrStats.missingRatio,
      hrArtifactFlag: hrStats.artifactFlag,
      powerSourceType,
      powerAbsoluteUsable,
      powerRelativeUsable,
      lrBalanceUsable: lrBalance.interpretationMode !== 'disabled'
    },
    physiology: {
      normalHrLagExpected,
      normalHrLagDetected,
      steadyStateSegmentsAvailable: decoupling.steadyStateSegmentsAvailable,
      warmupExcludedMinutes,
      decouplingValid: decoupling.valid,
      decouplingEffective: decoupling.effective,
      decouplingDirection: decoupling.direction,
      decouplingConfidence: decoupling.confidence
    },
    lrBalance,
    erg,
    debugMeta: {
      factVersion: 'v1',
      computedFrom,
      unavailableInputs,
      disabledInterpretations,
      promptDecisions: {}
    }
  }

  facts.debugMeta.promptDecisions = buildPromptDecisions(facts)
  return facts
}

function buildPromptDecisions(facts: WorkoutAnalysisFacts): Record<string, PromptDecision> {
  const disabledInterpretationsText = facts.debugMeta.disabledInterpretations.join(' ')
  const decisions: Record<string, PromptDecision> = {}
  const set = (path: string, include: boolean, reason: string) => {
    decisions[path] = { include, reason }
  }

  set(
    'subjective.rpe',
    facts.subjective.rpe !== null,
    facts.subjective.rpe !== null
      ? 'Subjective effort is present and helps anchor athlete-reported load.'
      : 'No reported RPE is available for this workout.'
  )
  set(
    'subjective.sessionRpeLoad',
    facts.subjective.sessionRpeLoad !== null,
    facts.subjective.sessionRpeLoad !== null
      ? 'Total subjective session load is available and useful for prompt context.'
      : 'Session RPE load cannot be derived without RPE.'
  )
  set(
    'subjective.subjectiveObjectiveGap',
    facts.subjective.subjectiveObjectiveGap !== 'unknown',
    facts.subjective.subjectiveObjectiveGap !== 'unknown'
      ? 'Useful when subjective load can be compared against objective load.'
      : 'No meaningful subjective-objective comparison is available.'
  )
  set(
    'subjective.musculoskeletalToll',
    facts.subjective.musculoskeletalToll !== 'unknown',
    facts.subjective.musculoskeletalToll !== 'unknown'
      ? 'Adds non-cardiac session toll context for interpretation.'
      : 'No reliable musculoskeletal toll estimate is available.'
  )
  set(
    'subjective.impactProfile',
    true,
    'Sport impact profile is stable context and helps frame subjective load.'
  )

  set('telemetry.analysisMode', true, 'Primary analysis mode should always guide prompt emphasis.')
  set(
    'telemetry.hrUsable',
    true,
    facts.telemetry.hrUsable
      ? 'Prompt should know HR is safe to use.'
      : 'Prompt should know HR-derived reasoning must be suppressed.'
  )
  set(
    'telemetry.hrZeroRatio',
    facts.telemetry.hrZeroRatio !== null && !facts.telemetry.hrUsable,
    facts.telemetry.hrZeroRatio !== null && !facts.telemetry.hrUsable
      ? 'Zero-rate evidence explains why HR is being suppressed.'
      : 'Zero-rate summary adds little when HR is usable or no HR stream exists.'
  )
  set(
    'telemetry.hrMissingRatio',
    facts.telemetry.hrMissingRatio !== null && !facts.telemetry.hrUsable,
    facts.telemetry.hrMissingRatio !== null && !facts.telemetry.hrUsable
      ? 'Missing-rate evidence explains why HR is being suppressed.'
      : 'Missing-rate summary adds little when HR is usable or no HR stream exists.'
  )
  set(
    'telemetry.hrArtifactFlag',
    !facts.telemetry.hrUsable || facts.telemetry.hrArtifactFlag,
    !facts.telemetry.hrUsable || facts.telemetry.hrArtifactFlag
      ? 'Prompt should know HR artifacts were detected.'
      : 'Artifact flag adds no value when HR telemetry is clean.'
  )
  set(
    'telemetry.powerSourceType',
    facts.telemetry.powerSourceType !== 'unknown',
    facts.telemetry.powerSourceType !== 'unknown'
      ? 'Prompt should know whether power is measured or estimated.'
      : 'No trustworthy power provenance is available.'
  )
  set(
    'telemetry.powerAbsoluteUsable',
    facts.telemetry.powerSourceType !== 'unknown',
    facts.telemetry.powerSourceType !== 'unknown'
      ? 'Prompt should know whether absolute power comparisons are safe.'
      : 'No power source is available, so absolute-use status is not meaningful.'
  )
  set(
    'telemetry.powerRelativeUsable',
    facts.telemetry.powerSourceType !== 'unknown' || facts.telemetry.powerRelativeUsable,
    facts.telemetry.powerSourceType !== 'unknown' || facts.telemetry.powerRelativeUsable
      ? 'Prompt should know if power can still be used for relative comparison.'
      : 'No usable power context is available.'
  )
  set(
    'telemetry.lrBalanceUsable',
    true,
    facts.telemetry.lrBalanceUsable
      ? 'Prompt should know L/R balance can be interpreted.'
      : 'Prompt should know L/R balance must be ignored.'
  )

  set(
    'physiology.normalHrLagExpected',
    facts.telemetry.hrUsable && facts.physiology.normalHrLagExpected,
    facts.telemetry.hrUsable && facts.physiology.normalHrLagExpected
      ? 'Useful context to prevent false sensor-error interpretations.'
      : 'HR lag expectation is not meaningful without usable HR.'
  )
  set(
    'physiology.normalHrLagDetected',
    facts.telemetry.hrUsable && facts.physiology.normalHrLagDetected,
    facts.telemetry.hrUsable && facts.physiology.normalHrLagDetected
      ? 'Prompt should know the workout shows normal delayed HR kinetics.'
      : 'No detected HR lag signal needs to be explained.'
  )
  set(
    'physiology.steadyStateSegmentsAvailable',
    facts.physiology.steadyStateSegmentsAvailable,
    facts.physiology.steadyStateSegmentsAvailable
      ? 'Useful to support durability and decoupling interpretation.'
      : 'No steady-state segment support is available.'
  )
  set(
    'physiology.warmupExcludedMinutes',
    facts.physiology.decouplingValid,
    facts.physiology.decouplingValid
      ? 'Warm-up exclusion matters because decoupling is being considered.'
      : 'Warm-up exclusion adds no value when decoupling is ignored.'
  )
  set(
    'physiology.decouplingValid',
    true,
    facts.physiology.decouplingValid
      ? 'Prompt should know decoupling is safe to discuss.'
      : 'Prompt should know decoupling must be ignored.'
  )
  set(
    'physiology.decouplingEffective',
    facts.physiology.decouplingValid && facts.physiology.decouplingEffective !== null,
    facts.physiology.decouplingValid && facts.physiology.decouplingEffective !== null
      ? 'Effective decoupling adds actionable physiology context.'
      : 'No valid effective decoupling value is available.'
  )
  set(
    'physiology.decouplingDirection',
    facts.physiology.decouplingValid && facts.physiology.decouplingDirection !== 'unknown',
    facts.physiology.decouplingValid && facts.physiology.decouplingDirection !== 'unknown'
      ? 'Direction is useful when decoupling is valid.'
      : 'Direction is not meaningful without valid decoupling.'
  )
  set(
    'physiology.decouplingConfidence',
    facts.physiology.decouplingValid,
    facts.physiology.decouplingValid
      ? 'Confidence level helps the prompt calibrate how strongly to use decoupling.'
      : 'Confidence is not useful when decoupling is ignored.'
  )

  set(
    'lrBalance.sourceSemantics',
    facts.lrBalance.sourceSemantics !== 'unknown',
    facts.lrBalance.sourceSemantics !== 'unknown'
      ? 'Prompt should know what the balance channels likely represent.'
      : 'Unknown L/R semantics do not add useful prompt information.'
  )
  set(
    'lrBalance.inversionSuspected',
    facts.lrBalance.inversionSuspected,
    facts.lrBalance.inversionSuspected
      ? 'Prompt should know the channels may be inverted.'
      : 'No inversion signal was detected.'
  )
  set(
    'lrBalance.correctedLeftPct',
    facts.lrBalance.correctedLeftPct !== null && facts.telemetry.lrBalanceUsable,
    facts.lrBalance.correctedLeftPct !== null && facts.telemetry.lrBalanceUsable
      ? 'Corrected left percentage is usable for prompt interpretation.'
      : 'No meaningful corrected left percentage is available.'
  )
  set(
    'lrBalance.correctedRightPct',
    facts.lrBalance.correctedRightPct !== null && facts.telemetry.lrBalanceUsable,
    facts.lrBalance.correctedRightPct !== null && facts.telemetry.lrBalanceUsable
      ? 'Corrected right percentage is usable for prompt interpretation.'
      : 'No meaningful corrected right percentage is available.'
  )
  set(
    'lrBalance.interpretationMode',
    true,
    facts.lrBalance.interpretationMode === 'disabled'
      ? 'Prompt should know L/R balance is intentionally ignored.'
      : 'Prompt should know how L/R balance should be handled.'
  )
  set(
    'lrBalance.correctionReason',
    Boolean(facts.lrBalance.correctionReason),
    facts.lrBalance.correctionReason
      ? 'This explains why L/R balance was corrected or disabled.'
      : 'No correction explanation is available.'
  )

  set(
    'erg.detected',
    true,
    facts.erg.detected
      ? 'Prompt should know ERG was detected so pacing discipline is not overstated.'
      : 'Prompt should know no reliable ERG signature was found.'
  )
  set(
    'erg.confidence',
    facts.erg.source !== 'unknown' || facts.erg.detected,
    facts.erg.source !== 'unknown' || facts.erg.detected
      ? 'Confidence helps calibrate how strongly ERG inference should influence analysis.'
      : 'Confidence is not useful without a meaningful ERG signal.'
  )
  set(
    'erg.source',
    facts.erg.source !== 'unknown',
    facts.erg.source !== 'unknown'
      ? 'Prompt should know whether ERG came from explicit metadata or inference.'
      : 'ERG source is unknown and does not add useful context.'
  )
  set(
    'erg.powerControlMode',
    facts.erg.powerControlMode !== 'unknown',
    facts.erg.powerControlMode !== 'unknown'
      ? 'Prompt should know likely trainer control mode when available.'
      : 'No trainer control mode can be inferred.'
  )
  set(
    'erg.reasons',
    facts.erg.reasons.length > 0 && (facts.erg.detected || facts.erg.source !== 'unknown'),
    facts.erg.reasons.length > 0 && (facts.erg.detected || facts.erg.source !== 'unknown')
      ? 'Short reasons make the ERG decision auditable in the prompt.'
      : 'No meaningful ERG rationale needs to be included.'
  )

  set(
    'debugMeta.computedFrom',
    false,
    'Implementation/debug provenance should stay out of the AI prompt.'
  )
  set(
    'debugMeta.unavailableInputs',
    false,
    'Missing-input inventory is for debugging, not model context.'
  )
  set(
    'debugMeta.disabledInterpretations',
    disabledInterpretationsText.length > 0,
    disabledInterpretationsText.length > 0
      ? 'Prompt should receive the final interpretation suppressions, not all raw debug provenance.'
      : 'No disabled interpretations need to be communicated.'
  )

  return decisions
}
