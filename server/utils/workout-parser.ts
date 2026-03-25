import { extractSwimDistanceFromText } from './swim-structure'

export interface ParsedWorkoutStep {
  type: 'Warmup' | 'Active' | 'Rest' | 'Cooldown'
  name?: string
  durationSeconds?: number
  distance?: number
  power?: {
    value?: number
    range?: { start: number; end: number }
    ramp?: boolean
    units?: string
  }
  heartRate?: {
    value?: number
    range?: { start: number; end: number }
    ramp?: boolean
    units?: string
  }
  pace?: {
    value?: number
    range?: { start: number; end: number }
    ramp?: boolean
    units?: string
  }
  cadence?: number
  reps?: number
  steps?: ParsedWorkoutStep[]
}

export const WorkoutParser = {
  parseIntervalsICU(text: string, options?: { workoutType?: string | null }): ParsedWorkoutStep[] {
    const lines = text.split('\n')
    const rootSteps: ParsedWorkoutStep[] = []
    const stack: { steps: ParsedWorkoutStep[]; indent: number }[] = [
      { steps: rootSteps, indent: -1 }
    ]

    let currentType: 'Warmup' | 'Active' | 'Rest' | 'Cooldown' = 'Active'

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Skip CoachWatts signature
      if (trimmedLine === '[CoachWatts]') continue

      // Detect Section Headers
      if (/^Warmup$/i.test(trimmedLine)) {
        currentType = 'Warmup'
        continue
      }
      if (/^Cooldown$/i.test(trimmedLine)) {
        currentType = 'Cooldown'
        continue
      }
      if (/^(Main Set|Intervls|Workout)$/i.test(trimmedLine)) {
        currentType = 'Active'
        continue
      }

      // Detect Indentation
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1]?.length || 0 : 0

      // Pop from stack if indent decreased
      while (stack.length > 1 && indent <= (stack[stack.length - 1]?.indent ?? -1)) {
        stack.pop()
      }

      const currentStackItem = stack[stack.length - 1]
      if (!currentStackItem) continue
      const currentContainer = currentStackItem.steps

      // Detect Repeats: "4x" or "4 x"
      const repeatMatch = trimmedLine.match(/^(\d+)\s*x$/i)
      if (repeatMatch) {
        const reps = parseInt(repeatMatch[1] || '1', 10)
        const newGroup: ParsedWorkoutStep = {
          type: 'Active',
          reps,
          steps: []
        }
        currentContainer.push(newGroup)
        stack.push({ steps: newGroup.steps!, indent })
        continue
      }

      // Detect Step: starts with "-"
      if (trimmedLine.startsWith('-')) {
        const stepText = trimmedLine.substring(1).trim()
        const step = this.parseStepLine(stepText, currentType, options)
        currentContainer.push(step)
      }
    }

    return rootSteps
  },

  parseStepLine(
    text: string,
    defaultType: 'Warmup' | 'Active' | 'Rest' | 'Cooldown',
    options?: { workoutType?: string | null }
  ): ParsedWorkoutStep {
    const originalText = text
    const isSwim = String(options?.workoutType || '')
      .toLowerCase()
      .includes('swim')
    const step: ParsedWorkoutStep = {
      type: defaultType,
      name: ''
    }

    // 1. Extract Cadence: "90rpm"
    const rpmMatch = text.match(/(\d+)\s*rpm/i)
    if (rpmMatch) {
      step.cadence = parseInt(rpmMatch[1] || '0', 10)
      text = text.replace(rpmMatch[0], '').trim()
    }

    // 2. Swim-specific distance extraction must happen before duration parsing,
    // otherwise bare "200m" is interpreted as 200 minutes.
    if (isSwim) {
      const extractedDistance = extractSwimDistanceFromText(text)
      if (extractedDistance) {
        step.distance = extractedDistance.distance
        text = extractedDistance.strippedText
      }
    }

    // 3. Extract Duration: "10m", "30s", "1h"
    const intervalsDurationMatch = text.match(/\b(\d+)([hms])\b/gi)
    if (intervalsDurationMatch) {
      let totalSeconds = 0
      intervalsDurationMatch.forEach((match) => {
        const val = parseInt(match.slice(0, -1), 10)
        const unit = match.slice(-1).toLowerCase()
        if (unit === 'h') totalSeconds += val * 3600
        if (unit === 'm') totalSeconds += val * 60
        if (unit === 's') totalSeconds += val
        text = text.replace(match, '').trim()
      })
      step.durationSeconds = totalSeconds
    }

    // 4. Extract Distance: "1000m", "1.5km", "400mtrs"
    if (!step.distance) {
      const distanceMatch = text.match(/\b(\d+(\.\d+)?)\s*(km|mtrs|m)\b/i)
      if (distanceMatch) {
        const val = parseFloat(distanceMatch[1] || '0')
        const unit = (distanceMatch[3] || 'm').toLowerCase()
        step.distance = unit === 'km' ? val * 1000 : val
        text = text.replace(distanceMatch[0] || '', '').trim()
      }
    }

    // 5. Extract Intensity (Power/HR/Pace)
    // Percentage: "50%", "ramp 50-70%", "50-70%"
    const rampMatch = text.match(/ramp\s+(\d+)-(\d+)%/i) || text.match(/(\d+)-(\d+)%/i)
    if (rampMatch) {
      const start = parseInt(rampMatch[1] || '0', 10) / 100
      const end = parseInt(rampMatch[2] || '0', 10) / 100
      const isRamp = /^ramp\b/i.test(rampMatch[0] || '')
      // Assume power by default, but could be HR if LTHR is mentioned
      if (text.toLowerCase().includes('lthr') || text.toLowerCase().includes('hr')) {
        step.heartRate = { range: { start, end }, ramp: isRamp, units: 'LTHR' }
      } else if (text.toLowerCase().includes('pace')) {
        step.pace = { range: { start, end }, ramp: isRamp, units: 'Pace' }
      } else {
        step.power = { range: { start, end }, ramp: isRamp, units: '%' }
      }
      text = text.replace(rampMatch[0] || '', '').trim()
    } else {
      const pctMatch = text.match(/(\d+)%/i)
      if (pctMatch) {
        const value = parseInt(pctMatch[1] || '0', 10) / 100
        if (text.toLowerCase().includes('lthr') || text.toLowerCase().includes('hr')) {
          step.heartRate = { value, units: 'LTHR' }
        } else if (text.toLowerCase().includes('pace')) {
          step.pace = { value, units: 'Pace' }
        } else {
          step.power = { value, units: '%' }
        }
        text = text.replace(pctMatch[0] || '', '').trim()
      }
    }

    // Absolute values: "200w", "150bpm"
    const wattMatch = text.match(/(\d+)w/i)
    if (wattMatch) {
      step.power = { value: parseInt(wattMatch[1] || '0', 10), units: 'w' }
      text = text.replace(wattMatch[0] || '', '').trim()
    }
    const bpmMatch = text.match(/(\d+)bpm/i)
    if (bpmMatch) {
      step.heartRate = { value: parseInt(bpmMatch[1] || '0', 10), units: 'bpm' }
      text = text.replace(bpmMatch[0] || '', '').trim()
    }

    // Remove metric labels left behind after intensity extraction so they do not
    // pollute the user-facing step name during round-trip sync.
    text = text
      .replace(/\bLTHR\b/gi, '')
      .replace(/\bHR\b/gi, '')
      .replace(/\bPACE\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    // 6. Cleanup Name
    // Remove redundant type names
    if (text.toLowerCase().startsWith('rest')) {
      step.type = 'Rest'
      text = text.replace(/^rest/i, '').trim()
    }
    if (text.toLowerCase().startsWith('warmup')) {
      step.type = 'Warmup'
      text = text.replace(/^warmup/i, '').trim()
    }
    if (text.toLowerCase().startsWith('cooldown')) {
      step.type = 'Cooldown'
      text = text.replace(/^cooldown/i, '').trim()
    }

    if (step.type === defaultType && defaultType === 'Active') {
      const normalizedOriginal = originalText.trim().toLowerCase()
      const normalizedName = text.toLowerCase()
      const targetValue =
        step.power?.value ??
        (step.power?.range
          ? (step.power.range.start + step.power.range.end) / 2
          : (step.heartRate?.value ??
            (step.heartRate?.range
              ? (step.heartRate.range.start + step.heartRate.range.end) / 2
              : (step.pace?.value ??
                (step.pace?.range ? (step.pace.range.start + step.pace.range.end) / 2 : null)))))
      const recoveryLabels = ['off', 'recover', 'recovery', 'easy', 'jog', 'float', 'rest']
      const hasRecoveryLabel = recoveryLabels.some(
        (label) =>
          normalizedName === label ||
          normalizedName.startsWith(`${label} `) ||
          normalizedOriginal.startsWith(`${label} `) ||
          normalizedOriginal === label
      )

      if (
        hasRecoveryLabel ||
        (typeof targetValue === 'number' && Number.isFinite(targetValue) && targetValue < 0.6)
      ) {
        step.type = 'Rest'
      }
    }

    step.name = text.trim() || undefined
    if (step.type === 'Rest' && !step.name) step.name = 'Rest'

    return step
  },

  toIntervalsICU(steps: ParsedWorkoutStep[], indent = 0): string {
    let text = ''
    const padding = '  '.repeat(indent)

    for (const step of steps) {
      if (step.reps && step.reps > 1) {
        text += `${padding}${step.reps}x\n`
        if (step.steps) {
          text += this.toIntervalsICU(step.steps, indent + 1)
        }
        continue
      }

      let line = `${padding}- `

      if (step.name && step.name !== step.type) {
        line += `${step.name} `
      } else if (step.type && step.type !== 'Active') {
        line += `${step.type} `
      }

      if (step.durationSeconds) {
        const h = Math.floor(step.durationSeconds / 3600)
        const m = Math.floor((step.durationSeconds % 3600) / 60)
        const s = step.durationSeconds % 60
        if (h > 0) line += `${h}h`
        if (m > 0) line += `${m}m`
        if (s > 0) line += `${s}s`
        line += ' '
      } else if (step.distance) {
        if (step.distance >= 1000) line += `${step.distance / 1000}km `
        else line += `${step.distance}m `
      }

      if (step.power) {
        if (step.power.range) {
          line += `${step.power.ramp ? 'ramp ' : ''}${Math.round(step.power.range.start * 100)}-${Math.round(step.power.range.end * 100)}% `
        } else if (step.power.value) {
          if (step.power.units === 'w') line += `${step.power.value}w `
          else line += `${Math.round(step.power.value * 100)}% `
        }
      }

      if (step.heartRate) {
        if (step.heartRate.range) {
          line += `${Math.round(step.heartRate.range.start * 100)}-${Math.round(step.heartRate.range.end * 100)}%lthr `
        } else if (step.heartRate.value) {
          if (step.heartRate.units === 'bpm') line += `${step.heartRate.value}bpm `
          else line += `${Math.round(step.heartRate.value * 100)}%lthr `
        }
      }

      if (step.pace) {
        if (step.pace.range) {
          line += `${Math.round(step.pace.range.start * 100)}-${Math.round(step.pace.range.end * 100)}%pace `
        } else if (step.pace.value) {
          line += `${Math.round(step.pace.value * 100)}%pace `
        }
      }

      if (step.cadence) {
        line += `${step.cadence}rpm `
      }

      text += line.trim() + '\n'
    }

    return text
  }
}
