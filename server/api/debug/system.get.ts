import os from 'node:os'
import { requireAdmin } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const now = new Date()

  return {
    time: {
      serverTime: now.toString(),
      serverTimeISO: now.toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      processEnvTZ: process.env.TZ,
      utcDayStart: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      ).toISOString()
    },
    system: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuCount: os.cpus().length
    }
  }
})
