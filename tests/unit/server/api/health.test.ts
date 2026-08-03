import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryRaw = vi.fn()
const setResponseStatusMock = vi.fn()
const setResponseHeaderMock = vi.fn()

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('setResponseStatus', setResponseStatusMock)
vi.stubGlobal('setResponseHeader', setResponseHeaderMock)

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args)
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../server/api/health.get')
  return mod.default
}

describe('GET /api/health', () => {
  beforeEach(() => {
    queryRaw.mockReset()
    setResponseStatusMock.mockClear()
    setResponseHeaderMock.mockClear()
  })

  it('returns ok when the database is reachable', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }])

    const handler = await getHandler()
    const result = await handler({} as any)

    expect(result).toMatchObject({
      status: 'ok',
      checks: {
        database: {
          status: 'connected'
        }
      }
    })
    expect(result.error).toBeUndefined()
  })

  it('sanitizes database errors in the 503 response and logs the full error', async () => {
    const sensitiveError = new Error(
      "Can't reach database server at `db.internal.example:5432` with password=supersecret"
    )
    queryRaw.mockRejectedValue(sensitiveError)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const handler = await getHandler()
    const result = await handler({} as any)

    expect(result).toMatchObject({
      status: 'error',
      checks: {
        database: {
          status: 'disconnected'
        }
      },
      error: 'Database connection error'
    })
    expect(JSON.stringify(result)).not.toContain('db.internal.example')
    expect(JSON.stringify(result)).not.toContain('supersecret')
    expect(JSON.stringify(result)).not.toContain(sensitiveError.message)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[health] Database connection check failed:',
      sensitiveError
    )

    consoleErrorSpy.mockRestore()
  })
})
