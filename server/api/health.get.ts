import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const start = performance.now()
  let dbStatus: 'connected' | 'disconnected'
  let error = null

  try {
    // fast query to check db connection
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (e: any) {
    dbStatus = 'disconnected'
    error = e.message
    setResponseStatus(event, 503)
  }

  setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
  const duration = Math.round(performance.now() - start)

  return {
    status: dbStatus === 'connected' ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: {
        status: dbStatus,
        latency: `${duration}ms`
      }
    },
    error: error ? error : undefined
  }
})
