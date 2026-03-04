import { Command } from 'commander'
import { readdirSync, existsSync, readFileSync } from 'fs'
import { resolve, basename } from 'path'
import chalk from 'chalk'

/**
 * Flattens a nested JSON object into dot-separated keys.
 */
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, key))
    } else {
      result[key] = String(v)
    }
  }
  return result
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
    }

    // 2. Push English values for all namespaces
    const headers = { 'Content-Type': 'application/json', 'X-API-Key': apiKey }
    const base = `${apiUrl}/v2/projects/${projectId}`

    let totalUpdated = 0
    let totalCreated = 0
    let totalFailed = 0

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    for (const ns of namespaces) {
      const jsonPath = resolve(`app/i18n/en/${ns}.json`)
      const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>
      const entries = Object.entries(flatten(raw))

      if (dryRun) {
        console.log(chalk.bold(`  ${ns}`) + chalk.gray(` — ${entries.length} key(s) [dry-run]`))
        continue
      }

      let nsUpdated = 0
      let nsCreated = 0
      let nsFailed = 0

      const putTranslation = async (key: string, value: string, retries = 2): Promise<Response> => {
        const res = await fetch(`${base}/translations`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ key, namespace: ns, translations: { en: value } })
        })
        if ((res.status === 444 || res.status >= 500) && retries > 0) {
          await sleep(3000)
          return putTranslation(key, value, retries - 1)
        }
        return res
      }

      for (const [key, value] of entries) {
        await sleep(30)
        try {
          let res = await putTranslation(key, value)

          if (!res.ok && res.status === 404) {
            const createRes = await fetch(`${base}/keys`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ name: key, namespace: ns })
            })

            if (!createRes.ok) {
              nsFailed++
              continue
            }

            await sleep(30)
            res = await putTranslation(key, value)

            if (res.ok) nsCreated++
            else nsFailed++
            continue
          }

          if (res.ok) nsUpdated++
          else nsFailed++
        } catch {
          nsFailed++
        }
      }

      const parts = []
      if (nsUpdated > 0) parts.push(chalk.green(`${nsUpdated} updated`))
      if (nsCreated > 0) parts.push(chalk.blue(`${nsCreated} created`))
      if (nsFailed > 0) parts.push(chalk.red(`${nsFailed} failed`))

      console.log(chalk.bold(`  ${ns}`) + '  ' + parts.join(', '))
      totalUpdated += nsUpdated
      totalCreated += nsCreated
      totalFailed += nsFailed
    }

    if (!dryRun) {
      console.log()
      console.log(
        chalk.bold('Push summary: ') +
          chalk.green(`${totalUpdated} updated`) +
          ', ' +
          chalk.blue(`${totalCreated} created`) +
          (totalFailed > 0 ? ', ' + chalk.red(`${totalFailed} failed`) : '')
      )
    }

    // 3. Check plugin registration
    console.log(chalk.bold('\n🔍 Checking plugin registration...\n'))

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

    // 4. Pull translations
    if (!dryRun) {
      console.log(chalk.bold('\n📥 Pulling translations from platform...\n'))
      const { execSync } = await import('child_process')
      try {
        execSync(`npx tolgee pull --api-url "${apiUrl}" --api-key "${apiKey}"`, {
          stdio: 'inherit'
        })
      } catch {
        console.error(chalk.red('Pull failed — run `pnpm i18n:pull` manually'))
        process.exit(1)
      }
    }

    if (totalFailed > 0) process.exit(1)
  })

export default syncAllCommand
