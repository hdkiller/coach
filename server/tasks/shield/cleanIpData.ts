interface RateLimit {
  count: number
  time: number
}

export default defineTask({
  meta: {
    name: 'shield:cleanIpData',
    description: 'Clean old IP tracking data from nuxt-api-shield storage.'
  },
  async run() {
    const shieldStorage = useStorage('shield')
    const config = useRuntimeConfig().public.nuxtApiShield as any

    const ipTTLseconds = config?.ipTTL || 7 * 24 * 60 * 60
    const ipTTLms = ipTTLseconds * 1000

    const ipKeys = await shieldStorage.getKeys('ip:')
    const currentTime = Date.now()
    let cleanedCount = 0

    for (const key of ipKeys) {
      const entry = (await shieldStorage.getItem(key)) as RateLimit | null

      if (entry && typeof entry.time === 'number') {
        if (currentTime - entry.time > ipTTLms) {
          await shieldStorage.removeItem(key)
          cleanedCount++
        }
      } else {
        await shieldStorage.removeItem(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`[nuxt-api-shield] Cleaned ${cleanedCount} old/malformed IP data entries.`)
    }
    return { result: { cleanedCount } }
  }
})
