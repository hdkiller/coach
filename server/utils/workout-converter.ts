import { create } from 'xmlbuilder2'
import { FitWriter } from '@markw65/fit-file-writer'

interface WorkoutStep {
  type: 'Warmup' | 'Active' | 'Rest' | 'Cooldown'
  durationSeconds?: number
  duration?: number
  distance?: number
  power?: {
    value?: number
    range?: { start: number; end: number }
    units?: string
  }
  heartRate?: {
    value?: number
    range?: { start: number; end: number }
    units?: string
  }
  pace?: {
    value?: number
    range?: { start: number; end: number }
    units?: string
  }
  cadence?: number
  name?: string
  steps?: WorkoutStep[]
  reps?: number
}

interface WorkoutMessage {
  timestamp: number
  text: string
  duration?: number
}

interface WorkoutData {
  title: string
  description: string
  type?: string
  author?: string
  steps: WorkoutStep[]
  exercises?: any[]
  messages?: WorkoutMessage[]
  ftp?: number // Optional, for calculating absolute watts if needed
  sportSettings?: {
    loadPreference?: string | null
    intervalsHrRangeTolerancePct?: number | null
  }
}

export const WorkoutConverter = {
  toZWO(workout: WorkoutData): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('workout_file')
      .ele('author')
      .txt(workout.author || 'Coach Wattz')
      .up()
      .ele('name')
      .txt(workout.title)
      .up()
      .ele('description')
      .txt(workout.description)
      .up()
      .ele('sportType')
      .txt('bike')
      .up()
      .ele('tags')
      .up()
      .ele('workout')

    workout.steps.forEach((step) => {
      // Safely access power
      const power = step.power || { value: 0 }
      const duration = step.durationSeconds || step.duration || 0

      // If we only have Heart Rate, ZWO is not the best format but we can try to approximate or just use 0 power
      // Zwift is primarily power-based.

      // ZWO uses percentage of FTP (0.0 - 1.0+)
      if (power.range) {
        // Ramp
        // Zwift uses <Ramp> or <Warmup>/<Cooldown> with PowerLow/PowerHigh
        const isWarmup = step.type === 'Warmup'
        const isCooldown = step.type === 'Cooldown'

        let tagName = 'Ramp'
        if (isWarmup) tagName = 'Warmup'
        else if (isCooldown) tagName = 'Cooldown'

        const el = root
          .ele(tagName)
          .att('Duration', String(duration))
          .att('PowerLow', String(power.range.start ?? 0))
          .att('PowerHigh', String(power.range.end ?? 0))

        if (step.cadence) el.att('Cadence', String(step.cadence))
        if (step.name) el.att('Text', step.name)
        el.up()
      } else {
        // Steady State
        const el = root
          .ele('SteadyState')
          .att('Duration', String(duration))
          .att('Power', String(power.value || 0))

        if (step.cadence) el.att('Cadence', String(step.cadence))
        if (step.name) el.att('Text', step.name) // Zwift displays this on screen
        el.up()
      }
    })

    if (workout.messages) {
      workout.messages.forEach((msg) => {
        root
          .ele('textEvent')
          .att('timeoffset', String(msg.timestamp))
          .att('message', msg.text)
          .att('duration', String(msg.duration || 10))
          .up()
      })
    }

    return root.end({ prettyPrint: true })
  },

  toFIT(workout: WorkoutData): Uint8Array {
    const fitWriter = new FitWriter()

    // FIT Epoch: Dec 31, 1989 00:00:00 UTC
    const toFitTimestamp = (date: Date) => Math.round(date.getTime() / 1000) - 631065600

    // 1. File ID
    fitWriter.writeMessage('file_id', {
      type: 'workout',
      manufacturer: 'garmin',
      product: 0,
      serial_number: 0,
      time_created: toFitTimestamp(new Date()),
      number: 0,
      product_name: 'Coach Wattz'
    })

    // 2. Workout Message
    fitWriter.writeMessage('workout', {
      wkt_name: workout.title.substring(0, 15), // Max chars often limited
      sport: 'cycling',
      sub_sport: 'generic',
      num_valid_steps: workout.steps.length
    })

    // 3. Workout Steps
    workout.steps.forEach((step, index) => {
      // Safely access power
      const power = step.power || { value: 0 }
      const isRamp = !!power.range

      // Target Value: Power
      // 1000 = 100% FTP?
      // According to FIT SDK, 'power' steps typically use:
      // target_type: 'power_3s' or 'power_10s' or 'power_30s' or 'power_lap'
      // BUT for workout steps, we define intensity target.
      // target_type: 0 (speed), 1 (heart_rate), 2 (open), 3 (cadence), 4 (power)

      let targetType: 'power' | 'heart_rate' | 'open' = 'power' // 4
      let customTargetValueLow = 0
      let customTargetValueHigh = 0

      // Check if HR based
      if (!power.value && !power.range && step.heartRate) {
        // targetType = 'heart_rate'; // 1

        // HR values are typically BPM in FIT files, or % max HR?
        // FIT SDK usually expects BPM for absolute values.
        // But we store % LTHR.
        // We'd need the user's LTHR to convert to BPM.
        // Or we use zone numbers (1-5).

        // For now, let's assume we can't easily export HR targets without knowing absolute BPM zones reliably here.
        // We'll skip complex HR export logic for FIT for now or use open targets.
        targetType = 'open' // 2
      } else {
        // Let's calculate ABSOLUTE WATTS if FTP is provided, otherwise fallback to a default 250W.
        const ftp = workout.ftp || 250

        if (isRamp && power.range) {
          customTargetValueLow = Math.round((power.range.start ?? 0) * ftp)
          customTargetValueHigh = Math.round((power.range.end ?? 0) * ftp)
        } else {
          // Steady: Low and High define the zone window.
          // Usually target - 5% to target + 5%
          const val = (power.value || 0) * ftp
          customTargetValueLow = Math.round(val - 10)
          customTargetValueHigh = Math.round(val + 10)
        }
      }

      fitWriter.writeMessage('workout_step', {
        message_index: { value: index },
        wkt_step_name: step.name ? step.name.substring(0, 15) : undefined,
        duration_type: 'time', // 0
        duration_value: (step.durationSeconds || step.duration || 0) * 1000, // ms
        target_type: targetType,
        // Let's use raw Watts.
        custom_target_value_low: customTargetValueLow,
        custom_target_value_high: customTargetValueHigh,

        intensity:
          step.type === 'Active'
            ? 'active'
            : step.type === 'Rest'
              ? 'rest'
              : step.type === 'Warmup'
                ? 'warmup'
                : 'cooldown'
      })
    })

    const result = fitWriter.finish()
    // Convert DataView to Uint8Array to satisfy response requirements
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
  },

  toMRC(workout: WorkoutData): string {
    const lines: string[] = []
    lines.push('[COURSE HEADER]')
    lines.push('VERSION = 2')
    lines.push('UNITS = ENGLISH')
    lines.push(`DESCRIPTION = ${workout.description.replace(/[\r\n]+/g, ' ')}`)
    lines.push(`FILE NAME = ${workout.title}`)
    lines.push('MINUTES PERCENT')
    lines.push('[END COURSE HEADER]')
    lines.push('[COURSE DATA]')

    let currentTime = 0

    workout.steps.forEach((step) => {
      const durationMins = (step.durationSeconds || step.duration || 0) / 60
      const endTime = currentTime + durationMins

      // Safely access power
      const power = step.power || { value: 0 }

      // Calculate start and end power as percentage (0-100)
      let startPercent = 0
      let endPercent = 0

      if (power.range) {
        startPercent = (power.range.start ?? 0) * 100
        endPercent = (power.range.end ?? 0) * 100
      } else {
        startPercent = (power.value || 0) * 100
        endPercent = startPercent
      }

      // Add points
      // Format: Time(min) Value(%)
      lines.push(`${currentTime.toFixed(2)}	${startPercent.toFixed(0)}`)
      lines.push(`${endTime.toFixed(2)}	${endPercent.toFixed(0)}`)

      currentTime = endTime
    })

    lines.push('[END COURSE DATA]')
    return lines.join('\r\n')
  },

  toERG(workout: WorkoutData): string {
    const lines: string[] = []
    const ftp = workout.ftp || 250 // Fallback FTP

    lines.push('[COURSE HEADER]')
    lines.push('VERSION = 2')
    lines.push('UNITS = ENGLISH') // ERG standard often uses ENGLISH even for metric users, refers to formatting
    lines.push(`DESCRIPTION = ${workout.description.replace(/[\r\n]+/g, ' ')}`)
    lines.push(`FILE NAME = ${workout.title}`)
    lines.push(`FTP = ${ftp}`)
    lines.push('MINUTES WATTS')
    lines.push('[END COURSE HEADER]')
    lines.push('[COURSE DATA]')

    let currentTime = 0

    workout.steps.forEach((step) => {
      const durationMins = (step.durationSeconds || step.duration || 0) / 60
      const endTime = currentTime + durationMins

      // Safely access power
      const power = step.power || { value: 0 }

      // Calculate start and end power in Watts
      let startWatts = 0
      let endWatts = 0

      if (power.range) {
        startWatts = (power.range.start ?? 0) * ftp
        endWatts = (power.range.end ?? 0) * ftp
      } else {
        startWatts = (power.value || 0) * ftp
        endWatts = startWatts
      }

      // Add points
      lines.push(`${currentTime.toFixed(2)}	${Math.round(startWatts)}`)
      lines.push(`${endTime.toFixed(2)}	${Math.round(endWatts)}`)

      currentTime = endTime
    })

    lines.push('[END COURSE DATA]')
    return lines.join('\r\n')
  },

  toIntervalsICU(workout: WorkoutData): string {
    const lines: string[] = []
    const normalizeUnits = (units: unknown): string | undefined => {
      if (typeof units !== 'string') return undefined
      const v = units.trim().toLowerCase()
      return v || undefined
    }
    const normalizeTarget = (
      target: any
    ): { value?: number; range?: { start: number; end: number }; units?: string } | null => {
      if (target === null || target === undefined) return null

      if (Array.isArray(target)) {
        if (target.length >= 2) {
          return { range: { start: Number(target[0]) || 0, end: Number(target[1]) || 0 } }
        }
        if (target.length === 1) {
          return { value: Number(target[0]) || 0 }
        }
        return null
      }

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
            units: normalizeUnits(target.units ?? target.range.units)
          }
        }
        if (target.start !== undefined && target.end !== undefined) {
          return {
            range: {
              start: Number(target.start) || 0,
              end: Number(target.end) || 0
            },
            units: normalizeUnits(target.units)
          }
        }
        if (target.value !== undefined) {
          return { value: Number(target.value) || 0, units: normalizeUnits(target.units) }
        }
      }

      return null
    }
    const toDurationToken = (seconds: number) => {
      if (seconds <= 0) return ''
      if (seconds % 3600 === 0) return `${seconds / 3600}h`
      if (seconds >= 3600 && seconds % 60 === 0) {
        const hours = Math.floor(seconds / 3600)
        const minutes = (seconds % 3600) / 60
        return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`
      }
      if (seconds % 60 === 0) return `${seconds / 60}m`
      return `${seconds}s`
    }
    const toDistanceToken = (meters?: number) => {
      if (!meters || meters <= 0) return ''
      if (meters % 1000 === 0) return `${meters / 1000}km`
      return `${meters}mtrs`
    }
    const toValuePct = (value: number) => {
      if (!Number.isFinite(value)) return 0
      return value <= 3 ? Math.round(value * 100) : Math.round(value)
    }
    const toRangePct = (start: number, end: number) => ({
      start: toValuePct(start),
      end: toValuePct(end)
    })
    const formatMetric = (
      target: { value?: number; range?: { start: number; end: number }; units?: string } | null,
      kind: 'power' | 'hr' | 'pace'
    ) => {
      if (!target) return ''
      const units = target.units?.toLowerCase()
      const hrLabel = units === 'hr' || units === 'maxhr' ? 'HR' : 'LTHR'

      const formatValue = (value: number) => {
        if (!Number.isFinite(value)) return ''
        if (kind === 'power') {
          if (units === 'w' || units === 'watts') return `${Math.round(value)}w`
          if (units?.startsWith('z')) return units.toUpperCase()
          return `${toValuePct(value)}%`
        }
        if (kind === 'hr') {
          if (units === 'bpm') return `${Math.round(value)}bpm`
          return `${toValuePct(value)}% ${hrLabel}`
        }
        if (units && units.includes('/')) return `${value}${units}`
        return `${toValuePct(value)}% Pace`
      }

      const formatRange = (start: number, end: number) => {
        if (kind === 'power') {
          if (units === 'w' || units === 'watts') return `${Math.round(start)}-${Math.round(end)}w`
          if (units?.startsWith('z')) return units.toUpperCase()
          const pct = toRangePct(start, end)
          return `ramp ${pct.start}-${pct.end}%`
        }
        if (kind === 'hr') {
          if (units === 'bpm') return `${Math.round(start)}-${Math.round(end)}bpm`
          const pct = toRangePct(start, end)
          return `${pct.start}-${pct.end}% ${hrLabel}`
        }
        if (units && units.includes('/')) return `${start}-${end}${units}`
        const pct = toRangePct(start, end)
        return `${pct.start}-${pct.end}% Pace`
      }

      if (target.range) return formatRange(target.range.start ?? 0, target.range.end ?? 0)
      if (typeof target.value === 'number' && target.value > 0.01) return formatValue(target.value)
      return ''
    }

    // Handle Strength Exercises
    if (workout.exercises && workout.exercises.length > 0) {
      if (workout.description) {
        lines.push(workout.description.trim())
        lines.push('')
      }

      workout.exercises.forEach((ex) => {
        lines.push(`- **${ex.name}**`)
        let details = ''
        if (ex.sets) details += `${ex.sets} sets`
        if (ex.reps) details += ` x ${ex.reps} reps`
        if (ex.weight) details += ` @ ${ex.weight}`
        if (details) lines.push(`  - ${details}`)
        if (ex.rest) lines.push(`  - Rest: ${ex.rest}`)
        if (ex.notes) lines.push(`  - Note: ${ex.notes}`)
        lines.push('')
      })

      return lines.join('\n').trim()
    }

    const sportType = workout.type?.toLowerCase() || ''
    const isSwim = sportType.includes('swim')
    const isRun = !isSwim && sportType.includes('run')
    const loadPref =
      workout.sportSettings?.loadPreference?.toLowerCase() ||
      (isRun ? 'hr_pace_power' : isSwim ? 'hr_pace_power' : 'power_hr_pace')
    const rawHrTolerancePct = Number(workout.sportSettings?.intervalsHrRangeTolerancePct || 0)
    const hrTolerancePct =
      rawHrTolerancePct > 1 ? rawHrTolerancePct / 100 : Math.max(0, rawHrTolerancePct)
    const normalizeHrTargetForExport = (
      target: { value?: number; range?: { start: number; end: number }; units?: string } | null
    ) => {
      if (!target) return null
      if (target.range) return target
      if (typeof target.value !== 'number') return target
      if (hrTolerancePct <= 0) return target

      const start = Math.max(0, target.value - hrTolerancePct)
      const end = target.value + hrTolerancePct
      return { range: { start, end }, units: target.units }
    }

    if (workout.description) {
      const cleanPreamble = workout.description
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('-'))
        .join('\n')

      if (cleanPreamble) {
        lines.push(cleanPreamble)
        lines.push('')
      }
    }

    let currentType = ''
    const preamble = workout.description?.toLowerCase() || ''

    const formatSteps = (
      steps: WorkoutStep[],
      indent = '',
      parentStep: WorkoutStep | null = null
    ) => {
      steps.forEach((step, index) => {
        if (indent === '') {
          const lastLine = lines.length > 0 ? lines[lines.length - 1] : ''
          if (typeof lastLine === 'string' && /^\s+-\s+/.test(lastLine)) {
            lines.push('')
          }
        }

        if (indent === '') {
          let header = ''
          if (index === 0 && step.type === 'Warmup') {
            header = 'Warmup'
          } else if (step.type === 'Cooldown' && currentType !== 'Cooldown') {
            header = '\nCooldown'
          } else if (step.type === 'Active' && currentType === 'Warmup') {
            header = '\nMain Set'
          }

          if (header) {
            const cleanHeader = header.trim().toLowerCase()
            const lastLineRaw = lines.length > 0 ? lines[lines.length - 1] : ''
            const lastLine = lastLineRaw ? lastLineRaw.trim().toLowerCase() : ''
            const isRedundant =
              preamble.startsWith(cleanHeader) ||
              preamble.includes(`\n${cleanHeader}`) ||
              lastLine === cleanHeader
            if (!isRedundant) lines.push(header)
          }
          currentType = step.type
        }

        if (step.steps && step.steps.length > 0) {
          const reps = Number(step.reps ?? (step as any).repeat ?? (step as any).intervals) || 1
          if (reps > 1) {
            const lastLine = lines.length > 0 ? lines[lines.length - 1] : null
            if (lastLine && typeof lastLine === 'string' && !lastLine.endsWith('\n')) lines.push('')
            lines.push(`${indent}${reps}x`)
            formatSteps(step.steps, indent + '  ', step)
          } else {
            formatSteps(step.steps, indent, step)
          }
          return
        }

        const power = normalizeTarget(step.power) || normalizeTarget(parentStep?.power)
        const heartRate = normalizeHrTargetForExport(
          normalizeTarget(step.heartRate) || normalizeTarget(parentStep?.heartRate)
        )
        const pace = normalizeTarget(step.pace) || normalizeTarget(parentStep?.pace)
        const distanceStr = toDistanceToken(step.distance)
        const duration = step.durationSeconds || step.duration || 0
        const shouldIncludeDuration = !isSwim || !step.distance || step.type === 'Rest'
        const durationStr = duration > 0 && shouldIncludeDuration ? toDurationToken(duration) : ''

        const intensities: string[] = []
        const getPowerStr = () => formatMetric(power, 'power')
        const getHrStr = () => formatMetric(heartRate, 'hr')
        const getPaceStr = () => formatMetric(pace, 'pace')
        const metrics = loadPref.split('_')
        let primaryFound = false

        for (const metric of metrics) {
          if (metric === 'hr') {
            const s = getHrStr()
            if (s) {
              intensities.push(s)
              primaryFound = true
            }
          } else if (metric === 'power') {
            const s = getPowerStr()
            if (s) {
              intensities.push(s)
              primaryFound = true
            }
          } else if (metric === 'pace') {
            const s = getPaceStr()
            if (s) {
              intensities.push(s)
              primaryFound = true
            }
          }
          if (primaryFound && isRun) break
        }

        if (intensities.length === 0) {
          const fallback = getHrStr() || getPowerStr() || getPaceStr()
          if (fallback) {
            intensities.push(fallback)
          } else if (isRun && step.type !== 'Rest') {
            intensities.push('60% LTHR')
          } else if (step.type === 'Rest' && !isRun) {
            intensities.push('50%')
          }
        }

        const intensityStr = intensities.join(' ')
        let line = `${indent}-`
        let name = (step.name || (step.type === 'Rest' ? 'Rest' : '')).trim()

        if (name) {
          name = name
            .replace(/(\d+)\s*(minutes?|min)/gi, '$1m')
            .replace(/(\d+)\s*(seconds?|sec)/gi, '$1s')
        }

        if (isRun && name) {
          name = name
            .replace(/\s*\(\s*\d+(-\d+)?\s*w\s*\)/gi, '')
            .replace(/\s+/g, ' ')
            .trim()

          // Intervals.icu may infer bare "Z2" as power zone; annotate HR explicitly
          // when this run step is heart-rate targeted.
          if (heartRate) {
            name = name.replace(/\bZ([1-7])\b(?!\s*HR\b)/gi, 'Z$1 HR')
          }
        }

        if (name) line += ` ${name}`
        if (distanceStr && !name.toLowerCase().includes(`${step.distance}m`))
          line += ` ${distanceStr}`

        if (durationStr) {
          const durationMinutes = duration > 0 && duration % 60 === 0 ? duration / 60 : null
          if (
            durationMinutes === null ||
            (!name.toLowerCase().includes(`${durationMinutes}m`) &&
              !name.toLowerCase().includes(`${durationMinutes} min`))
          ) {
            line += ` ${durationStr}`
          }
        }

        if (intensityStr) line += ` ${intensityStr}`
        if (step.cadence) line += ` ${step.cadence}rpm`
        lines.push(line.trimEnd())
      })
    }

    formatSteps(workout.steps)
    return lines.join('\n')
  },

  parseIntervalsGymDescription(description: string): any[] {
    const exercises: any[] = []
    if (!description) return exercises

    const lines = description.split('\n')
    let currentExercise: any = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Exercise Name: "- **Name**"
      const nameMatch = trimmed.match(/^-\s+\*\*(.+)\*\*$/)
      if (nameMatch) {
        if (currentExercise) {
          exercises.push(currentExercise)
        }
        currentExercise = { name: nameMatch[1] }
        continue
      }

      if (!currentExercise) continue

      // Details line (Sets/Reps/Weight)
      // Matches: "  - 3 sets", "  - 3 sets x 10 reps", "  - 3 sets x 10 reps @ 50kg"
      // But avoid matching "  - Rest:" or "  - Note:"
      // Note: We check for '- ' or '  - ' prefix generically
      if (
        (trimmed.startsWith('- ') || trimmed.startsWith('  - ')) &&
        !trimmed.includes('Rest:') &&
        !trimmed.includes('Note:') &&
        !trimmed.includes('**')
      ) {
        // Remove bullet
        const text = trimmed.replace(/^[-\s]+/, '')

        const setsMatch = text.match(/^(\d+)\s+sets/)
        if (setsMatch) currentExercise.sets = parseInt(setsMatch[1]!, 10)

        const repsMatch = text.match(/x\s+(.+?)\s+reps/)
        if (repsMatch) currentExercise.reps = repsMatch[1]!

        const weightMatch = text.match(/@\s+(.+)$/)
        if (weightMatch) currentExercise.weight = weightMatch[1]!

        continue
      }

      // Rest
      // Matches: "  - Rest: 60s"
      if (trimmed.includes('Rest:')) {
        const restMatch = trimmed.match(/Rest:\s+(.+)$/)
        if (restMatch) {
          currentExercise.rest = restMatch[1]
        }
        continue
      }

      // Note
      // Matches: "  - Note: ..."
      if (trimmed.includes('Note:')) {
        const noteMatch = trimmed.match(/Note:\s+(.+)$/)
        if (noteMatch) {
          currentExercise.notes = noteMatch[1]
        }
        continue
      }
    }

    if (currentExercise) {
      exercises.push(currentExercise)
    }

    return exercises
  }
}
