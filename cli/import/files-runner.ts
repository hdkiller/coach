/**
 * CLI runner: scans a local directory for .fit, .gpx, .tcx, and .zip files,
 * stores each to the database, and queues an ingest-activity-file Trigger.dev task.
 *
 * Usage (via files.ts command):
 *   pnpm exec tsx cli/import/files-runner.ts <userIdentifier> --dir <path> [--recursive] [--dry-run]
 */
import chalk from 'chalk'
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { prisma } from '../../server/utils/db'

const SUPPORTED_EXTENSIONS = ['.fit', '.gpx', '.tcx', '.zip']

function detectFileType(filename: string): 'FIT' | 'GPX' | 'TCX' | 'ZIP' | null {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.fit') return 'FIT'
  if (ext === '.gpx') return 'GPX'
  if (ext === '.tcx') return 'TCX'
  if (ext === '.zip') return 'ZIP'
  return null
}

function scanDirectory(dir: string, recursive: boolean): string[] {
  const results: string[] = []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && recursive) {
      results.push(...scanDirectory(fullPath, recursive))
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        results.push(fullPath)
      }
    }
  }

  return results
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  )
}

async function main() {
  const args = process.argv.slice(2)
  const userIdentifier = args[0]

  if (!userIdentifier) {
    console.error(chalk.red('Missing user identifier (email or UUID).'))
    process.exit(1)
  }

  const options = {
    dir: '',
    recursive: false,
    dryRun: false
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dir') options.dir = args[++i] ?? ''
    else if (arg === '--recursive') options.recursive = true
    else if (arg === '--dry-run') options.dryRun = true
  }

  if (!options.dir) {
    console.error(chalk.red('--dir <path> is required.'))
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error(chalk.red('DATABASE_URL is not set.'))
    process.exit(1)
  }

  const resolvedDir = path.resolve(options.dir)
  if (!fs.existsSync(resolvedDir)) {
    console.error(chalk.red(`Directory not found: ${resolvedDir}`))
    process.exit(1)
  }

  // Resolve user
  const user = isUuidLike(userIdentifier)
    ? await prisma.user.findUnique({ where: { id: userIdentifier } })
    : await prisma.user.findUnique({ where: { email: userIdentifier } })

  if (!user) {
    console.error(chalk.red(`User not found: ${userIdentifier}`))
    process.exit(1)
  }

  console.log(chalk.cyan(`\n👤 User: ${user.email} (${user.id})`))
  console.log(chalk.cyan(`📁 Scanning: ${resolvedDir}${options.recursive ? ' (recursive)' : ''}\n`))

  const files = scanDirectory(resolvedDir, options.recursive)

  if (files.length === 0) {
    console.log(chalk.yellow('No supported activity files found.'))
    process.exit(0)
  }

  console.log(chalk.white(`Found ${files.length} file(s):\n`))
  for (const f of files) {
    console.log(`  ${chalk.gray(detectFileType(path.basename(f))?.padEnd(4))}  ${f}`)
  }

  if (options.dryRun) {
    console.log(chalk.yellow('\n[dry-run] No files imported.'))
    process.exit(0)
  }

  // Import Trigger SDK lazily (requires TRIGGER_SECRET_KEY in env)
  const { tasks } = await import('@trigger.dev/sdk/v3')

  let processed = 0
  let duplicates = 0
  let failed = 0

  for (const filePath of files) {
    const filename = path.basename(filePath)
    const fileType = detectFileType(filename)
    if (!fileType || fileType === 'ZIP') {
      // ZIPs are handled inside the task; store as-is with type FIT (API handles extraction)
      // For the CLI we store ZIP raw and let ingest-activity-file handle it transparently.
      // Actually, since the trigger task doesn't extract ZIPs, we skip ZIPs here with a note.
      if (fileType === 'ZIP') {
        console.log(
          chalk.yellow(
            `  ⚠  ${filename}: ZIP extraction is not supported in CLI mode — unzip manually and re-run.`
          )
        )
        failed++
      }
      continue
    }

    try {
      const data = fs.readFileSync(filePath)
      const hash = crypto.createHash('sha256').update(data).digest('hex')

      const existing = await prisma.fitFile.findFirst({
        where: { userId: user.id, hash }
      })

      if (existing) {
        console.log(chalk.gray(`  ≡  ${filename} (duplicate, skipped)`))
        duplicates++
        continue
      }

      const fitFile = await prisma.fitFile.create({
        data: {
          userId: user.id,
          filename,
          fileData: data,
          fileType,
          hash
        }
      })

      await tasks.trigger(
        'ingest-activity-file',
        { userId: user.id, fitFileId: fitFile.id },
        { concurrencyKey: user.id, tags: [`user:${user.id}`, 'cli-import'] }
      )

      console.log(chalk.green(`  ✓  ${filename} → queued (${fitFile.id})`))
      processed++
    } catch (error: any) {
      console.log(chalk.red(`  ✗  ${filename}: ${error.message}`))
      failed++
    }
  }

  console.log(
    chalk.bold(
      `\nDone: ${chalk.green(processed + ' queued')}, ${chalk.gray(duplicates + ' duplicates')}, ${failed > 0 ? chalk.red(failed + ' failed') : chalk.gray('0 failed')}`
    )
  )

  if (processed > 0) {
    console.log(
      chalk.cyan(`\nWorkouts will appear in the dashboard as Trigger.dev processes each file.\n`)
    )
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err)
  process.exit(1)
})
