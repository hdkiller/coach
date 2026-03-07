<template>
  <div class="mini-chart-container h-8 w-24 relative">
    <div class="absolute inset-0 flex items-end gap-px">
      <div
        v-for="(step, index) in steps"
        :key="index"
        :style="getStepContainerStyle(step)"
        class="h-full flex items-end"
      >
        <UTooltip :text="tooltipText(step)" :popper="{ placement: 'top' }" class="h-full w-full">
          <div class="rounded-xs w-full" :style="getStepStyle(step)" />
        </UTooltip>
      </div>
    </div>

    <svg
      v-if="showCadenceLine"
      class="absolute inset-0 pointer-events-none z-10"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        :d="cadencePaths.merged"
        fill="none"
        stroke="#93c5fd"
        stroke-width="1.5"
        stroke-dasharray="3,2"
        class="opacity-90"
      />
      <path
        :d="cadencePaths.explicit"
        fill="none"
        stroke="white"
        stroke-width="1.5"
        class="opacity-85"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
  import { ZONE_COLORS, FALLBACK_ZONE_COLOR } from '~/utils/zone-colors'

  const props = withDefaults(
    defineProps<{
      workout: any // structuredWorkout JSON or full planned workout row
      preference?: 'hr' | 'power' | 'pace'
      showCadence?: boolean
      sportSettings?: any
    }>(),
    {
      preference: 'power',
      showCadence: false,
      sportSettings: undefined
    }
  )

  const normalizedWorkout = computed(() => {
    const workout = props.workout
    if (!workout) return null
    if (typeof workout === 'string') {
      try {
        return JSON.parse(workout)
      } catch {
        return null
      }
    }
    if (workout?.structuredWorkout && typeof workout.structuredWorkout === 'object') {
      return {
        ...workout.structuredWorkout,
        _workoutContext: workout
      }
    }
    return workout
  })

  const steps = computed(() => {
    const rawSteps = normalizedWorkout.value?.steps
    if (!Array.isArray(rawSteps) || rawSteps.length === 0) return []
    return flattenWorkoutSteps(rawSteps)
  })

  function flattenWorkoutSteps(steps: any[], depth = 0): any[] {
    if (!Array.isArray(steps)) return []

    const flattened: any[] = []

    steps.forEach((step: any) => {
      const children = Array.isArray(step.steps) ? step.steps : []
      const hasChildren = children.length > 0

      if (hasChildren) {
        const repsRaw = Number(step.reps ?? step.repeat ?? step.intervals)
        const reps = repsRaw > 1 ? repsRaw : 1
        for (let i = 0; i < reps; i++) {
          flattened.push(...flattenWorkoutSteps(children, depth + 1))
        }
        return
      }

      flattened.push({
        ...step,
        _depth: depth
      })
    })

    return flattened
  }

  const totalDuration = computed(() => {
    return steps.value.reduce((sum: number, step: any) => sum + getStepDuration(step), 0)
  })

  const effectiveSportSettings = computed(() => {
    const source =
      props.sportSettings ||
      normalizedWorkout.value?._workoutContext?.lastGenerationSettingsSnapshot ||
      normalizedWorkout.value?._workoutContext?.generationSettingsSnapshot ||
      normalizedWorkout.value?._workoutContext?.createdFromSettingsSnapshot ||
      null

    if (!source) return null

    return {
      ftp: Number(source?.ftp || source?.thresholds?.ftp || 0),
      lthr: Number(source?.lthr || source?.thresholds?.lthr || 0),
      thresholdPace: Number(source?.thresholdPace || source?.thresholds?.thresholdPace || 0),
      hrZones: Array.isArray(source?.hrZones)
        ? source.hrZones
        : Array.isArray(source?.zones?.heartRate)
          ? source.zones.heartRate
          : [],
      powerZones: Array.isArray(source?.powerZones)
        ? source.powerZones
        : Array.isArray(source?.zones?.power)
          ? source.zones.power
          : [],
      paceZones: Array.isArray(source?.paceZones)
        ? source.paceZones
        : Array.isArray(source?.zones?.pace)
          ? source.zones.pace
          : []
    }
  })

  const defaultZoneRanges: Array<{ start: number; end: number; color: string }> = [
    { start: 0, end: 0.55, color: ZONE_COLORS[0] },
    { start: 0.55, end: 0.75, color: ZONE_COLORS[1] },
    { start: 0.75, end: 0.9, color: ZONE_COLORS[2] },
    { start: 0.9, end: 1.05, color: ZONE_COLORS[3] },
    { start: 1.05, end: 1.2, color: ZONE_COLORS[4] },
    { start: 1.2, end: 1.5, color: ZONE_COLORS[5] },
    { start: 1.5, end: 2, color: ZONE_COLORS[6] }
  ]

  const resolvedZoneRanges = computed(() => {
    if (props.preference === 'power') {
      const ftp = Number(effectiveSportSettings.value?.ftp || 0)
      const powerZones = Array.isArray(effectiveSportSettings.value?.powerZones)
        ? effectiveSportSettings.value.powerZones
        : []
      if (ftp > 0 && powerZones.length > 0) {
        return powerZones.map((zone: any, index: number) => ({
          start: Number(zone?.min || 0) / ftp,
          end: Number(zone?.max || 0) / ftp,
          color: ZONE_COLORS[index] || FALLBACK_ZONE_COLOR
        }))
      }
    }

    if (props.preference === 'hr') {
      const lthr = Number(effectiveSportSettings.value?.lthr || 0)
      const hrZones = Array.isArray(effectiveSportSettings.value?.hrZones)
        ? effectiveSportSettings.value.hrZones
        : []
      if (lthr > 0 && hrZones.length > 0) {
        return hrZones.map((zone: any, index: number) => ({
          start: Number(zone?.min || 0) / lthr,
          end: Number(zone?.max || 0) / lthr,
          color: ZONE_COLORS[index] || FALLBACK_ZONE_COLOR
        }))
      }
    }

    if (props.preference === 'pace') {
      const thresholdPace = Number(effectiveSportSettings.value?.thresholdPace || 0)
      const paceZones = Array.isArray(effectiveSportSettings.value?.paceZones)
        ? effectiveSportSettings.value.paceZones
        : []
      if (thresholdPace > 0 && paceZones.length > 0) {
        return paceZones.map((zone: any, index: number) => ({
          start: Number(zone?.min || 0) / thresholdPace,
          end: Number(zone?.max || 0) / thresholdPace,
          color: ZONE_COLORS[index] || FALLBACK_ZONE_COLOR
        }))
      }
    }

    return defaultZoneRanges
  })

  const showCadenceLine = computed(() => {
    if (!props.showCadence) return false
    return steps.value.some((step: any) => Number(step?.cadence) > 0)
  })

  const cadencePaths = computed(() => {
    if (!showCadenceLine.value || totalDuration.value <= 0 || steps.value.length === 0) {
      return { merged: '', explicit: '' }
    }

    let mergedPath = ''
    let explicitPath = ''
    let currentTime = 0

    steps.value.forEach((step: any) => {
      const stepDuration = Number(step.durationSeconds || step.duration || 0)
      if (stepDuration <= 0) return

      const cadenceMeta = getStepCadenceMeta(step)
      const startX = (currentTime / totalDuration.value) * 100
      const endX = ((currentTime + stepDuration) / totalDuration.value) * 100

      const clampedCadence = Math.max(0, Math.min(cadenceMeta.value, 120))
      const y = 100 - (clampedCadence / 120) * 100

      if (mergedPath === '') {
        mergedPath = `M ${startX} ${y} L ${endX} ${y}`
      } else {
        mergedPath += ` L ${startX} ${y} L ${endX} ${y}`
      }

      if (!cadenceMeta.inferred) {
        if (explicitPath === '') {
          explicitPath = `M ${startX} ${y} L ${endX} ${y}`
        } else {
          explicitPath += ` L ${startX} ${y} L ${endX} ${y}`
        }
      }

      currentTime += stepDuration
    })

    return { merged: mergedPath, explicit: explicitPath }
  })

  function getStepWidth(step: any) {
    const duration = getStepDuration(step)
    if (totalDuration.value > 0) return (duration / totalDuration.value) * 100
    if (steps.value.length > 0) return 100 / steps.value.length
    return 0
  }

  function getStepContainerStyle(step: any) {
    const width = getStepWidth(step)
    return {
      width: `${width}%`,
      flex: `0 0 ${width}%`
    }
  }

  function getStepStyle(step: any) {
    const color = getStepColor(step)
    const maxScale = 1.2 // 120% is top of chart

    const range = getStepRange(step)

    const isRamp = Boolean(
      step.ramp === true || step.power?.ramp || step.heartRate?.ramp || step.pace?.ramp
    )

    if (range && isRamp) {
      const startH = Math.max(Math.min(range.start / maxScale, 1) * 100, 10)
      const endH = Math.max(Math.min(range.end / maxScale, 1) * 100, 10)

      return {
        height: '100%',
        width: '100%',
        backgroundColor: color,
        clipPath: `polygon(0% ${100 - startH}%, 100% ${100 - endH}%, 100% 100%, 0% 100%)`
      }
    }

    // Steady range (block at midpoint)
    if (range && !isRamp) {
      const val = (range.start + range.end) / 2
      const height = Math.min((val * 100) / maxScale, 100)
      return {
        height: `${Math.max(height, 10)}%`,
        width: '100%',
        backgroundColor: color
      }
    }

    // Flat intensity support
    const value = getStepIntensity(step)

    const height = Math.min((value * 100) / maxScale, 100)
    return {
      height: `${Math.max(height, 10)}%`, // Minimum height for visibility
      width: '100%',
      backgroundColor: color
    }
  }

  function getStepColor(step: any): string {
    const intensity = getStepIntensity(step)
    const zone =
      resolvedZoneRanges.value.find((range) => intensity <= range.end) ||
      resolvedZoneRanges.value[resolvedZoneRanges.value.length - 1]
    return zone?.color || FALLBACK_ZONE_COLOR
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    return `${mins}m`
  }

  function tooltipText(step: any): string {
    const base = `${step.name}: ${formatDuration(getStepDuration(step))}`
    const cadenceMeta = getStepCadenceMeta(step)
    if (cadenceMeta.value > 0) {
      return cadenceMeta.inferred
        ? `${base} @ ${Math.round(cadenceMeta.value)} rpm (inferred)`
        : `${base} @ ${Math.round(cadenceMeta.value)} rpm`
    }
    return base
  }

  function getStepCadenceMeta(step: any): { value: number; inferred: boolean } {
    const cadenceRangeStart = Number(step?.cadenceRange?.start)
    const cadenceRangeEnd = Number(step?.cadenceRange?.end)
    if (
      Number.isFinite(cadenceRangeStart) &&
      cadenceRangeStart > 0 &&
      Number.isFinite(cadenceRangeEnd) &&
      cadenceRangeEnd > 0
    ) {
      return { value: (cadenceRangeStart + cadenceRangeEnd) / 2, inferred: false }
    }

    const cadenceObjectValue = Number(step?.cadence?.value)
    if (Number.isFinite(cadenceObjectValue) && cadenceObjectValue > 0) {
      return { value: cadenceObjectValue, inferred: false }
    }

    const cadenceObjectStart = Number(step?.cadence?.start)
    const cadenceObjectEnd = Number(step?.cadence?.end)
    if (
      Number.isFinite(cadenceObjectStart) &&
      cadenceObjectStart > 0 &&
      Number.isFinite(cadenceObjectEnd) &&
      cadenceObjectEnd > 0
    ) {
      return { value: (cadenceObjectStart + cadenceObjectEnd) / 2, inferred: false }
    }

    const explicit = Number(step?.cadence)
    if (Number.isFinite(explicit) && explicit > 0) {
      return { value: explicit, inferred: false }
    }

    const intensity = getStepIntensity(step)
    if (step?.type === 'Rest') return { value: 85, inferred: true }
    if (step?.type === 'Cooldown') return { value: 85, inferred: true }
    if (step?.type === 'Warmup') return { value: 88, inferred: true }
    if (intensity >= 0.95) return { value: 90, inferred: true }
    if (intensity >= 0.8) return { value: 88, inferred: true }
    if (intensity >= 0.65) return { value: 90, inferred: true }
    return { value: 85, inferred: true }
  }

  function getStepIntensity(step: any): number {
    const power = normalizePowerTarget(step?.power)
    const hr = normalizeHrTarget(step?.heartRate)
    const pace = getRelativePaceTarget(step?.pace)

    const powerValue = getTargetValue(power)
    const hrValue = getTargetValue(hr)
    const paceValue = getTargetValue(pace)

    if (props.preference === 'power' && powerValue !== undefined) return powerValue
    if (props.preference === 'hr' && hrValue !== undefined) return hrValue
    if (props.preference === 'pace' && paceValue !== undefined) return paceValue

    if (powerValue !== undefined) return powerValue
    if (hrValue !== undefined) return hrValue
    if (paceValue !== undefined) return paceValue

    if (step?.type === 'Rest') return 0.55
    return 0.75
  }

  function getStepRange(step: any): { start: number; end: number } | null {
    if (props.preference === 'power') return normalizePowerTarget(step?.power)?.range || null
    if (props.preference === 'hr') return normalizeHrTarget(step?.heartRate)?.range || null
    if (props.preference === 'pace') return getRelativePaceTarget(step?.pace)?.range || null

    return (
      normalizePowerTarget(step?.power)?.range ||
      normalizeHrTarget(step?.heartRate)?.range ||
      getRelativePaceTarget(step?.pace)?.range ||
      null
    )
  }

  function getTargetValue(
    target: { value?: number; range?: { start: number; end: number } } | null
  ) {
    if (!target) return undefined
    if (typeof target.value === 'number') return target.value
    if (target.range) return (target.range.start + target.range.end) / 2
    return undefined
  }

  function normalizeTarget(target: any): {
    value?: number
    range?: { start: number; end: number }
    ramp?: boolean
    units?: string
  } | null {
    if (target === null || target === undefined) return null

    if (typeof target === 'number') {
      return { value: target }
    }

    if (typeof target === 'object') {
      if (target.range && typeof target.range === 'object') {
        return {
          range: {
            start: Number(target.range.start) || 0,
            end: Number(target.range.end) || 0
          },
          ramp: target.ramp,
          units: typeof target.units === 'string' ? target.units : target.range.units
        }
      }
      if (target.value !== undefined) {
        return {
          value: Number(target.value) || 0,
          units: typeof target.units === 'string' ? target.units : undefined
        }
      }
    }

    return null
  }

  function getHeartRateReference() {
    return Number(effectiveSportSettings.value?.lthr || 0) || 200
  }

  function getPowerReference() {
    return Number(effectiveSportSettings.value?.ftp || 0) || 0
  }

  function getHrZoneBoundsByIndex(indexRaw: number): { start: number; end: number } | null {
    const index = Math.max(1, Math.round(indexRaw))
    const zones = Array.isArray(effectiveSportSettings.value?.hrZones)
      ? effectiveSportSettings.value.hrZones
      : []
    const zone = zones[index - 1]
    if (zone && Number.isFinite(Number(zone.min)) && Number.isFinite(Number(zone.max))) {
      return { start: Number(zone.min), end: Number(zone.max) }
    }
    return null
  }

  function toNormalizedHeartRate(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0
    if (value <= 3) return value
    return value / getHeartRateReference()
  }

  function getPaceZoneBoundsByIndex(indexRaw: number): { start: number; end: number } | null {
    const index = Math.max(1, Math.round(indexRaw))
    const zones = Array.isArray(effectiveSportSettings.value?.paceZones)
      ? effectiveSportSettings.value?.paceZones
      : []
    const zone = zones[index - 1]
    if (zone && Number.isFinite(Number(zone.min)) && Number.isFinite(Number(zone.max))) {
      return { start: Number(zone.min), end: Number(zone.max) }
    }
    return null
  }

  function paceValueToMps(value: number, units?: string): number | null {
    if (!Number.isFinite(value) || value <= 0) return null
    const normalizedUnits = String(units || '')
      .trim()
      .toLowerCase()
    const thresholdPace = Number(effectiveSportSettings.value?.thresholdPace || 0)

    if (normalizedUnits.includes('/km')) {
      const secondsPerKm = value * 60
      return secondsPerKm > 0 ? 1000 / secondsPerKm : null
    }

    if (normalizedUnits === 'm/s') return value
    if (value > 1.5 && value < 8) return value

    if (thresholdPace > 0) {
      if (value > 3) return value / thresholdPace
      return value * thresholdPace
    }

    return null
  }

  function normalizePaceTarget(
    target: { value?: number; range?: { start: number; end: number }; units?: string } | null
  ): { value?: number; range?: { start: number; end: number }; units?: string } | null {
    if (!target) return null
    const units = String(target.units || '')
      .trim()
      .toLowerCase()

    if (units === 'pace_zone' || units === 'zone') {
      if (target.range) {
        const startZone = getPaceZoneBoundsByIndex(target.range.start)
        const endZone = getPaceZoneBoundsByIndex(target.range.end)
        if (startZone && endZone) {
          return {
            range: {
              start: startZone.start,
              end: endZone.end
            },
            units: 'm/s'
          }
        }
      }
      if (typeof target.value === 'number') {
        const zoneBounds = getPaceZoneBoundsByIndex(target.value)
        if (zoneBounds) {
          return {
            range: {
              start: zoneBounds.start,
              end: zoneBounds.end
            },
            units: 'm/s'
          }
        }
      }
    }

    return target
  }

  function getRelativePaceTarget(
    target: { value?: number; range?: { start: number; end: number }; units?: string } | null
  ): { value?: number; range?: { start: number; end: number } } | null {
    const normalized = normalizePaceTarget(normalizeTarget(target))
    if (!normalized) return null
    const thresholdPace = Number(effectiveSportSettings.value?.thresholdPace || 0)
    const convert = (value: number) => {
      const speedMps = paceValueToMps(value, normalized.units)
      if (speedMps !== null && thresholdPace > 0) return speedMps / thresholdPace
      if (value > 2) return value / 100
      return value
    }

    if (normalized.range) {
      return {
        range: {
          start: convert(normalized.range.start),
          end: convert(normalized.range.end)
        }
      }
    }

    if (typeof normalized.value === 'number') {
      return { value: convert(normalized.value) }
    }

    return null
  }

  function resolvePowerZoneRange(zoneRaw: number): { start: number; end: number } | null {
    const index = Math.max(1, Math.round(zoneRaw)) - 1
    const powerZones = Array.isArray(effectiveSportSettings.value?.powerZones)
      ? effectiveSportSettings.value.powerZones
      : []
    const ftp = getPowerReference()
    const zone = powerZones[index]
    if (!zone || ftp <= 0) return null

    const minW = Number(zone?.min)
    const maxW = Number(zone?.max)
    if (!Number.isFinite(minW) || !Number.isFinite(maxW) || maxW <= 0) return null

    return {
      start: minW / ftp,
      end: maxW / ftp
    }
  }

  function normalizePowerTarget(
    target: { value?: number; range?: { start: number; end: number }; units?: string } | null
  ): { value?: number; range?: { start: number; end: number } } | null {
    const normalized = normalizeTarget(target)
    if (!normalized) return null

    const units = String(normalized.units || '')
      .trim()
      .toLowerCase()
    const ftp = getPowerReference()

    if ((units === 'w' || units === 'watts') && ftp > 0) {
      if (normalized.range) {
        return {
          range: {
            start: normalized.range.start / ftp,
            end: normalized.range.end / ftp
          }
        }
      }
      if (typeof normalized.value === 'number') {
        return { value: normalized.value / ftp }
      }
    }

    if (units === 'power_zone') {
      if (normalized.range) {
        const startZone = resolvePowerZoneRange(normalized.range.start)
        const endZone = resolvePowerZoneRange(normalized.range.end)
        if (startZone && endZone) {
          return {
            range: {
              start: Math.min(startZone.start, endZone.start),
              end: Math.max(startZone.end, endZone.end)
            }
          }
        }
      }
      if (typeof normalized.value === 'number') {
        const zoneRange = resolvePowerZoneRange(normalized.value)
        if (zoneRange) {
          return {
            range: {
              start: zoneRange.start,
              end: zoneRange.end
            }
          }
        }
      }
    }

    return normalized
  }

  function normalizeHrTarget(
    target: { value?: number; range?: { start: number; end: number }; units?: string } | null
  ): { value?: number; range?: { start: number; end: number } } | null {
    const normalized = normalizeTarget(target)
    if (!normalized) return null
    const units = String(normalized.units || '')
      .trim()
      .toLowerCase()

    if (units === 'bpm') {
      if (normalized.range) {
        return {
          range: {
            start: toNormalizedHeartRate(normalized.range.start),
            end: toNormalizedHeartRate(normalized.range.end)
          }
        }
      }
      if (typeof normalized.value === 'number') {
        return { value: toNormalizedHeartRate(normalized.value) }
      }
    }

    if (units === 'hr_zone' || units === 'zone') {
      if (normalized.range) {
        const startZone = getHrZoneBoundsByIndex(normalized.range.start)
        const endZone = getHrZoneBoundsByIndex(normalized.range.end)
        if (startZone && endZone) {
          return {
            range: {
              start: toNormalizedHeartRate(startZone.start),
              end: toNormalizedHeartRate(endZone.end)
            }
          }
        }
        return {
          range: {
            start: toNormalizedHeartRate(normalized.range.start),
            end: toNormalizedHeartRate(normalized.range.end)
          }
        }
      }
      if (typeof normalized.value === 'number') {
        const zoneBounds = getHrZoneBoundsByIndex(normalized.value)
        if (zoneBounds) {
          return {
            range: {
              start: toNormalizedHeartRate(zoneBounds.start),
              end: toNormalizedHeartRate(zoneBounds.end)
            }
          }
        }
        return { value: toNormalizedHeartRate(normalized.value) }
      }
    }

    return normalized
  }

  function getStepDuration(step: any): number {
    const duration = Number(step?.durationSeconds ?? step?.duration ?? 0)
    return Number.isFinite(duration) && duration > 0 ? duration : 0
  }
</script>
