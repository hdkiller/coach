import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { bodyMeasurementService } from '../../server/utils/services/bodyMeasurementService'

const backfillBodyMeasurementsCommand = new Command('body-measurements')

backfillBodyMeasurementsCommand
  .description('Backfill body measurement ledger entries from existing wellness and profile data.')
  .option('--prod', 'Use production database')
  .option('--user <email>', 'Filter to a specific user email')
  .option('--user-id <uuid>', 'Filter to a specific user ID')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const userEmail = options.user ? String(options.user).trim().toLowerCase() : null
    const userId = options.userId ? String(options.userId).trim() : null

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Database connection string not found.'))
      process.exit(1)
    }

    console.log(
      chalk.yellow(isProd ? '⚠️  Using PRODUCTION database.' : 'Using DEVELOPMENT database.')
    )

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const userFilter = userId ? { id: userId } : userEmail ? { email: userEmail } : {}

      const [wellnessRows, users] = await Promise.all([
        prisma.wellness.findMany({
          where: {
            ...(userId || userEmail ? { user: userFilter } : {}),
            OR: [{ weight: { not: null } }, { bodyFat: { not: null } }]
          },
          select: {
            id: true,
            userId: true,
            date: true,
            weight: true,
            bodyFat: true,
            lastSource: true
          }
        }),
        prisma.user.findMany({
          where: {
            ...userFilter,
            OR: [{ height: { not: null } }, { weight: { not: null } }]
          },
          select: {
            id: true,
            height: true,
            weight: true
          }
        })
      ])

      let wellnessProcessed = 0
      let heightProcessed = 0
      let profileWeightProcessed = 0

      for (const row of wellnessRows) {
        await bodyMeasurementService.recordWellnessMetrics(
          row.userId,
          {
            id: row.id,
            date: row.date,
            weight: row.weight,
            bodyFat: row.bodyFat
          },
          row.lastSource || 'wellness'
        )
        wellnessProcessed++
      }

      for (const user of users) {
        if (user.height != null) {
          await bodyMeasurementService.recordEntry({
            userId: user.id,
            recordedAt: new Date(),
            metricKey: 'height',
            value: user.height,
            unit: 'cm',
            source: 'profile_manual'
          })
          heightProcessed++
        }

        if (user.weight != null) {
          const latestWeight = await prisma.bodyMeasurementEntry.findFirst({
            where: {
              userId: user.id,
              metricKey: 'weight',
              isDeleted: false
            },
            orderBy: { recordedAt: 'desc' }
          })

          if (!latestWeight || Math.abs(latestWeight.value - user.weight) > 0.01) {
            await bodyMeasurementService.recordEntry({
              userId: user.id,
              recordedAt: new Date(),
              metricKey: 'weight',
              value: user.weight,
              unit: 'kg',
              source: 'profile_manual'
            })
            profileWeightProcessed++
          }
        }
      }

      console.log(chalk.green('✅ Body measurements backfill complete.'))
      console.log(`Wellness rows processed: ${wellnessProcessed}`)
      console.log(`Profile heights recorded: ${heightProcessed}`)
      console.log(`Profile weights recorded: ${profileWeightProcessed}`)
      console.log(`Users scanned: ${users.length}`)
    } catch (error) {
      console.error(chalk.red('Error during body measurements backfill:'), error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillBodyMeasurementsCommand
