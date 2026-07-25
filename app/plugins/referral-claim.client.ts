/**
 * After OAuth signup, claim any pending `cw_via` cookie if auth-event attribution missed it.
 * `cw_via` is httpOnly, so we retry on auth changes and /join?via= landings (cookie set server-side).
 */
export default defineNuxtPlugin(() => {
  const { status } = useAuth()
  const route = useRoute()
  const claimed = useState('referral-claim-attempted', () => false)
  const inFlight = useState('referral-claim-in-flight', () => false)

  async function tryClaim() {
    if (status.value !== 'authenticated' || claimed.value || inFlight.value) return

    inFlight.value = true
    try {
      await $fetch('/api/referrals/claim', { method: 'POST' })
      claimed.value = true
    } catch {
      // Leave claimed false so logout/re-auth or /join?via= can retry.
    } finally {
      inFlight.value = false
    }
  }

  watch(
    status,
    (next) => {
      if (next !== 'authenticated') {
        claimed.value = false
        return
      }
      void tryClaim()
    },
    { immediate: true }
  )

  // Cookie is httpOnly; a /join?via= navigation is when it may appear after first auth tick.
  watch(
    () => [route.path, typeof route.query.via === 'string' ? route.query.via : ''] as const,
    ([path, via]) => {
      if (status.value !== 'authenticated' || !via) return
      if (path !== '/join' && !path.startsWith('/join/')) return
      claimed.value = false
      void tryClaim()
    }
  )
})
