import { Command } from 'commander'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { globSync } from 'glob'
import chalk from 'chalk'

function flatten(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      for (const nested of flatten(v as Record<string, unknown>, key)) keys.add(nested)
    } else {
      keys.add(key)
    }
  }
  return keys
}

function loadNamespaceKeys(ns: string): Set<string> {
  const jsonPath = resolve(`app/i18n/en/${ns}.json`)
  if (!existsSync(jsonPath)) return new Set()
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>
  return flatten(raw)
}

function extractKeysFromFile(source: string): Map<string, Set<string>> {
  // Map of namespace → keys used in this file
  const result = new Map<string, Set<string>>()

  // Match: const { t } = useTranslate('ns')
  //    or: const { t: tAlias } = useTranslate('ns')
  const bindingPattern =
    /const\s*\{\s*t(?:\s*:\s*(\w+))?\s*(?:,[^}]*)?\}\s*=\s*useTranslate\(\s*['"]([^'"]+)['"]\s*\)/g

  for (const m of source.matchAll(bindingPattern)) {
    const varName = m[1] ?? 't' // renamed alias or default 't'
    const ns = m[2]

    // Escape for regex, then match varName('key') and varName.value('key')
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const callPattern = new RegExp(`\\b${escaped}(?:\\.value)?\\(\\s*['"]([^'"]+)['"]`, 'g')

    if (!result.has(ns)) result.set(ns, new Set())
    const keys = result.get(ns)!

    for (const call of source.matchAll(callPattern)) {
      // Skip string prefixes used in dynamic key construction e.g. t('scenario.' + id + '.name')
      if (!call[1].endsWith('.')) keys.add(call[1])
    }
  }

  return result
}

const listMissingCommand = new Command('list-missing')
  .description('List keys used in code but missing from local en/*.json files')
  .option('--namespace <ns>', 'Filter to a specific namespace')
  .option('--glob <pattern>', 'File glob pattern to scan', 'app/**/*.vue')
  .action(async (options) => {
    const nsFilter = options.namespace as string | undefined
    const pattern = options.glob as string

    console.log(chalk.bold('\n🔍 Comparing code keys vs local en/*.json files...\n'))

    const files = globSync(pattern)
    if (files.length === 0) {
      console.log(chalk.yellow('No files matched the pattern.'))
      return
    }

    // Aggregate keys per namespace across all files
    const codeKeys = new Map<string, Set<string>>()

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      const extracted = extractKeysFromFile(source)
      for (const [ns, keys] of extracted) {
        if (nsFilter && ns !== nsFilter) continue
        if (!codeKeys.has(ns)) codeKeys.set(ns, new Set())
        for (const k of keys) codeKeys.get(ns)!.add(k)
      }
    }

    if (codeKeys.size === 0) {
      console.log(chalk.green('✓ No useTranslate() calls found in scanned files.'))
      return
    }

    // Compare against local JSON files
    const missing = new Map<string, string[]>()
    let totalMissing = 0

    for (const [ns, keys] of [...codeKeys.entries()].sort()) {
      const jsonKeys = loadNamespaceKeys(ns)
      const missingKeys = [...keys].filter((k) => !jsonKeys.has(k)).sort()
      if (missingKeys.length > 0) {
        missing.set(ns, missingKeys)
        totalMissing += missingKeys.length
      }
    }

    if (totalMissing === 0) {
      console.log(chalk.green('✓ All code keys exist in local en/*.json files.'))
      return
    }

    for (const [ns, keys] of missing) {
      const jsonExists = existsSync(resolve(`app/i18n/en/${ns}.json`))
      const nsLabel = jsonExists
        ? chalk.bold.yellow(`  [${ns}]`)
        : chalk.bold.red(`  [${ns}]`) + chalk.red('  ← no en/${ns}.json!')
      console.log(nsLabel)
      for (const key of keys) {
        console.log(chalk.red(`    + ${key}`))
      }
      console.log()
    }

    console.log(
      chalk.bold(`${totalMissing} key(s) missing from local JSON.\n`) +
        chalk.gray(
          'Add them to the en/*.json file, then run `cw:cli translations push-values --namespace <ns>`.'
        )
    )
  })

export default listMissingCommand
