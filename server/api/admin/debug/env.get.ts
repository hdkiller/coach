import { defineEventHandler, createError } from 'h3'
import { getServerSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Helper to mask sensitive values
  const maskValue = (key: string, value: any) => {
    if (!value) return value
    const strVal = String(value)
    const upperKey = key.toUpperCase()
    // Heuristic for secrets
    if (
      upperKey.includes('SECRET') ||
      upperKey.includes('KEY') ||
      upperKey.includes('TOKEN') ||
      upperKey.includes('PASSWORD') ||
      upperKey.includes('URL') ||
      upperKey.includes('AUTH') ||
      upperKey.includes('CREDENTIAL')
    ) {
      return '********'
    }
    return strVal
  }

  // 1. Process Env (System + .env)
  const env = process.env
  const safeEnv: Record<string, string> = {}
  const sortedEnvKeys = Object.keys(env).sort()

  for (const key of sortedEnvKeys) {
    if (env[key]) {
      safeEnv[key] = maskValue(key, env[key])
    }
  }

  // 2. Nuxt Runtime Config
  const config = useRuntimeConfig()

  // Public Config (Safe to show generally, but applying mask just in case)
  const safePublicConfig: Record<string, any> = {}
  for (const key in config.public) {
    safePublicConfig[key] = config.public[key]
  }

  // Private Config (Needs masking)
  const safePrivateConfig: Record<string, any> = {}
  for (const key in config) {
    if (['public', 'app', 'nitro'].includes(key)) continue // Skip internals/public
    // @ts-expect-error - Iterate over dynamic config keys
    safePrivateConfig[key] = maskValue(key, config[key])
  }

  return {
    env: safeEnv,
    runtimeConfig: {
      public: safePublicConfig,
      private: safePrivateConfig
    }
  }
})
