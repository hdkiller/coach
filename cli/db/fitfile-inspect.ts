import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
import {
  parseFitFile,
  extractFitStreams,
  normalizeFitSession,
  reconstructSessionFromRecords
} from '../../server/utils/fit'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

function getArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function getKeyCounts(items: any[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    for (const key of Object.keys(item)) {
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ''
}

const fitFileInspectCommand = new Command('fitfile-inspect')
  .description('Inspect a FitFile record by ID and show extractable data')
  .argument('<fitFileId>', 'FitFile ID')
  .option('--prod', 'Use production database')
  .option('--top-keys <n>', 'Number of top record keys to show', '40')
  .action(async (fitFileId: string, options: { prod?: boolean; topKeys?: string }) => {
    const isProd = !!options.prod
    const topKeys = Math.max(1, parseInt(String(options.topKeys || '40'), 10) || 40)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Missing DATABASE_URL or DATABASE_URL_PROD in environment'))
      process.exit(1)
    }

    if (isProd) {
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const fitFile = await prisma.fitFile.findUnique({
        where: { id: fitFileId },
        include: {
          user: { select: { id: true, email: true } },
          workout: { select: { id: true, source: true, externalId: true, title: true, date: true } }
        }
      })

      if (!fitFile) {
        console.error(chalk.red(`FitFile not found: ${fitFileId}`))
        process.exit(1)
      }

      const buffer = Buffer.from(fitFile.fileData)
      const fitData = await parseFitFile(buffer)
      const records = Array.isArray(fitData.records) ? fitData.records : []
      const sessions = Array.isArray(fitData.sessions) ? fitData.sessions : []
      const laps = Array.isArray(fitData.laps) ? fitData.laps : []
      const events = Array.isArray(fitData.events) ? fitData.events : []
      const deviceInfos = Array.isArray((fitData as any).device_infos)
        ? (fitData as any).device_infos
        : []

      const session = sessions[0] || reconstructSessionFromRecords(records)
      const normalized = session
        ? normalizeFitSession(session, fitFile.userId, fitFile.filename)
        : null
      const streams = extractFitStreams(records)

      console.log(chalk.bold('\n=== FitFile Metadata ==='))
      console.log(`ID:         ${fitFile.id}`)
      console.log(`User:       ${fitFile.user.email} (${fitFile.user.id})`)
      console.log(`Filename:   ${fitFile.filename}`)
      console.log(`Size:       ${formatBytes(buffer.length)} (${buffer.length} bytes)`)
      console.log(`Hash:       ${fitFile.hash}`)
      console.log(`Created At: ${fitFile.createdAt.toISOString()}`)
      console.log(
        `Linked Wk:  ${fitFile.workout ? `${fitFile.workout.id} (${fitFile.workout.source})` : 'None'}`
      )

      console.log(chalk.bold('\n=== Parsed FIT Message Counts ==='))
      console.log(`sessions:      ${sessions.length}`)
      console.log(`laps:          ${laps.length}`)
      console.log(`records:       ${records.length}`)
      console.log(`events:        ${events.length}`)
      console.log(`device_infos:  ${deviceInfos.length}`)

      if (deviceInfos.length > 0) {
        const deviceNames = deviceInfos
          .map((d: any) => d?.product_name || d?.productName || d?.device_name || d?.name || null)
          .filter(Boolean)
        if (deviceNames.length > 0) {
          console.log(`devices:       ${[...new Set(deviceNames)].join(', ')}`)
        }
      }

      console.log(chalk.bold('\n=== Workout Fields We Can Extract (Current Utility) ==='))
      if (!normalized) {
        console.log(chalk.yellow('No session found; unable to produce normalized workout fields.'))
      } else {
        const mappedFields: Array<{ field: string; value: unknown }> = [
          { field: 'date', value: normalized.date },
          { field: 'title', value: normalized.title },
          { field: 'type', value: normalized.type },
          { field: 'durationSec', value: normalized.durationSec },
          { field: 'distanceMeters', value: normalized.distanceMeters },
          { field: 'elevationGain', value: normalized.elevationGain },
          { field: 'calories', value: normalized.calories },
          { field: 'averageWatts', value: normalized.averageWatts },
          { field: 'maxWatts', value: normalized.maxWatts },
          { field: 'normalizedPower', value: normalized.normalizedPower },
          { field: 'averageHr', value: normalized.averageHr },
          { field: 'maxHr', value: normalized.maxHr },
          { field: 'averageCadence', value: normalized.averageCadence },
          { field: 'maxCadence', value: normalized.maxCadence },
          { field: 'averageSpeed', value: normalized.averageSpeed },
          { field: 'tss', value: normalized.tss }
        ]

        const present = mappedFields.filter((f) => hasValue(f.value))
        const missing = mappedFields.filter((f) => !hasValue(f.value))

        console.log(`Present (${present.length}/${mappedFields.length}):`)
        present.forEach((f) => console.log(`  - ${f.field}: ${JSON.stringify(f.value)}`))
        console.log(`Missing (${missing.length}/${mappedFields.length}):`)
        missing.forEach((f) => console.log(`  - ${f.field}`))
      }

      console.log(chalk.bold('\n=== Stream Fields We Extract From Records ==='))
      const streamSummary = [
        ['time', getArrayLength(streams.time)],
        ['distance', getArrayLength(streams.distance)],
        ['velocity', getArrayLength(streams.velocity)],
        ['heartrate', getArrayLength(streams.heartrate)],
        ['cadence', getArrayLength(streams.cadence)],
        ['watts', getArrayLength(streams.watts)],
        ['altitude', getArrayLength(streams.altitude)],
        ['latlng', getArrayLength(streams.latlng)],
        ['grade', getArrayLength(streams.grade)],
        ['moving', getArrayLength(streams.moving)]
      ] as const
      streamSummary.forEach(([name, len]) => {
        console.log(`  - ${name}: ${len}`)
      })

      console.log(chalk.bold('\n=== Top Record Keys Available In This FIT ==='))
      const keyCounts = getKeyCounts(records)
      if (keyCounts.length === 0) {
        console.log(chalk.yellow('No record keys found.'))
      } else {
        keyCounts.slice(0, topKeys).forEach(({ key, count }) => {
          console.log(`  - ${key}: ${count}/${records.length}`)
        })
      }

      const currentlyUsedRecordKeys = new Set([
        'timestamp',
        'elapsed_time',
        'distance',
        'speed',
        'heart_rate',
        'cadence',
        'power',
        'altitude',
        'grade',
        'position_lat',
        'position_long'
      ])
      const additionalKeys = keyCounts
        .filter(({ key }) => !currentlyUsedRecordKeys.has(key))
        .slice(0, topKeys)

      console.log(chalk.bold('\n=== Additional Record Keys Not Used By extractFitStreams() ==='))
      if (additionalKeys.length === 0) {
        console.log(chalk.green('None'))
      } else {
        additionalKeys.forEach(({ key, count }) => {
          console.log(`  - ${key}: ${count}/${records.length}`)
        })
      }
    } catch (error: any) {
      console.error(chalk.red('Error inspecting FitFile:'), error?.message || error)
      if (error?.stack) console.error(chalk.gray(error.stack))
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default fitFileInspectCommand
