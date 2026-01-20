import { create } from 'xmlbuilder2'
import { FitWriter } from '@markw65/fit-file-writer'

interface WorkoutStep {
  type: 'Warmup' | 'Active' | 'Rest' | 'Cooldown'
  durationSeconds?: number
  duration?: number
  power?: {
    value?: number
    range?: { start: number; end: number }
  }
  heartRate?: {
    value?: number
    range?: { start: number; end: number }
  }
  cadence?: number
  name?: string
}

interface WorkoutMessage {
  timestamp: number
  text: string
  duration?: number
}

interface WorkoutData {
  title: string
  description: string
  author?: string
  steps: WorkoutStep[]
  messages?: WorkoutMessage[]
  ftp?: number // Optional, for calculating absolute watts if needed
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

    // Group steps by type to create sections
    let currentType = ''

    workout.steps.forEach((step, index) => {
      // Safely access power
      const power = step.power || { value: 0 }

      // Add header if type changes
      // Intervals.icu recognizes: Warmup, Main Set, Cooldown
      // Our types: Warmup, Active, Rest, Cooldown
      let sectionHeader = ''
      if (step.type === 'Warmup') sectionHeader = 'Warmup'
      else if (step.type === 'Cooldown') sectionHeader = 'Cooldown'
      else if (step.type === 'Active' || step.type === 'Rest') sectionHeader = 'Main Set'

      // Only add header if it's different from previous and it's a standard section
      // Note: Intervals.icu is flexible, but grouping helps readability.
      // However, strict grouping might be hard if types alternate frequently (intervals).
      // So we might just group contiguous blocks or just omit headers if mixed.
      // Let's stick to simple line-by-line for robustness,
      // or simplistic headers: Warmup at start, Cooldown at end.

      if (index === 0 && step.type === 'Warmup') {
        lines.push('Warmup')
      } else if (step.type === 'Cooldown' && currentType !== 'Cooldown') {
        lines.push('\nCooldown')
      } else if (step.type === 'Active' && currentType === 'Warmup') {
        lines.push('\nMain Set')
      }

      currentType = step.type

      // Format duration
      let durationStr = ''
      const duration = step.durationSeconds || step.duration || 0
      if (duration % 60 === 0) {
        durationStr = `${duration / 60}m`
      } else {
        durationStr = `${duration}s`
      }

      // Format power or heart rate
      let intensityStr = ''

      // Check for power first
      if (power.value || power.range) {
        if (power.range) {
          const start = Math.round((power.range.start ?? 0) * 100)
          const end = Math.round((power.range.end ?? 0) * 100)
          intensityStr = `ramp ${start}-${end}%`
        } else {
          const val = Math.round((power.value || 0) * 100)
          intensityStr = `${val}%`
        }
      }
      // Then check for Heart Rate
      else if (step.heartRate) {
        // Heart Rate for Intervals.icu
        // Format: 85% LTHR (or % HR)
        // If range: 80-90% LTHR
        if (step.heartRate.range) {
          const start = Math.round((step.heartRate.range.start ?? 0) * 100)
          const end = Math.round((step.heartRate.range.end ?? 0) * 100)
          intensityStr = `${start}-${end}% LTHR`
        } else {
          const val = Math.round((step.heartRate.value || 0) * 100)
          intensityStr = `${val}% LTHR`
        }
      } else {
        // Default to low intensity if nothing specified
        intensityStr = '50%'
      }

      // Cadence (optional)
      let cadenceStr = ''
      if (step.cadence) {
        cadenceStr = ` ${step.cadence}rpm`
      }

      // Text/Name (optional)
      // Intervals.icu parsing rule: "Everything before the first duration/intensity becomes the cue."
      // We will place the name BEFORE the duration/intensity to act as the cue/text prompt.
      // Format: "- [StepName] [Duration] [Intensity] [Cadence]"

      let line = '-'

      if (step.name) {
        const cleanName = step.name.replace(/["\n\r]/g, '').trim()
        if (cleanName) {
          line += ` ${cleanName}`
        }
      }

      line += ` ${durationStr} ${intensityStr}${cadenceStr}`

      lines.push(line)
    })

    return lines.join('\n')
  }
}
