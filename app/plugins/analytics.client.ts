export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client-side
  if (import.meta.server) return

  const { gtag } = useGtag()
  const { data } = useAuth()
  const userStore = useUserStore()

  // Watch for changes in the user session
  watch(
    () => data.value?.user,
    (user) => {
      if (user?.id) {
        // Set the user_id for all subsequent events
        gtag('set', {
          user_id: user.id
        })
      } else {
        // Clear user_id on logout
        gtag('set', {
          user_id: undefined
        })
      }
    },
    { immediate: true }
  )

  // Watch for subscription tier changes
  watch(
    () => userStore.entitlements?.tier,
    (tier) => {
      if (tier) {
        gtag('set', {
          subscription_tier: tier
        })
      }
    },
    { immediate: true }
  )
})
