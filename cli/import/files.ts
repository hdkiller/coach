import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { spawn } from 'node:child_process'
import path from 'node:path'

const filesImportCommand = new Command('files')
  .description(
    'Import FIT, GPX, or TCX activity files from a local directory for a given user'
  )
  .argument('<userIdentifier>', 'User ID or email')
  .requiredOption('--dir <path>', 'Directory to scan for activity files (.fit, .gpx, .tcx)')
  .option('--prod', 'Use production database')
  .option('--recursive', 'Recursively scan subdirectories', false)
  .option('--dry-run', 'List found files without importing', false)
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

    const runnerPath = path.resolve(process.cwd(), 'cli/import/files-runner.ts')
    const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    const args = ['exec', 'tsx', runnerPath, userIdentifier, '--dir', options.dir]

    if (options.recursive) args.push('--recursive')
    if (options.dryRun) args.push('--dry-run')

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
        if (code && code !== 0) process.exitCode = code
        resolve()
      })
    })
  })

export default filesImportCommand
