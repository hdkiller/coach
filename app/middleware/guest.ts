export default defineNuxtRouteMiddleware(async (to, from) => {
  const { status, data, getSession } = useAuth()

  if (typeof data.value === 'undefined') {
    await getSession().catch(() => null)
  }

  if (status.value === 'loading') {
    return
  }

  if (status.value === 'authenticated') {
    return navigateTo('/dashboard')
  }
})
