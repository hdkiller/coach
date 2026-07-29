import { promises as fs } from 'node:fs'
import path from 'path'

defineRouteMeta({
  openAPI: {
    tags: ['System'],
    summary: 'Get changelog',
    description: 'Returns the contents of the CHANGELOG.md file.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                content: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
})

export default defineEventHandler(async () => {
  try {
    const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md')
    const content = await fs.readFile(changelogPath, 'utf-8')
    return { content }
  } catch (error) {
    return { content: '# Changelog\n\nNo releases yet.' }
  }
})
