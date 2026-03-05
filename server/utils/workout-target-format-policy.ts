export type HeartRateTargetFormat = 'percentLthr' | 'percentMaxHr' | 'zone' | 'bpm'
export type PowerTargetFormat = 'percentFtp' | 'zone' | 'watts'
export type PaceTargetFormat = 'percentPace' | 'zone' | 'absolutePace'
export type CadenceTargetFormat = 'none' | 'rpm' | 'rpmRange'

export interface TargetFormatPolicy {
  heartRate: {
    mode: HeartRateTargetFormat
    preferRange: boolean
  }
  power: {
    mode: PowerTargetFormat
    preferRange: boolean
  }
  pace: {
    mode: PaceTargetFormat
    preferRange: boolean
  }
  cadence: {
    mode: CadenceTargetFormat
  }
}

const DEFAULT_TARGET_FORMAT_POLICY: TargetFormatPolicy = {
  heartRate: { mode: 'percentLthr', preferRange: true },
  power: { mode: 'percentFtp', preferRange: true },
  pace: { mode: 'percentPace', preferRange: true },
  cadence: { mode: 'rpm' }
}

function isHeartRateMode(value: unknown): value is HeartRateTargetFormat {
  return ['percentLthr', 'percentMaxHr', 'zone', 'bpm'].includes(String(value))
}

function isPowerMode(value: unknown): value is PowerTargetFormat {
  return ['percentFtp', 'zone', 'watts'].includes(String(value))
}

function isPaceMode(value: unknown): value is PaceTargetFormat {
  return ['percentPace', 'zone', 'absolutePace'].includes(String(value))
}

function isCadenceMode(value: unknown): value is CadenceTargetFormat {
  return ['none', 'rpm', 'rpmRange'].includes(String(value))
}

export function normalizeTargetFormatPolicy(raw: any): TargetFormatPolicy {
  const heartRateMode = isHeartRateMode(raw?.heartRate?.mode)
    ? raw.heartRate.mode
    : DEFAULT_TARGET_FORMAT_POLICY.heartRate.mode
  const powerMode = isPowerMode(raw?.power?.mode)
    ? raw.power.mode
    : DEFAULT_TARGET_FORMAT_POLICY.power.mode
  const paceMode = isPaceMode(raw?.pace?.mode)
    ? raw.pace.mode
    : DEFAULT_TARGET_FORMAT_POLICY.pace.mode
  const cadenceMode = isCadenceMode(raw?.cadence?.mode)
    ? raw.cadence.mode
    : DEFAULT_TARGET_FORMAT_POLICY.cadence.mode

  return {
    heartRate: {
      mode: heartRateMode,
      preferRange:
        typeof raw?.heartRate?.preferRange === 'boolean'
          ? raw.heartRate.preferRange
          : DEFAULT_TARGET_FORMAT_POLICY.heartRate.preferRange
    },
    power: {
      mode: powerMode,
      preferRange:
        typeof raw?.power?.preferRange === 'boolean'
          ? raw.power.preferRange
          : DEFAULT_TARGET_FORMAT_POLICY.power.preferRange
    },
    pace: {
      mode: paceMode,
      preferRange:
        typeof raw?.pace?.preferRange === 'boolean'
          ? raw.pace.preferRange
          : DEFAULT_TARGET_FORMAT_POLICY.pace.preferRange
    },
    cadence: { mode: cadenceMode }
  }
}
