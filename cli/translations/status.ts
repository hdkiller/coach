import { Command } from 'commander'
import { readdirSync, existsSync } from 'fs'
import { resolve, basename } from 'path'
import chalk from 'chalk'

const statusCommand = new Command('status')
  .description('Show namespace and language coverage for all i18n files')
  .action(() => {
    const i18nRoot = resolve('app/i18n')

    if (!existsSync(i18nRoot)) {
      console.error(chalk.red('Error: app/i18n directory not found'))
      process.exit(1)
    }

    const languages = readdirSync(i18nRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()

    if (languages.length === 0) {
      console.log(chalk.yellow('No language directories found in app/i18n'))
      return
    }

    // Build namespace list from the base language (en)
    const enDir = resolve(i18nRoot, 'en')
    const namespaces = existsSync(enDir)
      ? readdirSync(enDir)
          .filter((f) => f.endsWith('.json') && f !== '.json')
          .map((f) => basename(f, '.json'))
          .sort()
      : []

    console.log(chalk.bold('\n📊 i18n Coverage Report\n'))
    console.log(chalk.gray(`Languages: ${languages.join(', ')}`))
    console.log(chalk.gray(`Namespaces: ${namespaces.join(', ')}\n`))

    // Per-language breakdown
    for (const lang of languages) {
      const langDir = resolve(i18nRoot, lang)
      const present = new Set(
        readdirSync(langDir)
          .filter((f) => f.endsWith('.json') && f !== '.json')
          .map((f) => basename(f, '.json'))
      )

      const missing = namespaces.filter((ns) => !present.has(ns))
      const extra = [...present].filter((ns) => !namespaces.includes(ns))

      const status =
        missing.length === 0 ? chalk.green('✓ complete') : chalk.yellow(`${missing.length} missing`)

      console.log(chalk.bold(`  ${lang.toUpperCase()}`) + '  ' + status)

      for (const ns of namespaces) {
        if (present.has(ns)) {
          console.log(chalk.green(`    ✓ ${ns}`))
        } else {
          console.log(chalk.red(`    ✗ ${ns}`))
        }
      }

      if (extra.length > 0) {
        for (const ns of extra) {
          console.log(chalk.gray(`    ~ ${ns}  (not in en/)`))
        }
      }

      console.log()
    }
  })

export default statusCommand
