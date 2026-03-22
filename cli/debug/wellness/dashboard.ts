import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const dashboardCommand = new Command('dashboard')

dashboardCommand
  .description('Simulate the dashboard wellness/profile payload for a user')
  .requiredOption('--user <identifier>', 'User ID or email')
  .option('--prod', 'Use production database')
  .option(
    '--now <iso>',
    'Override the current time used for timezone/day-gating checks (ISO timestamp)'
  )
  .option('--mode <mode>', 'Simulation mode: current, proposed, or compare', 'compare')
  .option('--json', 'Output raw JSON instead of formatted text')
  .action(async (options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    const asOf = options.now ? new Date(options.now) : new Date()
    if (Number.isNaN(asOf.getTime())) {
      console.error(chalk.red(`Invalid --now value: ${options.now}`))
      process.exit(1)
    }
    if (!['current', 'proposed', 'compare'].includes(options.mode)) {
      console.error(chalk.red(`Invalid --mode value: ${options.mode}`))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      process.env.DATABASE_URL = connectionString
      globalThis.prismaGlobalV2 = prisma

      const [{ bodyMetricResolver }, { wellnessRepository }, dateUtils, { normalizeStressScore }] =
        await Promise.all([
          import('../../../server/utils/services/bodyMetricResolver'),
          import('../../../server/utils/repositories/wellnessRepository'),
          import('../../../server/utils/date'),
          import('../../../server/utils/wellness')
        ])

      const { formatDateUTC, getEndOfDayUTC, getUserLocalDate, getUserTimezone } = dateUtils

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: options.user }, { email: options.user }]
        },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
          country: true,
          dob: true,
          weight: true,
          weightUnits: true,
          weightSourceMode: true,
          height: true,
          heightUnits: true,
          ftp: true,
          restingHr: true,
          maxHr: true,
          lthr: true,
          nutritionTrackingEnabled: true,
          language: true,
          profileLastUpdated: true,
          dashboardSettings: true
        }
      })

      if (!user) {
        console.error(chalk.red(`User not found: ${options.user}`))
        process.exit(1)
      }

      const timezone = await getUserTimezone(user.id)
      const latestAllowedDate = getEndOfDayUTC(timezone, asOf)

      const [wellness, dailyMetric, latestBodyFatWellness, effectiveWeight] = await Promise.all([
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
              { diastolic: { not: null } },
              { fatigue: { not: null } },
              { stress: { not: null } },
              { mood: { not: null } }
            ]
          },
          orderBy: { date: 'desc' },
          select: {
            id: true,
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
            fatigue: true,
            stress: true,
            mood: true,
            lastSource: true
          }
        }),
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
            id: true,
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
            bodyFat: { not: null }
          },
          orderBy: { date: 'desc' },
          select: { bodyFat: true }
        }),
        bodyMetricResolver.resolveEffectiveWeight(user.id, {
          weight: user.weight,
          weightSourceMode: user.weightSourceMode,
          weightUnits: user.weightUnits
        })
      ])

      let wellnessData: any = null
      let wellnessDate: Date | null = null
      let selectedSource: 'wellness' | 'dailyMetric' | 'none' = 'none'

      if (wellness && dailyMetric) {
        if (new Date(wellness.date).getTime() >= new Date(dailyMetric.date).getTime()) {
          wellnessData = wellness
          wellnessDate = wellness.date
          selectedSource = 'wellness'
        } else {
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
            diastolic: null,
            fatigue: null,
            stress: null,
            mood: null,
            source: dailyMetric.source,
            id: dailyMetric.id
          }
          wellnessDate = dailyMetric.date
          selectedSource = 'dailyMetric'
        }
      } else if (wellness) {
        wellnessData = wellness
        wellnessDate = wellness.date
        selectedSource = 'wellness'
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
          diastolic: null,
          fatigue: null,
          stress: null,
          mood: null,
          source: dailyMetric.source,
          id: dailyMetric.id
        }
        wellnessDate = dailyMetric.date
        selectedSource = 'dailyMetric'
      }

      const todayLocal = getUserLocalDate(timezone, asOf)
      const latestWellnessDateKey = wellnessDate ? formatDateUTC(wellnessDate, 'yyyy-MM-dd') : null
      const todayLocalKey = formatDateUTC(todayLocal, 'yyyy-MM-dd')
      const hasCurrentDayWellness = latestWellnessDateKey === todayLocalKey

      let avgRecentHRV: number | null = null
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

        const hrvValues = weekWellness
          .map((w: any) => w.hrv)
          .filter((v: any) => v != null) as number[]
        if (hrvValues.length > 0) {
          avgRecentHRV = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
        }
      }

      const displayWeight =
        effectiveWeight.value == null
          ? null
          : user.weightUnits === 'Pounds'
            ? effectiveWeight.value / 0.45359237
            : effectiveWeight.value

      const latestAvailableSleep =
        wellnessData?.sleepHours ??
        (wellnessData?.sleepSecs != null
          ? Math.round((wellnessData.sleepSecs / 3600) * 10) / 10
          : null)

      const buildDashboardProfile = (gateToCurrentDay: boolean) => ({
        recentHRV: wellnessData?.hrv ?? null,
        avgRecentHRV: avgRecentHRV != null ? Math.round(avgRecentHRV * 10) / 10 : null,
        recentSleep: !gateToCurrentDay || hasCurrentDayWellness ? latestAvailableSleep : null,
        recentRecoveryScore:
          !gateToCurrentDay || hasCurrentDayWellness ? (wellnessData?.recoveryScore ?? null) : null,
        recentReadiness:
          !gateToCurrentDay || hasCurrentDayWellness ? (wellnessData?.readiness ?? null) : null,
        recentFatigue:
          !gateToCurrentDay || hasCurrentDayWellness ? (wellnessData?.fatigue ?? null) : null,
        recentStress:
          !gateToCurrentDay || hasCurrentDayWellness
            ? normalizeStressScore(wellnessData?.stress ?? null)
            : null,
        recentMood:
          !gateToCurrentDay || hasCurrentDayWellness ? (wellnessData?.mood ?? null) : null,
        recentSpO2: wellnessData?.spO2 ?? null,
        recentRespiration: wellnessData?.respiration ?? null,
        recentSkinTemp: wellnessData?.skinTemp ?? null,
        recentVo2max: wellnessData?.vo2max ?? null,
        recentBodyFat: latestBodyFatWellness?.bodyFat ?? null,
        wellnessSource: wellnessData?.lastSource || wellnessData?.source || null,
        latestWellnessDate: wellnessDate?.toISOString() ?? null
      })

      const currentDashboardProfile = buildDashboardProfile(true)
      const proposedDashboardProfile = buildDashboardProfile(false)

      const fieldDiff = Object.fromEntries(
        Object.keys(proposedDashboardProfile).map((key) => [
          key,
          {
            current: (currentDashboardProfile as any)[key],
            proposed: (proposedDashboardProfile as any)[key],
            changed:
              JSON.stringify((currentDashboardProfile as any)[key]) !==
              JSON.stringify((proposedDashboardProfile as any)[key])
          }
        ])
      )

      const result = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          timezone,
          country: user.country,
          weight: user.weight,
          weightUnits: user.weightUnits,
          weightSourceMode: user.weightSourceMode,
          preferredWeightSource:
            (user.dashboardSettings as any)?.bodyMetrics?.preferredSources?.weight ?? null,
          profileLastUpdated: user.profileLastUpdated?.toISOString() ?? null
        },
        asOf: {
          now: asOf.toISOString(),
          latestAllowedDate: latestAllowedDate.toISOString(),
          todayLocalKey
        },
        selection: {
          selectedSource,
          latestWellnessDateKey,
          hasCurrentDayWellness,
          gatingNote: hasCurrentDayWellness
            ? null
            : 'Dashboard suppresses sleep/recovery/readiness/fatigue/stress/mood when latest wellness is not on the athlete local current day.'
        },
        proposal: {
          assumption:
            'Proposed mode assumes latest available wellness should be shown even when it is not on the athlete local current day.',
          mode: options.mode
        },
        chosenRecord: wellnessData
          ? {
              id: wellnessData.id ?? null,
              date: wellnessDate?.toISOString() ?? null,
              source: wellnessData.lastSource || wellnessData.source || null,
              hrv: wellnessData.hrv ?? null,
              sleepHours: wellnessData.sleepHours ?? null,
              sleepSecs: wellnessData.sleepSecs ?? null,
              recoveryScore: wellnessData.recoveryScore ?? null,
              readiness: wellnessData.readiness ?? null,
              stress: wellnessData.stress ?? null,
              weight: wellnessData.weight ?? null
            }
          : null,
        effectiveWeight: {
          storedKg: effectiveWeight.value,
          displayValue: displayWeight == null ? null : Number(displayWeight.toFixed(1)),
          displayUnit: user.weightUnits === 'Pounds' ? 'lbs' : 'kg',
          profileWeightKg: effectiveWeight.profileWeight,
          latestWellnessWeightKg: effectiveWeight.latestWellnessWeight,
          source: effectiveWeight.source,
          weightSourceMode: effectiveWeight.weightSourceMode
        },
        dashboardProfile: {
          current: currentDashboardProfile,
          proposed: proposedDashboardProfile,
          diff: fieldDiff
        }
      }

      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }

      console.log(
        isProd
          ? chalk.yellow('Using PRODUCTION database.')
          : chalk.blue('Using DEVELOPMENT database.')
      )
      console.log(chalk.bold(`\nDashboard Simulation for ${user.name || user.email}`))
      console.log(`${chalk.gray('User:')} ${user.email} (${user.id})`)
      console.log(`${chalk.gray('Timezone:')} ${timezone}`)
      console.log(`${chalk.gray('As of:')} ${asOf.toISOString()}`)
      console.log(`${chalk.gray('Local day key:')} ${todayLocalKey}`)

      console.log(chalk.bold('\nSelection'))
      console.log(`${chalk.gray('Chosen source:')} ${selectedSource}`)
      console.log(`${chalk.gray('Latest wellness day:')} ${latestWellnessDateKey || 'none'}`)
      console.log(
        `${chalk.gray('hasCurrentDayWellness:')} ${
          hasCurrentDayWellness ? chalk.green('true') : chalk.yellow('false')
        }`
      )
      if (!hasCurrentDayWellness) {
        console.log(
          chalk.yellow(
            'Sleep/recovery/readiness/fatigue/stress/mood will be hidden by the current dashboard API.'
          )
        )
      }

      console.log(chalk.bold('\nWeight'))
      console.log(`${chalk.gray('Profile weight (stored):')} ${user.weight ?? 'null'} kg`)
      console.log(
        `${chalk.gray('Preferred source:')} ${
          (user.dashboardSettings as any)?.bodyMetrics?.preferredSources?.weight ?? 'auto'
        }`
      )
      console.log(
        `${chalk.gray('Effective dashboard weight:')} ${
          result.effectiveWeight.storedKg ?? 'null'
        } kg -> ${result.effectiveWeight.displayValue ?? 'null'} ${result.effectiveWeight.displayUnit}`
      )
      console.log(
        `${chalk.gray('Resolved from:')} ${
          effectiveWeight.source.label
        } (${effectiveWeight.source.source}${effectiveWeight.source.date ? ` @ ${effectiveWeight.source.date}` : ''})`
      )

      console.log(chalk.bold('\nDashboard Fields'))
      const printProfile = (title: string, profile: Record<string, unknown>) => {
        console.log(chalk.bold(`\n${title}`))
        console.log(`${chalk.gray('HRV:')} ${profile.recentHRV ?? 'null'}`)
        console.log(`${chalk.gray('7d Avg HRV:')} ${profile.avgRecentHRV ?? 'null'}`)
        console.log(`${chalk.gray('Sleep:')} ${profile.recentSleep ?? 'null'}`)
        console.log(`${chalk.gray('Recovery:')} ${profile.recentRecoveryScore ?? 'null'}`)
        console.log(`${chalk.gray('Readiness:')} ${profile.recentReadiness ?? 'null'}`)
        console.log(`${chalk.gray('Stress:')} ${profile.recentStress ?? 'null'}`)
        console.log(`${chalk.gray('Mood:')} ${profile.recentMood ?? 'null'}`)
        console.log(`${chalk.gray('SpO2:')} ${profile.recentSpO2 ?? 'null'}`)
        console.log(`${chalk.gray('Wellness source:')} ${profile.wellnessSource ?? 'null'}`)
        console.log(`${chalk.gray('Latest wellness ISO:')} ${profile.latestWellnessDate ?? 'null'}`)
      }

      if (options.mode === 'current' || options.mode === 'compare') {
        printProfile('Current Dashboard Fields', result.dashboardProfile.current)
      }

      if (options.mode === 'proposed' || options.mode === 'compare') {
        printProfile('Proposed Dashboard Fields', result.dashboardProfile.proposed)
      }

      if (options.mode === 'compare') {
        const changedFields = Object.entries(result.dashboardProfile.diff).filter(
          ([, value]) => (value as any).changed
        )
        console.log(chalk.bold('\nChanged Fields'))
        if (changedFields.length === 0) {
          console.log(chalk.gray('No changes between current and proposed output.'))
        } else {
          for (const [key, value] of changedFields) {
            console.log(
              `${chalk.gray(key)}: ${chalk.yellow(JSON.stringify((value as any).current))} -> ${chalk.green(
                JSON.stringify((value as any).proposed)
              )}`
            )
          }
        }
      }

      if (result.chosenRecord) {
        console.log(chalk.bold('\nChosen Record Snapshot'))
        console.log(JSON.stringify(result.chosenRecord, null, 2))
      }
    } catch (error: any) {
      console.error(chalk.red('Error simulating dashboard:'), error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default dashboardCommand
