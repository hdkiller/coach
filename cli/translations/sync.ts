import { Command } from 'commander'
import { execSync } from 'child_process'
import chalk from 'chalk'

const syncCommand = new Command('sync')
  .description(
    'Sync code keys to the Tolgee platform (creates missing keys with correct namespaces)'
  )
  .option('--patterns <patterns...>', 'File glob patterns to scan', ['app/**/*.vue'])
  .option('--dry-run', 'Pass --dry-run to tolgee sync (no changes made)')
  .action((options) => {
    const apiUrl = process.env.TOLGEE_API_URL
    const apiKey = process.env.TOLGEE_API_KEY
    const dryRun = Boolean(options.dryRun)

    if (process.env.TOLGEE_API_ENABLED !== 'true' && !dryRun) {
      console.error(
        chalk.red('Error: TOLGEE_API_ENABLED must be set to "true" in .env to use the live API')
      )
      process.exit(1)
    }

    if (!apiUrl || !apiKey) {
      console.error(chalk.red('Error: TOLGEE_API_URL and TOLGEE_API_KEY must be set in .env'))
      process.exit(1)
    }

    const patterns = (options.patterns as string[]).map((p) => `"${p}"`).join(' ')
    const dryRun = Boolean(options.dryRun)

    const cmd = [
      `npx tolgee sync`,
      `--api-url "${apiUrl}"`,
      `--api-key "${apiKey}"`,
      `--patterns ${patterns}`,
      dryRun ? '--dry-run' : '-Y'
    ]
      .filter(Boolean)
      .join(' ')

    console.log(chalk.bold('\n🔄 Syncing keys to Tolgee platform...\n'))
    if (dryRun) {
      console.log(chalk.gray('(dry-run mode — no changes will be made)\n'))
    }

    try {
      execSync(cmd, { stdio: 'inherit' })
      console.log(chalk.green('\n✓ Sync complete.'))
      if (!dryRun) {
        console.log(
          chalk.gray(
            '\nNext step: run `cw:cli translations push-values --namespace <ns>` to set English values.'
          )
        )
      }
    } catch {
      // tolgee sync may exit non-zero even on partial success — output already printed
      process.exit(1)
    }
  })

export default syncCommand
