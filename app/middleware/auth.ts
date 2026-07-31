const DEACTIVATED_LOGIN_PATH = '/login?error=deactivated'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()

  if (config.public.authBypassEnabled) {
    return
  }

  const { status, data, getSession, signOut } = useAuth()

  // Always refresh so session deletion / deactivatedAt from the DB is observed.
  await getSession().catch(() => null)

  if (status.value === 'loading') {
    return
  }

  if (status.value !== 'authenticated') {
    return navigateTo(`/login?callbackUrl=${encodeURIComponent(to.fullPath)}`)
  }

  const deactivatedAt = (data.value?.user as { deactivatedAt?: string | Date | null } | undefined)
    ?.deactivatedAt

  if (deactivatedAt) {
    return signOut({
      callbackUrl: DEACTIVATED_LOGIN_PATH
    }) as Promise<void>
  }
})
