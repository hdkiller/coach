import { Command } from 'commander'
import { execSync } from 'child_process'
import chalk from 'chalk'

const listMissingCommand = new Command('list-missing')
  .description('List keys that exist in code but are missing from the Tolgee platform')
  .option('--patterns <patterns...>', 'File glob patterns to scan', ['app/**/*.vue'])
  .option('--namespace <ns>', 'Filter to a specific namespace')
  .action(async (options) => {
    const apiUrl = process.env.TOLGEE_API_URL
    const apiKey = process.env.TOLGEE_API_KEY

    if (!apiUrl || !apiKey) {
      console.error(chalk.red('Error: TOLGEE_API_URL and TOLGEE_API_KEY must be set in .env'))
      process.exit(1)
    }

    const patterns = (options.patterns as string[]).map((p) => `"${p}"`).join(' ')
    const nsFilter = options.namespace as string | undefined

    console.log(chalk.bold('\n🔍 Comparing code keys vs Tolgee platform...\n'))

    try {
      const output = execSync(
        `npx tolgee compare --api-url "${apiUrl}" --api-key "${apiKey}" --patterns ${patterns}`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      )

      // Parse "new keys found" section from compare output (strip ANSI)
      // eslint-disable-next-line no-control-regex
      const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
      const lines = clean.split('\n')

      const newKeys: { key: string; ns: string }[] = []
      for (const line of lines) {
        const match = line.match(/^\+\s+(\S+)\s+\(namespace:\s+([^)]+)\)/)
        if (match) {
          const [, key, ns] = match
          if (!nsFilter || ns === nsFilter) {
            newKeys.push({ key, ns })
          }
        }
      }

      if (newKeys.length === 0) {
        console.log(chalk.green('✓ All code keys exist on the platform with correct namespaces.'))
        return
      }

      // Group by namespace
      const byNs = new Map<string, string[]>()
      for (const { key, ns } of newKeys) {
        if (!byNs.has(ns)) byNs.set(ns, [])
        byNs.get(ns)!.push(key)
      }

      console.log(chalk.red(`${newKeys.length} key(s) missing from platform:\n`))
      for (const [ns, keys] of byNs) {
        console.log(chalk.bold.yellow(`  [${ns}]`))
        for (const key of keys) {
          console.log(chalk.red(`    + ${key}`))
        }
      }

      console.log(chalk.gray('\nRun `cw:cli translations sync` to create them on the platform.'))
    } catch (err: any) {
      // compare exits non-zero when out of sync — parse its stdout
      const raw = (err.stdout ?? '') + (err.stderr ?? '')
      // eslint-disable-next-line no-control-regex
      const clean = raw.replace(/\x1b\[[0-9;]*m/g, '')
      const lines = clean.split('\n')

      const newKeys: { key: string; ns: string }[] = []
      for (const line of lines) {
        const match = line.match(/^\+\s+(\S+)\s+\(namespace:\s+([^)]+)\)/)
        if (match) {
          const [, key, ns] = match
          if (!nsFilter || ns === nsFilter) {
            newKeys.push({ key, ns })
          }
        }
      }

      if (newKeys.length === 0) {
        console.log(chalk.green('✓ All code keys exist on the platform with correct namespaces.'))
        return
      }

      const byNs = new Map<string, string[]>()
      for (const { key, ns } of newKeys) {
        if (!byNs.has(ns)) byNs.set(ns, [])
        byNs.get(ns)!.push(key)
      }

      console.log(chalk.red(`${newKeys.length} key(s) missing from platform:\n`))
      for (const [ns, keys] of byNs) {
        console.log(chalk.bold.yellow(`  [${ns}]`))
        for (const key of keys) {
          console.log(chalk.red(`    + ${key}`))
        }
      }

      console.log(chalk.gray('\nRun `cw:cli translations sync` to create them on the platform.'))
    }
  })

export default listMissingCommand
