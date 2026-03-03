import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { sportSettingsRepository } from '../../utils/repositories/sportSettingsRepository'
import { wellnessRepository } from '../../utils/repositories/wellnessRepository'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { getEndOfDayUTC, getUserTimezone } from '../../utils/date'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  try {
    // Get user with cached profile data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        country: true,
        ftp: true,
        weight: true,
        maxHr: true,
        restingHr: true,
        lthr: true,
        dob: true,
        weightUnits: true,
        height: true,
        heightUnits: true,
        profileLastUpdated: true,
        nutritionTrackingEnabled: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Get Sport Settings via Repository (ensures Default exists)
    const sportSettings = await sportSettingsRepository.getByUserId(user.id)
    const defaultProfile = sportSettings.find((s: any) => s.isDefault)
    const timezone = await getUserTimezone(user.id)
    const latestAllowedDate = getEndOfDayUTC(timezone, new Date())

    const [wellness, dailyMetric, latestWeightWellness, latestBodyFatWellness] = await Promise.all([
      // Query most recent wellness record with any meaningful values (not only resting HR)
      prisma.wellness.findFirst({
        where: {
          userId: user.id,
          date: {
            lte: latestAllowedDate
          },
          OR: [
            { restingHr: { not: null } },
            { hrv: { not: null } },
            { weight: { not: null } },
            { bodyFat: { not: null } },
            { readiness: { not: null } },
            { sleepHours: { not: null } },
            { sleepSecs: { not: null } },
            { recoveryScore: { not: null } },
            { spO2: { not: null } },
            { respiration: { not: null } },
            { skinTemp: { not: null } },
            { vo2max: { not: null } },
            { sleepDeepSecs: { not: null } },
            { sleepRemSecs: { not: null } },
            { sleepLightSecs: { not: null } },
            { sleepAwakeSecs: { not: null } },
            { systolic: { not: null } },
            { diastolic: { not: null } }
          ]
        },
        orderBy: { date: 'desc' },
        select: {
          date: true,
          restingHr: true,
          hrv: true,
          weight: true,
          bodyFat: true,
          readiness: true,
          sleepHours: true,
          sleepSecs: true,
          recoveryScore: true,
          spO2: true,
          respiration: true,
          skinTemp: true,
          vo2max: true,
          sleepDeepSecs: true,
          sleepRemSecs: true,
          sleepLightSecs: true,
          sleepAwakeSecs: true,
          systolic: true,
          diastolic: true,
          lastSource: true
        }
      }),
      // Also check DailyMetric as fallback
      prisma.dailyMetric.findFirst({
        where: {
          userId: user.id,
          date: {
            lte: latestAllowedDate
          },
          OR: [
            { restingHr: { not: null } },
            { hrv: { not: null } },
            { sleepScore: { not: null } },
            { hoursSlept: { not: null } },
            { spO2: { not: null } },
            { sleepDeepSecs: { not: null } },
            { sleepRemSecs: { not: null } },
            { sleepLightSecs: { not: null } },
            { sleepAwakeSecs: { not: null } }
          ]
        },
        orderBy: { date: 'desc' },
        select: {
          date: true,
          restingHr: true,
          hrv: true,
          sleepScore: true,
          hoursSlept: true,
          spO2: true,
          sleepDeepSecs: true,
          sleepRemSecs: true,
          sleepLightSecs: true,
          sleepAwakeSecs: true,
          source: true
        }
      }),

      prisma.wellness.findFirst({
        where: {
          userId: user.id,
          date: {
            lte: latestAllowedDate
          },
          weight: { not: null }
        },
        orderBy: { date: 'desc' },
        select: { weight: true }
      }),
      prisma.wellness.findFirst({
        where: {
          userId: user.id,
          date: {
            lte: latestAllowedDate
          },
          bodyFat: { not: null }
        },
        orderBy: { date: 'desc' },
        select: { bodyFat: true }
      })
    ])

    // Determine which record is more recent or use Wellness as primary
    let wellnessData: any = null
    let wellnessDate = null

    if (wellness && dailyMetric) {
      // If we have both, take the more recent one
      if (new Date(wellness.date).getTime() >= new Date(dailyMetric.date).getTime()) {
        wellnessData = wellness
        wellnessDate = wellness.date
      } else {
        // DailyMetric is newer, use that
        wellnessData = {
          date: dailyMetric.date,
          restingHr: dailyMetric.restingHr,
          hrv: dailyMetric.hrv,
          weight: null,
          bodyFat: null,
          readiness: null,
          sleepHours: dailyMetric.hoursSlept,
          sleepSecs: null,
          recoveryScore: dailyMetric.sleepScore,
          spO2: dailyMetric.spO2,
          sleepDeepSecs: dailyMetric.sleepDeepSecs,
          sleepRemSecs: dailyMetric.sleepRemSecs,
          sleepLightSecs: dailyMetric.sleepLightSecs,
          sleepAwakeSecs: dailyMetric.sleepAwakeSecs,
          respiration: null,
          skinTemp: null,
          vo2max: null,
          systolic: null,
          diastolic: null
        }
        wellnessDate = dailyMetric.date
      }
    } else if (wellness) {
      wellnessData = wellness
      wellnessDate = wellness.date
    } else if (dailyMetric) {
      wellnessData = {
        date: dailyMetric.date,
        restingHr: dailyMetric.restingHr,
        hrv: dailyMetric.hrv,
        weight: null,
        bodyFat: null,
        readiness: null,
        sleepHours: dailyMetric.hoursSlept,
        sleepSecs: null,
        recoveryScore: dailyMetric.sleepScore,
        spO2: dailyMetric.spO2,
        sleepDeepSecs: dailyMetric.sleepDeepSecs,
        sleepRemSecs: dailyMetric.sleepRemSecs,
        sleepLightSecs: dailyMetric.sleepLightSecs,
        sleepAwakeSecs: dailyMetric.sleepAwakeSecs,
        respiration: null,
        skinTemp: null,
        vo2max: null,
        systolic: null,
        diastolic: null
      }
      wellnessDate = dailyMetric.date
    }

    // Calculate age from date of birth
    const calculateAge = (dob: Date): number | null => {
      if (!dob) return null
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
      return age
    }

    const age = user.dob ? calculateAge(user.dob) : null
    const estimatedMaxHR = age ? 220 - age : null

    // Use the wellness data we found
    const recentRestingHR = wellnessData?.restingHr ?? null
    const recentHRV = wellnessData?.hrv ?? null
    const recentWeight = latestWeightWellness?.weight ?? user.weight
    const recentBodyFat = latestBodyFatWellness?.bodyFat ?? null
    const recentSleep =
      wellnessData?.sleepHours ??
      (wellnessData?.sleepSecs != null
        ? Math.round((wellnessData.sleepSecs / 3600) * 10) / 10
        : null)
    const recentRecoveryScore = wellnessData?.recoveryScore ?? null
    const wellnessSource = wellnessData?.lastSource || wellnessData?.source || null
    const latestWellnessDate = wellnessDate

    // Additional wellness fields
    const recentSpO2 = wellnessData?.spO2 ?? null
    const recentRespiration = wellnessData?.respiration ?? null
    const recentSkinTemp = wellnessData?.skinTemp ?? null
    const recentVo2max = wellnessData?.vo2max ?? null
    const recentSleepDeep = wellnessData?.sleepDeepSecs ?? null
    const recentSleepRem = wellnessData?.sleepRemSecs ?? null
    const recentSleepLight = wellnessData?.sleepLightSecs ?? null
    const recentSleepAwake = wellnessData?.sleepAwakeSecs ?? null
    const recentSystolic = wellnessData?.systolic ?? null
    const recentDiastolic = wellnessData?.diastolic ?? null
    const recentReadiness = wellnessData?.readiness ?? null

    // Calculate 7-day HRV average if we have wellness data
    let avgRecentHRV = null
    if (wellnessDate) {
      const sevenDaysAgo = new Date(wellnessDate)
      sevenDaysAgo.setDate(wellnessDate.getDate() - 7)

      const weekWellness = await wellnessRepository.getForUser(user.id, {
        startDate: sevenDaysAgo,
        endDate: wellnessDate,
        select: {
          hrv: true
        }
      })

      const hrvValues = weekWellness.map((w) => w.hrv).filter((v) => v != null) as number[]

      if (hrvValues.length > 0) {
        avgRecentHRV = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
      }
    }

    // Check if user has any reports
    const reportCount = await prisma.report.count({
      where: {
        userId: user.id,
        status: 'COMPLETED'
      }
    })

    // Get user's integrations
    const integrations = await prisma.integration.findMany({
      where: { userId: user.id },
      select: {
        provider: true,
        lastSyncAt: true
      }
    })

    // Check data sync status for different categories
    const [workoutCount, nutritionCount, wellnessCount, latestWorkout] = await Promise.all([
      workoutRepository.count(user.id, { includeDuplicates: true }), // Match original behavior counting all
      nutritionRepository.count(user.id),
      wellnessRepository.count(user.id),
      prisma.workout.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        select: { date: true }
      })
    ])

    // Determine which integrations provide data for each category
    const workoutProviders: string[] = []
    const nutritionProviders: string[] = []
    const wellnessProviders: string[] = []

    for (const integration of integrations) {
      switch (integration.provider) {
        case 'intervals':
          workoutProviders.push('Intervals.icu')
          wellnessProviders.push('Intervals.icu')
          break
        case 'strava':
          workoutProviders.push('Strava')
          break
        case 'yazio':
          nutritionProviders.push('Yazio')
          break
        case 'whoop':
          wellnessProviders.push('Whoop')
          break
        case 'garmin':
          workoutProviders.push('Garmin')
          wellnessProviders.push('Garmin')
          break
      }
    }

    // Identify missing critical fields
    const missingFields: string[] = []
    const effectiveFtp = defaultProfile?.ftp || user.ftp
    const effectiveMaxHr = defaultProfile?.maxHr || user.maxHr
    const effectiveRestingHr = recentRestingHR || defaultProfile?.restingHr || user.restingHr

    if (!effectiveFtp) missingFields.push('Functional Threshold Power (FTP)')
    if (!recentWeight) missingFields.push('Weight')
    if (!effectiveMaxHr || !effectiveRestingHr) missingFields.push('Heart Rate Settings (HRR)')

    // Check if default profile has zones configured
    if (
      !defaultProfile ||
      !defaultProfile.hrZones ||
      (defaultProfile.hrZones as any[]).length === 0
    ) {
      missingFields.push('Training Zones')
    }

    const response = {
      connected: true,
      hasReports: reportCount > 0,
      missingFields,
      dataSyncStatus: {
        workouts: workoutCount > 0,
        nutrition: nutritionCount > 0,
        wellness: wellnessCount > 0,
        workoutCount,
        nutritionCount,
        wellnessCount,
        workoutProviders,
        nutritionProviders,
        wellnessProviders
      },
      profile: {
        name: user.name,
        country: user.country,
        age: age,
        weight: recentWeight,
        weightUnits: user.weightUnits,
        height: user.height,
        heightUnits: user.heightUnits,
        ftp: effectiveFtp,
        restingHr: effectiveRestingHr,
        maxHr: effectiveMaxHr,
        estimatedMaxHR,
        recentHRV,
        lthr: defaultProfile?.lthr || user.lthr,
        avgRecentHRV: avgRecentHRV ? Math.round(avgRecentHRV * 10) / 10 : null,
        recentSleep,
        recentBodyFat,
        recentRecoveryScore,
        recentSpO2,
        recentRespiration,
        recentSkinTemp,
        recentVo2max,
        recentSleepDeep,
        recentSleepRem,
        recentSleepLight,
        recentSleepAwake,
        recentSystolic,
        recentDiastolic,
        recentReadiness,
        wellnessSource,
        latestWellnessDate: latestWellnessDate?.toISOString() ?? null,

        profileLastUpdated: user.profileLastUpdated?.toISOString() ?? null,
        latestWorkoutDate: latestWorkout?.date.toISOString() ?? null,
        nutritionTrackingEnabled: user.nutritionTrackingEnabled,
        sportSettings // Return for frontend context
      }
    }

    return response
  } catch (error) {
    console.error('Error fetching dashboard profile:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch profile data'
    })
  }
})
