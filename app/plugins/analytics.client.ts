export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client-side
  if (import.meta.server) return

  const { gtag } = useGtag()
  const { data } = useAuth()
  const userStore = useUserStore()
  const colorMode = useColorMode()

  // Watch for changes in the user session
  watch(
    () => data.value?.user,
    (user) => {
      if ((user as any)?.id) {
        // Set the user_id for all subsequent events
        gtag('set', {
          user_id: (user as any).id
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

  // Watch for theme changes
  watch(
    () => colorMode.value,
    (theme) => {
      gtag('set', {
        client_theme: theme
      })
    },
    { immediate: true }
  )
})
