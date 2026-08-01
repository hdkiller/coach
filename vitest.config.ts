import { defineVitestConfig } from '@nuxt/test-utils/config'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineVitestConfig({
  plugins: [
    {
      name: 'coach-wattz:mock-pg-for-tests',
      enforce: 'pre',
      resolveId(source) {
        if (source === 'pg') {
          return path.resolve(rootDir, 'tests/unit/mocks/pg.ts')
        }
        if (
          source === '#build/fetch' ||
          source.endsWith('/fetch.mjs') ||
          source.includes('fetch.mjs')
        ) {
          return path.resolve(rootDir, 'tests/unit/mocks/fetch.ts')
        }
      }
    }
  ],
  resolve: {
    alias: {
      '#build/fetch': path.resolve(rootDir, './tests/unit/mocks/fetch.ts'),
      '#auth': path.resolve(rootDir, './tests/unit/mocks/auth.ts'),
      pg: path.resolve(rootDir, './tests/unit/mocks/pg.ts')
    }
  },
  test: {
    environment: 'node',
    pool: 'threads',
    globals: true,
    hookTimeout: 180_000,
    testTimeout: 30_000,
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', '**/.claude/**'],

    setupFiles: [path.resolve(rootDir, './tests/unit/setup.ts')],
    coverage: {
      provider: 'v8',
      include: ['server/**', 'app/**'],
      reporter: ['text', 'json', 'html']
    }
  }
})
