export interface ParsedWorkoutStep {
  type: 'Warmup' | 'Active' | 'Rest' | 'Cooldown'
  name?: string
  durationSeconds?: number
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
  reps?: number
  steps?: ParsedWorkoutStep[]
}

export const WorkoutParser = {
  parseIntervalsICU(text: string): ParsedWorkoutStep[] {
    const lines = text.split('\n')
    const rootSteps: ParsedWorkoutStep[] = []
    const stack: { steps: ParsedWorkoutStep[]; indent: number }[] = [{ steps: rootSteps, indent: -1 }]

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
        const step = this.parseStepLine(stepText, currentType)
        currentContainer.push(step)
      }
    }

    return rootSteps
  },

  parseStepLine(text: string, defaultType: 'Warmup' | 'Active' | 'Rest' | 'Cooldown'): ParsedWorkoutStep {
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

    // 2. Extract Duration: "10m", "30s", "1h", "1:30:00"
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

    // 3. Extract Distance: "1000m", "1.5km"
    const distanceMatch = text.match(/\b(\d+(\.\d+)?)\s*(km|m)\b/i)
    if (distanceMatch) {
      const val = parseFloat(distanceMatch[1] || '0')
      const unit = (distanceMatch[3] || 'm').toLowerCase()
      step.distance = unit === 'km' ? val * 1000 : val
      text = text.replace(distanceMatch[0] || '', '').trim()
    }

    // 4. Extract Intensity (Power/HR/Pace)
    // Percentage: "50%", "ramp 50-70%", "50-70%"
    const rampMatch = text.match(/ramp\s+(\d+)-(\d+)%/i) || text.match(/(\d+)-(\d+)%/i)
    if (rampMatch) {
      const start = parseInt(rampMatch[1] || '0', 10) / 100
      const end = parseInt(rampMatch[2] || '0', 10) / 100
      // Assume power by default, but could be HR if LTHR is mentioned
      if (text.toLowerCase().includes('lthr') || text.toLowerCase().includes('hr')) {
        step.heartRate = { range: { start, end }, units: 'LTHR' }
      } else if (text.toLowerCase().includes('pace')) {
        step.pace = { range: { start, end }, units: 'Pace' }
      } else {
        step.power = { range: { start, end }, units: '%' }
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

    // 5. Cleanup Name
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

    step.name = text.trim() || undefined
    if (step.type === 'Rest' && !step.name) step.name = 'Rest'

    return step
  }
}
