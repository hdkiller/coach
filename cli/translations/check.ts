import { Command } from 'commander'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'

/**
 * Finds all namespaces referenced in Vue files via useTranslate('ns')
 * and checks whether each is registered in tolgee.ts staticData.
 */
function checkPluginRegistration(): { missing: string[]; registered: string[] } {
  const pluginPath = resolve('app/plugins/tolgee.ts')
  const pluginSource = readFileSync(pluginPath, 'utf8')

  // Extract namespaces from useTranslate calls across all Vue files
  const vueOutput = execSync('grep -rh "useTranslate(" app/ --include="*.vue"', {
    encoding: 'utf8'
  })
  const nsMatches = [...vueOutput.matchAll(/useTranslate\(['"]([^'"]+)['"]\)/g)]
  const usedNamespaces = [...new Set(nsMatches.map((m) => m[1]))]

  const missing: string[] = []
  const registered: string[] = []

  for (const ns of usedNamespaces) {
    // Check that at least en:{ns} is registered
    if (pluginSource.includes(`'en:${ns}'`)) {
      registered.push(ns)
    } else {
      missing.push(ns)
    }
  }

  return { missing, registered }
}

const checkCommand = new Command('check')
  .description('Check extraction warnings and verify all namespaces are registered in tolgee.ts')
  .option('--patterns <patterns...>', 'File glob patterns to check', ['app/**/*.vue'])
  .action(async (options) => {
    const patterns = options.patterns as string[]

    console.log(chalk.bold('\n📦 Namespace Registration Check'))
    console.log(chalk.gray('Scanning useTranslate() calls vs app/plugins/tolgee.ts...\n'))

    const { missing, registered } = checkPluginRegistration()

    for (const ns of registered) {
      console.log(chalk.green(`  ✓ ${ns}`))
    }
    for (const ns of missing) {
      console.log(chalk.red(`  ✗ ${ns}  ← not registered in tolgee.ts staticData`))
    }

    if (missing.length > 0) {
      console.log(
        chalk.red(
          `\n⚠️  ${missing.length} namespace(s) missing from plugin. Page will show raw keys.`
        )
      )
    } else {
      console.log(chalk.green('\n✓ All namespaces are registered.'))
    }

    console.log(chalk.bold('\n🔍 Extraction Check'))
    console.log(chalk.gray(`Running tolgee extract check on: ${patterns.join(', ')}\n`))

    const patternArgs = patterns.map((p) => `"${p}"`).join(' ')

    try {
      execSync(`npx tolgee extract check --patterns ${patternArgs}`, { stdio: 'inherit' })
      console.log(chalk.green('\n✓ No extraction warnings.'))
    } catch {
      // tolgee extract check exits non-zero on warnings — output already printed
      console.log(
        chalk.yellow('\n⚠️  Extraction warnings found. Keys above may not be pushed correctly.')
      )
      process.exit(1)
    }
  })

export default checkCommand
