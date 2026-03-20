import { defineVitestConfig } from '@nuxt/test-utils/config'
import path from 'path'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    alias: {
      '#auth': path.resolve(__dirname, './tests/unit/mocks/auth.ts')
    },
    coverage: {
      provider: 'v8',
      include: ['server/**', 'app/**'],
      reporter: ['text', 'json', 'html']
    }
  }
})
