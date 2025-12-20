/**
 * Utility for detecting intervals and peak efforts in workout stream data
 */

export interface Interval {
  start_index: number
  end_index: number
  start_time: number
  end_time: number
  duration: number
  avg_power?: number
  avg_heartrate?: number
  avg_pace?: number
  max_power?: number
  max_heartrate?: number
  type: 'WORK' | 'RECOVERY' | 'WARMUP' | 'COOLDOWN'
  intensity_zone?: number // 1-7 for cycling power zones, 1-5 for HR/Pace
}

export interface PeakEffort {
  duration: number
  duration_label: string
  start_time: number
  end_time: number
  value: number
  metric: 'power' | 'heartrate' | 'pace'
}

/**
 * Detect intervals in a workout based on power or heart rate data
 * Uses a moving average and threshold-based approach
 */
export function detectIntervals(
  times: number[],
  values: number[],
  metricType: 'power' | 'heartrate' | 'pace',
  threshold?: number // FTP or Threshold Pace/HR
): Interval[] {
  if (!times || !values || times.length !== values.length || times.length === 0) {
    return []
  }

  // 1. Smooth the data (Exponential Moving Average)
  const smoothed = smoothData(values, 10) // 10-second smoothing

  // 2. Determine threshold for "Work" vs "Recovery"
  // If no manual threshold provided, estimate baseline
  const baseline = threshold || calculateBaseline(smoothed)
  
  // For power, work is typically > 75% FTP (Zone 2/3 border)
  // For HR, work is > 70% Max (approx Z2)
  const workThreshold = metricType === 'power' ? baseline * 0.75 : baseline * 0.70

  const intervals: Interval[] = []
  let inInterval = false
  let startIndex = 0
  
  // Minimum duration for an interval (e.g., 30 seconds)
  const minDuration = 30 
  
  // Minimum recovery between intervals (e.g., 15 seconds)
  // Used to merge close intervals
  const minRecovery = 15

  // First pass: Detect candidate intervals
  const candidates: { start: number; end: number }[] = []
  
  for (let i = 0; i < smoothed.length; i++) {
    const isWork = smoothed[i] >= workThreshold
    
    if (isWork && !inInterval) {
      // Start of potential interval
      inInterval = true
      startIndex = i
    } else if (!isWork && inInterval) {
      // End of potential interval
      inInterval = false
      const duration = times[i] - times[startIndex]
      
      if (duration >= minDuration) {
        candidates.push({ start: startIndex, end: i })
      }
    }
  }
  
  // Handle case where workout ends during an interval
  if (inInterval) {
    const duration = times[times.length - 1] - times[startIndex]
    if (duration >= minDuration) {
      candidates.push({ start: startIndex, end: times.length - 1 })
    }
  }
  
  // Second pass: Merge close intervals
  const merged: { start: number; end: number }[] = []
  if (candidates.length > 0) {
    let current = candidates[0]
    
    for (let i = 1; i < candidates.length; i++) {
      const next = candidates[i]
      const gap = times[next.start] - times[current.end]
      
      if (gap < minRecovery) {
        // Merge
        current.end = next.end
      } else {
        merged.push(current)
        current = next
      }
    }
    merged.push(current)
  }
  
  // Third pass: Classify and calculate stats
  // Identify warmup (first segment before first work interval)
  // Identify cooldown (segment after last work interval)
  
  let lastEndIndex = 0
  
  merged.forEach((candidate, index) => {
    // Add recovery/warmup segment before this work interval
    if (candidate.start > lastEndIndex) {
      const type = index === 0 ? 'WARMUP' : 'RECOVERY'
      intervals.push(createIntervalObj(times, values, lastEndIndex, candidate.start, type))
    }
    
    // Add the work interval
    intervals.push(createIntervalObj(times, values, candidate.start, candidate.end, 'WORK'))
    
    lastEndIndex = candidate.end
  })
  
  // Add cooldown if there's data after the last interval
  if (lastEndIndex < times.length - 1) {
    intervals.push(createIntervalObj(times, values, lastEndIndex, times.length - 1, 'COOLDOWN'))
  }
  
  return intervals
}

/**
 * Find peak efforts for standard durations (1min, 5min, 20min, etc.)
 */
export function findPeakEfforts(
  times: number[],
  values: number[],
  metric: 'power' | 'heartrate' | 'pace'
): PeakEffort[] {
  if (!values || values.length === 0) return []
  
  const durations = [
    { sec: 5, label: '5s' },
    { sec: 30, label: '30s' },
    { sec: 60, label: '1m' },
    { sec: 300, label: '5m' },
    { sec: 600, label: '10m' },
    { sec: 1200, label: '20m' },
    { sec: 3600, label: '60m' }
  ]
  
  const peaks: PeakEffort[] = []
  
  // Optimization: Pre-calculate prefix sums for O(1) range sum queries?
  // Since we need max average, a simple sliding window is O(N) per duration.
  
  for (const dur of durations) {
    if (times[times.length - 1] < dur.sec) continue
    
    // Find approximate number of data points for this duration
    // Assuming 1Hz sampling for simplicity, or we check timestamps
    // Robust approach: Sliding window on time
    
    let maxSum = -Infinity
    let bestStartIdx = -1
    let bestEndIdx = -1
    
    let currentSum = 0
    let startPtr = 0
    
    for (let endPtr = 0; endPtr < values.length; endPtr++) {
      currentSum += values[endPtr]
      
      // Shrink window from left until duration is approx correct
      // We want times[endPtr] - times[startPtr] approx dur.sec
      
      while (times[endPtr] - times[startPtr] > dur.sec) {
        currentSum -= values[startPtr]
        startPtr++
      }
      
      // Check if window is valid duration (close enough)
      const windowDuration = times[endPtr] - times[startPtr]
      if (windowDuration >= dur.sec * 0.95) { // Allow slight tolerance
        const avg = currentSum / (endPtr - startPtr + 1)
        if (avg > maxSum) {
          maxSum = avg
          bestStartIdx = startPtr
          bestEndIdx = endPtr
        }
      }
    }
    
    if (bestStartIdx !== -1) {
      peaks.push({
        duration: dur.sec,
        duration_label: dur.label,
        start_time: times[bestStartIdx],
        end_time: times[bestEndIdx],
        value: Math.round(maxSum),
        metric
      })
    }
  }
  
  return peaks
}


// --- Helper Functions ---

function smoothData(data: number[], windowSize: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2))
    const subset = data.slice(start, end)
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length
    result.push(avg)
  }
  return result
}

function calculateBaseline(data: number[]): number {
  // Simple baseline: Median or Mean of non-zero values
  const nonZeros = data.filter(v => v > 0).sort((a, b) => a - b)
  if (nonZeros.length === 0) return 0
  return nonZeros[Math.floor(nonZeros.length / 2)] // Median
}

function createIntervalObj(
  times: number[],
  values: number[],
  startIdx: number,
  endIdx: number,
  type: Interval['type']
): Interval {
  const segmentValues = values.slice(startIdx, endIdx + 1)
  const sum = segmentValues.reduce((a, b) => a + b, 0)
  const avg = sum / segmentValues.length
  const max = Math.max(...segmentValues)
  
  return {
    start_index: startIdx,
    end_index: endIdx,
    start_time: times[startIdx],
    end_time: times[endIdx],
    duration: times[endIdx] - times[startIdx],
    avg_power: avg, // Assumes 'values' is power/metric
    max_power: max,
    type,
    // Add generic average based on what 'values' represents? 
    // In real implementation, we'd pass all streams to calculate all averages
  }
}

/**
 * Calculate basic heart rate recovery (HRR)
 * Looks for the biggest drop in HR over 60s after peak effort
 */
export function calculateHeartRateRecovery(
  times: number[],
  hrValues: number[]
): { peakHr: number; peakTime: number; recoveryHr: number; drops: number } | null {
  if (!hrValues || hrValues.length === 0) return null
  
  // Find max HR index
  let maxHr = -Infinity
  let maxIdx = -1
  
  for (let i = 0; i < hrValues.length; i++) {
    if (hrValues[i] > maxHr) {
      maxHr = hrValues[i]
      maxIdx = i
    }
  }
  
  if (maxIdx === -1) return null
  
  // Look ahead 60 seconds (or closest available)
  const peakTime = times[maxIdx]
  const targetTime = peakTime + 60
  
  let recoveryIdx = -1
  
  for (let i = maxIdx; i < times.length; i++) {
    if (times[i] >= targetTime) {
      recoveryIdx = i
      break
    }
  }
  
  // If workout ended before 60s, take last value
  if (recoveryIdx === -1 && maxIdx < times.length - 1) {
    recoveryIdx = times.length - 1
  }
  
  if (recoveryIdx !== -1) {
    const recoveryHr = hrValues[recoveryIdx]
    return {
      peakHr: maxHr,
      peakTime,
      recoveryHr,
      drops: maxHr - recoveryHr
    }
  }
  
  return null
}
