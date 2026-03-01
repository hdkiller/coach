import { prisma } from '../db'
import { findPeakEfforts } from '../interval-detection'
import { logger } from '@trigger.dev/sdk/v3'

export interface PersonalBestCandidate {
  type: string
  category: 'RUN' | 'CYCLE' | 'SWIM' | 'OTHER'
  value: number
  unit: string
  label: string
}

export const pbDetectionService = {
  /**
   * Analyze a workout's streams to detect new Personal Bests
   */
  async detectPBs(workoutId: string) {
    logger.log('Starting PB detection', { workoutId })

    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        streams: true,
        user: true
      }
    })

    if (!workout || !workout.streams || !workout.user) {
      return null
    }

    const candidates: PersonalBestCandidate[] = []
    const workoutType = (workout.type || '').toLowerCase()
    const isRun = workoutType.includes('run')
    const isBike =
      workoutType.includes('ride') || workoutType.includes('bike') || workoutType.includes('cycle')

    // 1. POWER PEAKS (Cycling or Running with Power)
    if (
      workout.streams.watts &&
      Array.isArray(workout.streams.watts) &&
      Array.isArray(workout.streams.time)
    ) {
      const powerPeaks = findPeakEfforts(
        workout.streams.time as number[],
        workout.streams.watts as number[],
        'power'
      )

      for (const peak of powerPeaks) {
        candidates.push({
          type: `POWER_${peak.duration_label.toUpperCase()}`,
          category: isBike ? 'CYCLE' : isRun ? 'RUN' : 'OTHER',
          value: peak.value,
          unit: 'W',
          label: `Peak ${peak.duration_label} Power`
        })
      }
    }

    // 2. RUNNING PACE PEAKS (Distance-based)
    if (
      isRun &&
      workout.streams.distance &&
      Array.isArray(workout.streams.distance) &&
      Array.isArray(workout.streams.time)
    ) {
      const pacePBs = this.findFastestDistanceSegments(
        workout.streams.time as number[],
        workout.streams.distance as number[]
      )
      candidates.push(...pacePBs)
    }

    // 3. ELEVATION PEAKS
    if (workout.elevationGain && workout.elevationGain > 0) {
      candidates.push({
        type: 'ELEVATION_GAIN',
        category: isBike ? 'CYCLE' : isRun ? 'RUN' : 'OTHER',
        value: workout.elevationGain,
        unit: 'm',
        label: 'Max Elevation Gain'
      })
    }

    // 4. PROCESS CANDIDATES
    const achievements: any[] = []

    for (const candidate of candidates) {
      const isNewBest = await this.processCandidate(
        workout.userId,
        workout.id,
        workout.date,
        candidate
      )
      if (isNewBest) {
        achievements.push(candidate)
      }
    }

    return achievements
  },

  /**
   * Find fastest time for standard distances (m)
   */
  findFastestDistanceSegments(times: number[], distances: number[]): PersonalBestCandidate[] {
    const targets = [
      { dist: 400, label: '400m', type: 'RUN_400M' },
      { dist: 1000, label: '1km', type: 'RUN_1K' },
      { dist: 1609, label: '1mi', type: 'RUN_1MI' },
      { dist: 5000, label: '5km', type: 'RUN_5K' },
      { dist: 10000, label: '10km', type: 'RUN_10K' },
      { dist: 21097, label: 'Half Marathon', type: 'RUN_HM' },
      { dist: 42195, label: 'Marathon', type: 'RUN_MARATHON' }
    ]

    const results: PersonalBestCandidate[] = []
    const maxWorkoutDist = distances[distances.length - 1] || 0

    for (const target of targets) {
      if (maxWorkoutDist < target.dist) continue

      let minTime = Infinity
      let startPtr = 0

      for (let endPtr = 0; endPtr < distances.length; endPtr++) {
        // Move start pointer forward until distance is exactly or just under target
        while (distances[endPtr] - distances[startPtr] > target.dist) {
          const duration = times[endPtr] - times[startPtr]
          if (duration < minTime) {
            minTime = duration
          }
          startPtr++
        }

        // Final check for the segment ending at endPtr
        if (distances[endPtr] - distances[startPtr] >= target.dist * 0.998) {
          // 0.2% tolerance
          const duration = times[endPtr] - times[startPtr]
          if (duration < minTime) minTime = duration
        }
      }

      if (minTime !== Infinity && minTime > 0) {
        results.push({
          type: target.type,
          category: 'RUN',
          value: minTime, // We store time (s) for pace PBs
          unit: 's',
          label: `Fastest ${target.label}`
        })
      }
    }

    return results
  },

  /**
   * Check if a candidate beats the current record and save it
   */
  async processCandidate(
    userId: string,
    workoutId: string,
    date: Date,
    candidate: PersonalBestCandidate
  ): Promise<boolean> {
    const existing = await prisma.personalBest.findUnique({
      where: {
        userId_type: {
          userId,
          type: candidate.type
        }
      }
    })

    // For Power and Elevation, HIGHER is better
    // For Pace/Time (unit: 's'), LOWER is better
    const isPace = candidate.unit === 's'
    const isImprovement =
      !existing || (isPace ? candidate.value < existing.value : candidate.value > existing.value)

    if (isImprovement) {
      await prisma.personalBest.upsert({
        where: {
          userId_type: {
            userId,
            type: candidate.type
          }
        },
        update: {
          value: candidate.value,
          workoutId,
          date,
          category: candidate.category,
          unit: candidate.unit
        },
        create: {
          userId,
          type: candidate.type,
          category: candidate.category,
          value: candidate.value,
          unit: candidate.unit,
          workoutId,
          date
        }
      })

      // Log achievement to MetricHistory
      await prisma.metricHistory.create({
        data: {
          userId,
          type: `PB_${candidate.type}`,
          value: candidate.value,
          oldValue: existing?.value || null,
          workoutId,
          source: 'AUTOMATIC',
          date,
          notes: `New Personal Best: ${candidate.label}`
        }
      })

      return true
    }

    return false
  }
}
