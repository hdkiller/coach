import { vi } from 'vitest'

process.env.TASK_QUEUE_DRIVER = 'inline'

class MockPool {
  query = vi.fn().mockResolvedValue({ rows: [] })
  connect = vi.fn().mockResolvedValue({ release: vi.fn() })
  end = vi.fn().mockResolvedValue(undefined)
  on = vi.fn().mockReturnThis()
}

class MockClient {
  query = vi.fn().mockResolvedValue({ rows: [] })
  connect = vi.fn().mockResolvedValue(undefined)
  end = vi.fn().mockResolvedValue(undefined)
  on = vi.fn().mockReturnThis()
}

function MockPrismaPg(_pool: unknown) {}

function MockPrismaClient(_options?: unknown) {}

vi.mock('pg', () => ({
  default: { Pool: MockPool, Client: MockClient },
  Pool: MockPool,
  Client: MockClient
}))

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: MockPrismaPg
}))

vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>()
  return {
    ...actual,
    PrismaClient: MockPrismaClient
  }
})

// Provide runtime config defaults for happy-dom unit tests in Nuxt 4.5.0
const appConfig: any = { baseURL: '/', buildAssetsDir: '/_nuxt/', cdnURL: '' }
appConfig.app = appConfig

const mockConfig: any = {
  app: appConfig,
  public: { siteUrl: 'http://localhost:3099' }
}

// Nuxt 4.5.0 useRuntimeConfig fallback when outside active NuxtApp context
// @ts-expect-error global fallback
globalThis.__NUXT_CONFIG__ = mockConfig

const dynamicFetch = (...args: any[]) => {
  if (typeof globalThis.$fetch === 'function' && globalThis.$fetch !== dynamicFetch) {
    return (globalThis.$fetch as any)(...args)
  }
  return (globalThis.fetch || fetch)(...(args as [any, any]))
}

// @ts-expect-error global fetch fallback for Nuxt 4.5.0 fetch.mjs
globalThis.$fetch = dynamicFetch

const mockNuxtApp = {
  $config: mockConfig,
  appConfig,
  app: appConfig,
  $fetch: dynamicFetch,
  _route: { sync: () => {} },
  runWithContext: (fn: any) => fn()
}

const origUseNuxtApp = globalThis.useNuxtApp
vi.stubGlobal('useNuxtApp', (...args: any[]) => {
  let app: any
  if (typeof origUseNuxtApp === 'function') {
    try {
      app = origUseNuxtApp(...args)
    } catch {
      // ignore fallback
    }
  }
  if (!app) app = mockNuxtApp

  if (app) {
    if (!app._route) app._route = {}
    if (!app._route.sync) app._route.sync = () => {}
    if (app.$config && app.$config.app && !app.$config.app.app) {
      app.$config.app.app = app.$config.app
    }
    Object.defineProperty(app, '$fetch', {
      configurable: true,
      get: () => dynamicFetch,
      set: () => {}
    })
  }
  return app
})

vi.stubGlobal('useRuntimeConfig', () => {
  if (typeof origUseNuxtApp === 'function') {
    try {
      const app = origUseNuxtApp()
      if (app && app.$config) {
        if (app.$config.app && !app.$config.app.app) {
          app.$config.app.app = app.$config.app
        }
        return app.$config
      }
    } catch {
      // ignore fallback
    }
  }
  return mockConfig
})

if (typeof globalThis.useRuntimeConfig !== 'function') {
  vi.stubGlobal('useRuntimeConfig', () => mockConfig)
}

if (typeof globalThis.useAppConfig !== 'function') {
  vi.stubGlobal('useAppConfig', () => appConfig)
}

// Mock ESM imports for Nuxt virtual modules in Nuxt 4.5.0
vi.mock('#imports', async (importOriginal) => {
  const actual = await importOriginal<any>().catch(() => ({}))
  return {
    ...actual,
    $fetch: dynamicFetch,
    useRuntimeConfig: () => mockConfig,
    useAppConfig: () => appConfig,
    useNuxtApp: () => mockNuxtApp
  }
})

vi.mock('nitropack/runtime', async (importOriginal) => {
  const actual = await importOriginal<any>().catch(() => ({}))
  return {
    ...actual,
    useRuntimeConfig: () => mockConfig
  }
})
