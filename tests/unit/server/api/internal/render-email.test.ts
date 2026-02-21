import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock h3 globals
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('readBody', (event: any) => event.body)
vi.stubGlobal('getRequestHeader', (event: any, key: string) => event.headers?.[key])
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.statusMessage)
  // @ts-expect-error: mocking internal h3 event
  error.statusCode = err.statusCode
  return error
})

// Mock vue-email compiler
vi.mock('@vue-email/compiler', () => ({
  config: vi.fn().mockReturnValue({
    render: vi.fn().mockResolvedValue({ html: '<html></html>', text: 'plain text' })
  })
}))

// Mock path and fs
vi.mock('path', async () => {
  const actual = await vi.importActual('path')
  return { ...actual, resolve: vi.fn().mockImplementation((...args) => args.join('/')) }
})
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true)
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/internal/render-email.post')
  return mod.default
}

describe('Internal Render API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INTERNAL_API_TOKEN = 'internal-test-token'
  })

  it('should render a template successfully', async () => {
    const handler = await getHandler()
    const event = {
      headers: { 'x-internal-api-token': 'internal-test-token' },
      body: { templateKey: 'Welcome', props: { name: 'John' } }
    }

    const result = await handler(event)

    expect(result.html).toBe('<html></html>')
    expect(result.text).toBe('plain text')
  })

  it('should throw 400 if templateKey is missing', async () => {
    const handler = await getHandler()
    const event = { headers: { 'x-internal-api-token': 'internal-test-token' }, body: {} }

    await expect(handler(event)).rejects.toThrow('templateKey is required')
  })

  it('should reject unauthorized requests', async () => {
    const handler = await getHandler()
    const event = {
      headers: { 'x-internal-api-token': 'wrong-token' },
      body: { templateKey: 'Welcome', props: {} }
    }

    await expect(handler(event)).rejects.toThrow('Unauthorized')
  })
})
