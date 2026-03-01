import { prisma } from '../db'
import { sportSettingsRepository } from '../repositories/sportSettingsRepository'
import { findPeakEfforts } from '../interval-detection'
import { createUserNotification } from '../notifications'
import { queueThresholdUpdateEmail } from '../workout-insight-email'
import { logger } from '@trigger.dev/sdk/v3'

export const thresholdDetectionService = {
  /**
   * Detect potential new thresholds (LTHR, FTP) from workout data
   */
  async detectThresholdIncreases(workoutId: string, options: { dryRun?: boolean } = {}) {
    const { dryRun = false } = options
    logger.log('Starting threshold detection', { workoutId, dryRun })

    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        streams: true,
        user: {
          select: {
            id: true,
            name: true,
            lthr: true,
            ftp: true,
            maxHr: true
          }
        }
      }
    })

    if (!workout || !workout.streams || !workout.user) {
      logger.log('Threshold detection skipped: missing data or streams', {
        hasWorkout: !!workout,
        hasStreams: !!workout?.streams,
        hasUser: !!workout?.user
      })
      return null
    }

    const castWorkout = workout as any

    const results = {
      lthr: null as { old: number; new: number; detected: boolean } | null,
      ftp: null as { old: number; new: number; detected: boolean } | null,
      maxHr: null as { old: number; new: number; detected: boolean } | null,
      thresholdPace: null as { old: number; new: number; detected: boolean } | null,
      minDurationMet: false,
      workoutDurationSec: workout.durationSec,
      workoutType: workout.type
    }

    // 1. Fetch Sport Settings for this workout type
    const sportSettings = await sportSettingsRepository.getForActivityType(
      workout.userId,
      workout.type || ''
    )

    const currentLthr = sportSettings?.lthr || workout.user.lthr
    const currentFtp = sportSettings?.ftp || workout.user.ftp
    const currentMaxHr = sportSettings?.maxHr || (workout.user as any).maxHr
    const currentThresholdPace = sportSettings?.thresholdPace

    // 2. Heart Rate Threshold & Max HR Detection
    if (
      workout.streams.heartrate &&
      Array.isArray(workout.streams.heartrate) &&
      Array.isArray(workout.streams.time)
    ) {
      // MAX HR DETECTION
      const workoutMaxHr = workout.maxHr || Math.max(...(workout.streams.heartrate as number[]))
      if (currentMaxHr && workoutMaxHr > currentMaxHr) {
        results.maxHr = { old: currentMaxHr, new: workoutMaxHr, detected: true }
        if (!dryRun) {
          await this.createThresholdRecommendation(
            workout.userId,
            workout.id,
            'MAX_HR',
            currentMaxHr,
            workoutMaxHr,
            workoutMaxHr
          )
          await createUserNotification(workout.userId, {
            title: 'New Max Heart Rate Detected',
            message: `We detected a new peak heart rate of ${workoutMaxHr} bpm during your last workout.`,
            icon: 'i-heroicons-heart',
            link: `/workouts/${workout.id}`
          })
        }
      }

      // LTHR DETECTION
      const hrPeaks = findPeakEfforts(
        workout.streams.time as number[],
        workout.streams.heartrate as number[],
        'heartrate'
      )

      const peak20mHR = hrPeaks.find((p) => p.duration === 1200)?.value

      if (peak20mHR && currentLthr) {
        // Industry standard (TrainingPeaks): LTHR is estimated as 95% of peak 20m HR
        // unless it's a specific 30m test protocol. For auto-detection, 95% is more accurate.
        const estimatedLthr = Math.round(peak20mHR * 0.95)

        const workoutType = (workout.type || '').toLowerCase()
        const isRun = workoutType.includes('run')
        const isBike =
          workoutType.includes('ride') ||
          workoutType.includes('bike') ||
          workoutType.includes('cycle')

        const minDurationSec = isRun ? 40 * 60 : isBike ? 50 * 60 : 30 * 60
        const minMet = workout.durationSec >= minDurationSec

        results.minDurationMet = minMet

        if (estimatedLthr > currentLthr && minMet) {
          results.lthr = { old: currentLthr, new: estimatedLthr, detected: true }

          if (!dryRun) {
            await this.createThresholdRecommendation(
              workout.userId,
              workout.id,
              'LTHR',
              currentLthr,
              estimatedLthr,
              peak20mHR
            )

            await createUserNotification(workout.userId, {
              title: 'New Heart Rate Threshold Detected',
              message: `Congratulations! Based on your workout "${workout.title}", we've detected a new threshold heart rate of ${estimatedLthr} bpm (previous: ${currentLthr} bpm).`,
              icon: 'i-heroicons-bolt',
              link: `/workouts/${workout.id}`
            })
          }
        } else {
          results.lthr = { old: currentLthr, new: estimatedLthr, detected: false }
        }
      }
    }

    // 3. Power Threshold (FTP) & Power Peaks Detection
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

      const peak20mPower = powerPeaks.find((p) => p.duration === 1200)?.value

      if (peak20mPower && currentFtp) {
        const estimatedFtp = Math.round(peak20mPower * 0.95)

        if (estimatedFtp > currentFtp) {
          results.ftp = { old: currentFtp, new: estimatedFtp, detected: true }

          if (!dryRun) {
            await this.createThresholdRecommendation(
              workout.userId,
              workout.id,
              'FTP',
              currentFtp,
              estimatedFtp,
              peak20mPower
            )

            await createUserNotification(workout.userId, {
              title: 'New FTP Detected',
              message: `Great job! Based on your 20-minute effort, we've detected a potential new FTP of ${estimatedFtp}W (previous: ${currentFtp}W).`,
              icon: 'i-heroicons-fire',
              link: `/workouts/${workout.id}`
            })
          }
        } else {
          results.ftp = { old: currentFtp, new: estimatedFtp, detected: false }
        }
      }

      // LOG POWER PEAKS (5s, 1m, 5m)
      const peak5s = powerPeaks.find((p) => p.duration === 5)?.value
      const peak1m = powerPeaks.find((p) => p.duration === 60)?.value
      const peak5m = powerPeaks.find((p) => p.duration === 300)?.value

      if (!dryRun) {
        const peakLogs = []
        if (peak5s)
          peakLogs.push({
            userId: workout.userId,
            type: 'PEAK_POWER_5S',
            value: peak5s,
            oldValue: null,
            workoutId: workout.id,
            date: workout.date,
            source: 'AUTOMATIC'
          })
        if (peak1m)
          peakLogs.push({
            userId: workout.userId,
            type: 'PEAK_POWER_1M',
            value: peak1m,
            oldValue: null,
            workoutId: workout.id,
            date: workout.date,
            source: 'AUTOMATIC'
          })
        if (peak5m)
          peakLogs.push({
            userId: workout.userId,
            type: 'PEAK_POWER_5M',
            value: peak5m,
            oldValue: null,
            workoutId: workout.id,
            date: workout.date,
            source: 'AUTOMATIC'
          })
        if (peakLogs.length > 0) {
          await prisma.metricHistory.createMany({ data: peakLogs })
        }
      }
    }

    // 4. Threshold Pace Detection (Running)
    const workoutType = (workout.type || '').toLowerCase()
    if (
      workoutType.includes('run') &&
      workout.streams.velocity &&
      Array.isArray(workout.streams.velocity) &&
      Array.isArray(workout.streams.time)
    ) {
      const pacePeaks = findPeakEfforts(
        workout.streams.time as number[],
        workout.streams.velocity as number[],
        'pace'
      )
      const peak40mPace = pacePeaks.find((p) => p.duration === 2400)?.value // 40m

      if (peak40mPace) {
        const detectedPacePerKm = 1000 / peak40mPace // s/km
        const effectiveOldPace =
          currentThresholdPace || (castWorkout.thresholdPace ? castWorkout.thresholdPace : null)

        if (!effectiveOldPace || detectedPacePerKm < effectiveOldPace - 2) {
          // 2s improvement
          results.thresholdPace = {
            old: effectiveOldPace || 0,
            new: detectedPacePerKm,
            detected: true
          }
          if (!dryRun) {
            await this.createThresholdRecommendation(
              workout.userId,
              workout.id,
              'THRESHOLD_PACE',
              effectiveOldPace || 0,
              detectedPacePerKm,
              peak40mPace
            )
          }
        } else {
          results.thresholdPace = { old: effectiveOldPace, new: detectedPacePerKm, detected: false }
        }
      }
    }

    return results
  },

  /**
   * Create a recommendation record for a threshold update
   */
  async createThresholdRecommendation(
    userId: string,
    workoutId: string,
    metric: 'LTHR' | 'FTP' | 'MAX_HR' | 'THRESHOLD_PACE',
    oldValue: number,
    newValue: number,
    peakValue: number
  ) {
    let title = `New ${metric} Threshold Detected`
    let description = ''
    const unit = metric === 'FTP' ? 'W' : metric === 'THRESHOLD_PACE' ? 's/km' : ' bpm'

    if (metric === 'LTHR') {
      description = `Your LTHR has increased from ${oldValue} to ${newValue} bpm.`
    } else if (metric === 'FTP') {
      description = `Your FTP has increased from ${oldValue}W to ${newValue}W.`
    } else if (metric === 'MAX_HR') {
      title = `New Peak Heart Rate Detected`
      description = `We detected a new max heart rate of ${newValue} bpm (previous: ${oldValue} bpm).`
    } else if (metric === 'THRESHOLD_PACE') {
      title = `New Threshold Pace Detected`
      description = `Your threshold pace has improved to ${Math.floor(newValue / 60)}:${String(Math.floor(newValue % 60)).padStart(2, '0')}/km.`
    }

    // Check if an active recommendation for this metric already exists to avoid spamming
    const existing = await prisma.recommendation.findFirst({
      where: {
        userId,
        metric,
        status: 'ACTIVE',
        sourceType: 'workout'
      }
    })

    if (existing) {
      // Update existing recommendation
      await prisma.recommendation.update({
        where: { id: existing.id },
        data: {
          title,
          description,
          generatedAt: new Date(),
          history: {
            oldValue,
            newValue,
            workoutId
          }
        }
      })
    } else {
      // Create new
      await prisma.recommendation.create({
        data: {
          userId,
          sourceType: 'workout',
          metric,
          period: 0, // Current/Immediate
          title,
          description,
          priority: 'HIGH',
          category: 'Metrics',
          status: 'ACTIVE',
          history: {
            oldValue,
            newValue,
            workoutId
          }
        }
      })
    }

    // Always log to history table for permanent record
    await prisma.metricHistory.create({
      data: {
        userId,
        type: metric,
        value: newValue,
        oldValue,
        workoutId,
        source: 'AUTOMATIC',
        date: new Date()
      }
    })

    // Queue email notification
    try {
      await queueThresholdUpdateEmail({
        userId,
        workoutId,
        metric,
        oldValue,
        newValue,
        unit,
        peakValue
      })
    } catch (err) {
      logger.warn('Failed to queue threshold email', { userId, workoutId, metric, error: err })
    }
  }
}
