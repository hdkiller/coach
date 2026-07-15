export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const { data } = useAuth()
  const { trackAccountCreated } = useAnalytics()

  watch(
    () => data.value?.user?.id,
    async (userId) => {
      if (!userId) return

      const storageKey = `cw_account_created_claimed_${userId}`
      if (sessionStorage.getItem(storageKey)) return

      try {
        const result = (await ($fetch as any)('/api/user/analytics/account-created-claim', {
          method: 'POST'
        })) as {
          claim: boolean
          method?: string
          entry_point?: string
        }

        if (!result.claim || !result.method) return

        trackAccountCreated(result.method, {
          entry_point: result.entry_point ?? 'oauth',
          source: 'client_claim'
        })
        sessionStorage.setItem(storageKey, '1')
      } catch {
        // Non-blocking analytics fallback
      }
    },
    { immediate: true }
  )
})
