import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { spawn } from 'node:child_process'
import path from 'node:path'

const intervalsImportCommand = new Command('intervals')
  .description('Import Intervals.icu data for a user directly from the CLI')
  .argument('<userIdentifier>', 'User ID or email')
  .option('--prod', 'Use production database')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD). Defaults to 30 days in the future.')
  .option('--years <number>', 'Historical lookback in years when --start-date is omitted', '10')
  .option('--skip-planned', 'Skip planned workouts/events/notes import')
  .option('--skip-activities', 'Skip activity import')
  .option('--skip-wellness', 'Skip wellness import')
  .option('--skip-existing', 'Skip records that already exist in the database')
  .action(async (userIdentifier: string, options) => {
    const isProd = Boolean(options.prod)
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(
        chalk.red(
          `Missing ${isProd ? 'DATABASE_URL_PROD' : 'DATABASE_URL'} in environment variables.`
        )
      )
      process.exit(1)
    }

    const runnerPath = path.resolve(process.cwd(), 'cli/import/intervals-runner.ts')
    const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    const args = ['exec', 'tsx', runnerPath, userIdentifier]

    if (options.startDate) args.push('--start-date', String(options.startDate))
    if (options.endDate) args.push('--end-date', String(options.endDate))
    if (options.years) args.push('--years', String(options.years))
    if (options.skipPlanned) args.push('--skip-planned')
    if (options.skipActivities) args.push('--skip-activities')
    if (options.skipWellness) args.push('--skip-wellness')
    if (options.skipExisting) args.push('--skip-existing')

    const child = spawn(pnpmCmd, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
        CW_DISABLE_EMAILS: '1'
      }
    })

    await new Promise<void>((resolve, reject) => {
      child.on('error', reject)
      child.on('exit', (code) => {
        if (code && code !== 0) {
          process.exitCode = code
        }
        resolve()
      })
    })
  })

export default intervalsImportCommand
