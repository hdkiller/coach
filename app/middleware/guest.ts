export default defineNuxtRouteMiddleware(async (to) => {
  const { status, data, getSession, signOut } = useAuth()

  await getSession().catch(() => null)

  if (status.value === 'loading') {
    return
  }

  const deactivatedAt = (data.value?.user as { deactivatedAt?: string | Date | null } | undefined)
    ?.deactivatedAt

  if (status.value === 'authenticated' && deactivatedAt) {
    return signOut({
      callbackUrl: '/login?error=deactivated'
    }) as Promise<void>
  }

  // Surface deactivated-account messaging on the sign-in page (owned-path UX).
  if (import.meta.client && to.query.error === 'deactivated') {
    const toast = useToast()
    toast.add({
      title: 'Account deactivated',
      description:
        'Your account has been deactivated. Contact support if you believe this is a mistake.',
      color: 'error'
    })

    const restQuery = { ...to.query }
    delete restQuery.error
    return navigateTo({ path: to.path, query: restQuery }, { replace: true })
  }

  // ?preview=1 keeps guest pages visible under AUTH_BYPASS_USER (local review only)
  if (status.value === 'authenticated' && to.query.preview !== '1') {
    return navigateTo('/dashboard')
  }
})
