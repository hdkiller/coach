import { Command } from 'commander'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'

/**
 * Flattens a nested JSON object into dot-separated keys.
 * e.g. { a: { b: 'v' } } → { 'a.b': 'v' }
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

const pushValuesCommand = new Command('push-values')
  .description('Push English values for a namespace to the Tolgee platform via API')
  .requiredOption('--namespace <ns>', 'Namespace to push (e.g. stories)')
  .option('--dry-run', 'Print what would be pushed without making API calls')
  .action(async (options) => {
    const apiUrl = process.env.TOLGEE_API_URL
    const apiKey = process.env.TOLGEE_API_KEY
    const projectId = process.env.TOLGEE_PROJECT_ID ?? '2'

    if (!apiUrl || !apiKey) {
      console.error(chalk.red('Error: TOLGEE_API_URL and TOLGEE_API_KEY must be set in .env'))
      process.exit(1)
    }

    const ns = options.namespace as string
    const dryRun = Boolean(options.dryRun)
    const jsonPath = resolve(`app/i18n/en/${ns}.json`)

    if (!existsSync(jsonPath)) {
      console.error(chalk.red(`Error: ${jsonPath} not found`))
      process.exit(1)
    }

    const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>
    const keys = flatten(raw)
    const entries = Object.entries(keys)

    console.log(chalk.bold(`\n📤 Pushing ${entries.length} key(s) for namespace "${ns}"...\n`))

    if (dryRun) {
      for (const [key, value] of entries) {
        console.log(
          chalk.gray(`  [dry-run] ${key}`) +
            ' → ' +
            chalk.cyan(`"${value.slice(0, 60)}${value.length > 60 ? '…' : ''}"`)
        )
      }
      console.log(chalk.yellow('\nDry run — no changes made.'))
      return
    }

    const headers = { 'Content-Type': 'application/json', 'X-API-Key': apiKey }
    const base = `${apiUrl}/v2/projects/${projectId}`

    let ok = 0
    let created = 0
    let failed = 0

    for (const [key, value] of entries) {
      try {
        // Attempt to set the translation value
        let res = await fetch(`${base}/translations`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ key, namespace: ns, translations: { en: value } })
        })

        // Key doesn't exist yet — create it first, then retry
        if (!res.ok && res.status === 404) {
          const createRes = await fetch(`${base}/keys`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: key, namespace: ns })
          })

          if (!createRes.ok) {
            const text = await createRes.text()
            console.error(
              chalk.red(`  ✗ ${key}: failed to create key — ${createRes.status} ${text}`)
            )
            failed++
            continue
          }

          // Retry the translation PUT now that the key exists
          res = await fetch(`${base}/translations`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ key, namespace: ns, translations: { en: value } })
          })

          if (!res.ok) {
            const text = await res.text()
            console.error(chalk.red(`  ✗ ${key}: ${res.status} ${text}`))
            failed++
            continue
          }

          console.log(chalk.blue(`  + ${key}`) + chalk.gray(' (created)'))
          created++
          continue
        }

        if (!res.ok) {
          const text = await res.text()
          console.error(chalk.red(`  ✗ ${key}: ${res.status} ${text}`))
          failed++
        } else {
          console.log(chalk.green(`  ✓ ${key}`))
          ok++
        }
      } catch (err: any) {
        console.error(chalk.red(`  ✗ ${key}: ${err.message}`))
        failed++
      }
    }

    console.log()
    if (failed === 0) {
      const parts = []
      if (ok > 0) parts.push(`${ok} updated`)
      if (created > 0) parts.push(`${created} created`)
      console.log(chalk.green(`✓ ${parts.join(', ')}.`))
    } else {
      console.log(chalk.yellow(`${ok} updated, ${created} created, ${failed} failed.`))
      process.exit(1)
    }
  })

export default pushValuesCommand
