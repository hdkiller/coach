import { readFileSync, writeFileSync } from 'node:fs'
import { globSync } from 'glob'

const files = globSync('{app,clients}/**/*.vue', {
  ignore: ['**/node_modules/**', '**/.nuxt/**']
})

function shouldWrapClickExpression(expression) {
  const trimmed = expression.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('() => {') || trimmed.startsWith('async () => {')) return false
  if (trimmed.startsWith('() =>') || trimmed.startsWith('async () =>')) return false
  if (trimmed.startsWith('function')) return false
  if (trimmed.startsWith('$event =>') || trimmed.startsWith('(event) =>')) return false
  if (trimmed.startsWith('(') && trimmed.includes('=>')) return false
  return true
}

function wrapClickExpression(expression) {
  const trimmed = expression.trim()
  if (trimmed.startsWith('navigateTo(')) {
    return `() => { void ${trimmed} }`
  }
  if (/^[\w$.?]+\([^)]*\)$/.test(trimmed)) {
    return `() => { void ${trimmed} }`
  }
  if (/^[\w$.?]+$/.test(trimmed)) {
    return `() => { void ${trimmed}() }`
  }
  return `() => { ${trimmed} }`
}

function fixVueFile(content) {
  return content.replace(/@click="([^"]+)"/g, (match, expression) => {
    if (!shouldWrapClickExpression(expression)) return match
    return `@click="${wrapClickExpression(expression)}"`
  })
}

let changedFiles = 0

for (const file of files) {
  const original = readFileSync(file, 'utf8')
  const updated = fixVueFile(original)
  if (updated !== original) {
    writeFileSync(file, updated)
    changedFiles += 1
  }
}

console.log(`Updated ${changedFiles} Vue files`)
