import { buildConsentGateRedirect } from '#shared/consent-redirect'
import { sanitizeCallbackUrl } from '#shared/safe-callback-url'

export default defineNuxtRouteMiddleware(async (to) => {
  const { status, data, getSession, signOut } = useAuth()

  // Always refresh so a deactivation that lands mid-session (deactivatedAt from the
  // DB) is observed before making an onboarding-redirect decision. This global
  // middleware runs before the named auth/guest/oauth-auth middlewares on every
  // navigation, so on a pure client-side route change with no other auth middleware
  // it would otherwise be the only thing consulting a stale cached session. Mirrors
  // the unconditional refresh in app/middleware/auth.ts.
  await getSession().catch(() => null)

  if (status.value === 'loading') return

  if (status.value !== 'authenticated') return

  const user = data.value?.user as
    | {
        termsAcceptedAt?: string | null
        deactivatedAt?: string | Date | null
      }
    | undefined

  if (user?.deactivatedAt) {
    return signOut({
      callbackUrl: '/login?error=deactivated'
    }) as Promise<void>
  }

  const termsAccepted = !!user?.termsAcceptedAt

  if (!termsAccepted) {
    if (to.path === '/onboarding') return

    if (to.path === '/terms' || to.path === '/privacy') return

    if (to.path === '/join' || to.path.startsWith('/join/')) return

    const redirect = buildConsentGateRedirect(to.fullPath)
    return navigateTo(
      redirect ? { path: '/onboarding', query: { redirect } } : { path: '/onboarding' }
    )
  }

  if (to.path === '/onboarding' && to.query.testing !== '1') {
    const redirect = sanitizeCallbackUrl(to.query.redirect)
    return navigateTo(redirect)
  }

  if (to.path === '/onboarding/restart') return
})
