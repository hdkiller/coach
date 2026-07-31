import { defineStore } from 'pinia'

const ACT_AS_COOKIE_NAME = 'coach_wattz_act_as_user'
const ACT_AS_DASHBOARD_PATH = '/dashboard'

function persistActAsCookie(userId: string | null) {
  if (!import.meta.client) return

  if (!userId) {
    document.cookie = `${ACT_AS_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
    return
  }

  document.cookie = `${ACT_AS_COOKIE_NAME}=${encodeURIComponent(userId)}; path=/; SameSite=Lax`
}

/**
 * Hard-navigate so identity-scoped Pinia caches (user, profile, entitlements)
 * are wiped and re-fetched under the new act-as (or restored coach) identity.
 */
function hardResetForIdentityChange(path?: string) {
  if (!import.meta.client) return

  if (path) {
    window.location.assign(path)
    return
  }

  window.location.reload()
}

export const useCoachingStore = defineStore('coaching', () => {
  const actingAsUserId = ref<string | null>(null)
  const actingAsUserName = ref<string | null>(null)

  // Load from localStorage on init
  if (import.meta.client) {
    const savedId = localStorage.getItem('coaching_act_as_id')
    const savedName = localStorage.getItem('coaching_act_as_name')
    if (savedId) {
      actingAsUserId.value = savedId
      actingAsUserName.value = savedName
      persistActAsCookie(savedId)
    }
  }

  const isCoachingMode = computed(() => !!actingAsUserId.value)

  function startActingAs(userId: string, userName: string) {
    actingAsUserId.value = userId
    actingAsUserName.value = userName
    if (import.meta.client) {
      localStorage.setItem('coaching_act_as_id', userId)
      localStorage.setItem('coaching_act_as_name', userName)
      persistActAsCookie(userId)
      // Mirror stopActingAs: full navigation clears stale coach identity UI
      hardResetForIdentityChange(ACT_AS_DASHBOARD_PATH)
    }
  }

  function clearActingAs() {
    actingAsUserId.value = null
    actingAsUserName.value = null
    if (import.meta.client) {
      localStorage.removeItem('coaching_act_as_id')
      localStorage.removeItem('coaching_act_as_name')
      persistActAsCookie(null)
    }
  }

  function stopActingAs() {
    clearActingAs()
    // Force reload to clear all states and re-fetch session
    hardResetForIdentityChange()
  }

  return {
    actingAsUserId,
    actingAsUserName,
    isCoachingMode,
    startActingAs,
    clearActingAs,
    stopActingAs
  }
})
