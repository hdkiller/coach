export default defineTask({
  meta: {
    name: 'shield:cleanBans',
    description: 'Clean expired bans from nuxt-api-shield storage.'
  },
  async run() {
    const shieldStorage = useStorage('shield')

    const banKeys = await shieldStorage.getKeys('ban:')

    let cleanedCount = 0
    for (const key of banKeys) {
      const bannedUntilRaw = await shieldStorage.getItem(key)

      // Implement check locally as #imports is failing in Nitro tasks
      const isExpired = (val: any) => {
        if (val === null || val === undefined) return true
        const numericTimestamp = Number(val)
        if (Number.isNaN(numericTimestamp)) return true
        return Date.now() >= numericTimestamp
      }

      if (isExpired(bannedUntilRaw)) {
        await shieldStorage.removeItem(key)
        cleanedCount++
      }
    }
    if (cleanedCount > 0) {
      console.log(`[nuxt-api-shield] Cleaned ${cleanedCount} expired ban(s).`)
    }
    return { result: { cleanedCount } }
  }
})
