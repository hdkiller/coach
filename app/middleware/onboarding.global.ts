export default defineNuxtRouteMiddleware((to, from) => {
  const { status, data } = useAuth()

  // Only check for authenticated users
  if (status.value !== 'authenticated') return

  const user = data.value?.user as any // Type assertion until types are fully propagated
  const termsAccepted = !!user?.termsAcceptedAt

  // 1. User HAS NOT accepted terms
  if (!termsAccepted) {
    // Allow access to the onboarding page itself
    if (to.path === '/onboarding') return

    // Allow access to public legal pages
    if (to.path === '/terms' || to.path === '/privacy') return

    // Allow sign out flow (if it uses a specific route, though usually it's a function call)
    // We'll allow anything under /auth just in case
    if (to.path.startsWith('/api/auth')) return

    // Redirect to onboarding
    return navigateTo('/onboarding')
  }

  // 2. User HAS accepted terms
  if (termsAccepted) {
    // If trying to visit onboarding again, send them to dashboard UNLESS in testing mode
    if (to.path === '/onboarding' && to.query.testing !== '1') {
      return navigateTo('/dashboard')
    }
  }
})
