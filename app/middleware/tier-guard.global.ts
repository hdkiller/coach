export default defineNuxtRouteMiddleware((to) => {
  const { isUnlockPlus, isUnleash } = useNavigation()

  // Define route prefixes and their required boolean guards
  const unleashRoutes = ['/performance', '/reports']
  const unlockRoutes = ['/chat', '/ai-chat', '/recommendations', '/check-in/daily']

  // Helper to check if current route matches any prefixes
  const matchesRoute = (path: string, prefixes: string[]) =>
    prefixes.some((prefix) => path.startsWith(prefix) || path === prefix)

  if (matchesRoute(to.path, unleashRoutes)) {
    if (!isUnleash.value) {
      return navigateTo({ path: '/dashboard', query: { upgrade: 'true' } })
    }
  }

  if (matchesRoute(to.path, unlockRoutes)) {
    if (!isUnlockPlus.value) {
      return navigateTo({ path: '/dashboard', query: { upgrade: 'true' } })
    }
  }
})
