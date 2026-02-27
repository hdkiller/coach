export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client-side
  if (import.meta.server) return

  const { gtag } = useGtag()
  const { data } = useAuth()

  // Watch for changes in the user session
  watch(
    () => data.value?.user,
    (user) => {
      if (user?.id) {
        // Set the user_id for all subsequent events
        gtag('set', {
          user_id: user.id
        })

        // You can also set other user properties here
        // gtag('set', 'user_properties', {
        //   user_email: user.email,
        //   is_admin: (user as any).isAdmin
        // })
      } else {
        // Clear user_id on logout
        gtag('set', {
          user_id: undefined
        })
      }
    },
    { immediate: true }
  )
})
