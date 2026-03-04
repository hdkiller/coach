import { Command } from 'commander'
import chalk from 'chalk'

const untranslatedCommand = new Command('untranslated')
  .description('List keys that are missing translations on the Tolgee platform')
  .option('--lang <codes>', 'Comma-separated language codes to check (default: all non-English)')
  .option('--namespace <ns>', 'Filter to a specific namespace')
  .option('--limit <n>', 'Max keys to fetch per page', '200')
  .action(async (options) => {
    const apiUrl = process.env.TOLGEE_API_URL
    const apiKey = process.env.TOLGEE_API_KEY
    const projectId = process.env.TOLGEE_PROJECT_ID ?? '2'

    if (!apiUrl || !apiKey) {
      console.error(chalk.red('Error: TOLGEE_API_URL and TOLGEE_API_KEY must be set in .env'))
      process.exit(1)
    }

    const base = `${apiUrl}/v2/projects/${projectId}`
    const headers = { 'X-API-Key': apiKey }

    // Fetch all languages in the project
    const langsRes = await fetch(`${base}/languages`, { headers })
    if (!langsRes.ok) {
      console.error(chalk.red(`Failed to fetch languages: ${langsRes.status}`))
      process.exit(1)
    }
    const langsData = (await langsRes.json()) as { _embedded?: { languages: { tag: string }[] } }
    const allLangs = (langsData._embedded?.languages ?? []).map((l) => l.tag)
    const targetLangs = options.lang
      ? options.lang.split(',').map((s: string) => s.trim())
      : allLangs.filter((l: string) => l !== 'en')

    console.log(chalk.bold(`\n🔍 Checking untranslated keys\n`))
    console.log(chalk.gray(`Languages: ${targetLangs.join(', ')}\n`))

    const pageSize = parseInt(options.limit, 10)

    // Build query params
    const params = new URLSearchParams({
      size: String(pageSize),
      sort: 'keyName,asc'
    })
    if (options.namespace) params.set('filterNamespace', options.namespace)

    // Add filterUntranslatedInLang for each target language
    for (const lang of targetLangs) {
      params.append('filterUntranslatedInLang', lang)
    }

    let cursor: string | null = null
    let totalFound = 0
    const byLang: Record<string, { ns: string; key: string }[]> = {}
    for (const lang of targetLangs) byLang[lang] = []

    do {
      const url = cursor
        ? `${base}/translations?${params}&cursor=${encodeURIComponent(cursor)}`
        : `${base}/translations?${params}`

      const res = await fetch(url, { headers })
      if (!res.ok) {
        const body = await res.text()
        console.error(chalk.red(`API error ${res.status}: ${body.substring(0, 200)}`))
        process.exit(1)
      }

      const data = (await res.json()) as {
        _embedded?: {
          keys: {
            keyName: string
            keyNamespace: string
            translations: Record<string, { text?: string; state: string } | undefined>
          }[]
        }
        nextCursor?: string
      }

      const keys = data._embedded?.keys ?? []
      for (const key of keys) {
        for (const lang of targetLangs) {
          const t = key.translations[lang]
          if (!t || !t.text || t.state === 'UNTRANSLATED') {
            byLang[lang].push({ ns: key.keyNamespace ?? '', key: key.keyName })
            totalFound++
          }
        }
      }

      cursor = data.nextCursor ?? null
    } while (cursor)

    if (totalFound === 0) {
      console.log(chalk.green('✓ All keys are translated in all target languages!'))
      return
    }

    for (const lang of targetLangs) {
      const missing = byLang[lang]
      if (missing.length === 0) {
        console.log(chalk.green(`  ${lang}  ✓ fully translated`))
        continue
      }

      console.log(chalk.bold(`  ${lang}`) + chalk.red(`  ${missing.length} untranslated`))

      // Group by namespace
      const byNs: Record<string, string[]> = {}
      for (const { ns, key } of missing) {
        const nsKey = ns || '<none>'
        ;(byNs[nsKey] ??= []).push(key)
      }

      for (const [ns, keys] of Object.entries(byNs).sort()) {
        console.log(chalk.gray(`    ${ns}:`))
        for (const key of keys.slice(0, 20)) {
          console.log(`      ${key}`)
        }
        if (keys.length > 20) {
          console.log(chalk.gray(`      ... and ${keys.length - 20} more`))
        }
      }
      console.log()
    }

    console.log(chalk.bold(`Total: ${totalFound} untranslated key-language pairs`))
  })

export default untranslatedCommand
