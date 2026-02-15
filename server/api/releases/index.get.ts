import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async () => {
  const releasesDir = path.resolve(process.cwd(), 'public', 'content', 'releases')

  try {
    const files = await fs.readdir(releasesDir)
    const releaseNotes = []

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(releasesDir, file)
        const stats = await fs.stat(filePath)
        const content = await fs.readFile(filePath, 'utf-8')
        const version = file.replace(/^v/, '').replace(/\.md$/, '')

        releaseNotes.push({
          version: `v${version}`,
          content,
          date: stats.mtime
        })
      }
    }

    // Sort by version (descending)
    // Simple version sort: v0.5.19 > v0.5.2
    return releaseNotes.sort((a, b) => {
      const aParts = a.version.replace(/^v/, '').split('.').map(Number)
      const bParts = b.version.replace(/^v/, '').split('.').map(Number)

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0
        const bVal = bParts[i] || 0
        if (aVal !== bVal) return bVal - aVal
      }
      return 0
    })
  } catch (error) {
    console.error('Failed to list release notes:', error)
    return []
  }
})
