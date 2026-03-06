import { Command } from 'commander'
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, basename } from 'path'
import chalk from 'chalk'

/**
 * Recursively sorts all keys in a JSON object alphabetically.
 */
function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(obj).sort()) {
    const v = obj[k]
    sorted[k] =
      typeof v === 'object' && v !== null && !Array.isArray(v)
        ? sortKeys(v as Record<string, unknown>)
        : v
  }
  return sorted
}

/**
 * Counts leaf keys in a (possibly nested) JSON object.
 */
function countKeys(obj: Record<string, unknown>): number {
  let count = 0
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      count += countKeys(v as Record<string, unknown>)
    } else {
      count++
    }
  }
  return count
}

const syncAllCommand = new Command('sync-all')
  .description(
    'Full sync: push all English namespace values, pull all translations, and check plugin registration'
  )
  .option('--dry-run', 'Preview what would be pushed without making API calls or pulling')
  .action(async (options) => {
    const apiUrl = process.env.TOLGEE_API_URL
    const apiKey = process.env.TOLGEE_API_KEY
    const projectId = process.env.TOLGEE_PROJECT_ID ?? '2'
    const dryRun = Boolean(options.dryRun)

    if (!apiUrl || !apiKey) {
      console.error(chalk.red('Error: TOLGEE_API_URL and TOLGEE_API_KEY must be set in .env'))
      process.exit(1)
    }

    const i18nEnDir = resolve('app/i18n/en')
    if (!existsSync(i18nEnDir)) {
      console.error(chalk.red('Error: app/i18n/en directory not found'))
      process.exit(1)
    }

    // 1. Discover all English namespaces
    const namespaces = readdirSync(i18nEnDir)
      .filter((f) => f.endsWith('.json') && f !== '.json')
      .map((f) => basename(f, '.json'))
      .sort()

    console.log(chalk.bold(`\n🌐 Coach Watts — Full Translation Sync\n`))
    console.log(chalk.gray(`Found ${namespaces.length} namespace(s): ${namespaces.join(', ')}\n`))

    if (dryRun) {
      console.log(chalk.yellow('Dry run mode — no API calls or pulls will be made.\n'))
      for (const ns of namespaces) {
        const raw = JSON.parse(readFileSync(resolve(`app/i18n/en/${ns}.json`), 'utf8')) as Record<
          string,
          unknown
        >
        console.log(chalk.bold(`  ${ns}`) + chalk.gray(` — ${countKeys(raw)} key(s)`))
      }
      return
    }

    // 2. Sort all en/*.json files alphabetically before pushing
    for (const ns of namespaces) {
      const jsonPath = resolve(`app/i18n/en/${ns}.json`)
      const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>
      writeFileSync(jsonPath, JSON.stringify(sortKeys(raw), null, 2) + '\n')
    }
    console.log(chalk.gray('✓ Sorted en/*.json keys alphabetically\n'))

    // 3. Push all namespaces in a single multipart request (same as `tolgee push`)
    console.log(chalk.bold('📤 Pushing English translations...\n'))

    const formData = new FormData()
    const fileMappings: Array<{
      fileName: string
      format: string
      languageTag: string
      namespace: string
    }> = []
    let totalKeys = 0

    for (const ns of namespaces) {
      const content = readFileSync(resolve(`app/i18n/en/${ns}.json`), 'utf8')
      const raw = JSON.parse(content) as Record<string, unknown>
      totalKeys += countKeys(raw)
      formData.append('files', new Blob([content], { type: 'application/json' }), `${ns}.json`)
      fileMappings.push({
        fileName: `${ns}.json`,
        format: 'JSON_ICU',
        languageTag: 'en',
        namespace: ns
      })
    }

    formData.append(
      'params',
      JSON.stringify({
        createNewKeys: true,
        forceMode: 'OVERRIDE',
        convertPlaceholdersToIcu: false,
        fileMappings
      })
    )

    const base = `${apiUrl}/v2/projects/${projectId}`
    const res = await fetch(`${base}/single-step-import`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: formData
    })

    if (res.ok) {
      console.log(
        chalk.green(
          `✓ ${totalKeys} keys across ${namespaces.length} namespaces pushed successfully\n`
        )
      )
    } else {
      const body = await res.text()
      console.error(chalk.red(`\nPush failed: HTTP ${res.status}`))
      console.error(chalk.gray(body.slice(0, 500)))
      process.exit(1)
    }

    // 4. Check plugin registration
    console.log(chalk.bold('🔍 Checking plugin registration...\n'))

    const pluginPath = resolve('app/plugins/tolgee.ts')
    const pluginSource = existsSync(pluginPath) ? readFileSync(pluginPath, 'utf8') : ''

    const i18nRoot = resolve('app/i18n')
    const languages = readdirSync(i18nRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()

    let registrationIssues = 0

    for (const lang of languages) {
      const langDir = resolve(i18nRoot, lang)
      const langNamespaces = readdirSync(langDir)
        .filter((f) => f.endsWith('.json') && f !== '.json')
        .map((f) => basename(f, '.json'))

      for (const ns of langNamespaces) {
        const expectedKey = `'${lang}:${ns}'`
        if (!pluginSource.includes(expectedKey)) {
          console.log(chalk.red(`  ✗ Missing in tolgee.ts staticData: ${expectedKey}`))
          registrationIssues++
        }
      }
    }

    if (registrationIssues === 0) {
      console.log(chalk.green('  ✓ All namespace files are registered in tolgee.ts'))
    } else {
      console.log(
        chalk.yellow(
          `\n  ${registrationIssues} namespace(s) not registered — add them to app/plugins/tolgee.ts staticData`
        )
      )
    }

    // 5. Pull translations
    console.log(chalk.bold('\n📥 Pulling translations from platform...\n'))
    const { execSync } = await import('child_process')
    try {
      execSync(`npx tolgee pull --api-url "${apiUrl}" --api-key "${apiKey}"`, { stdio: 'inherit' })
    } catch {
      console.error(chalk.red('Pull failed — run `pnpm i18n:pull` manually'))
      process.exit(1)
    }
  })

export default syncAllCommand
