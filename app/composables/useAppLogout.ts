export function useAppLogout() {
  const { signOut } = useAuth()
  const coachingStore = useCoachingStore()

  function clearAuthOverrides() {
    coachingStore.clearActingAs()

    if (import.meta.client) {
      document.cookie = 'auth.impersonation_meta=; path=/; max-age=0; SameSite=Lax'
    }
  }

  async function logout(callbackUrl = '/login') {
    clearAuthOverrides()

    await signOut({ callbackUrl })
  }

  return {
    clearAuthOverrides,
    logout
  }
}
