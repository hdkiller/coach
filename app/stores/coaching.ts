import { defineStore } from 'pinia'

export const useCoachingStore = defineStore('coaching', () => {
  const actingAsUserId = ref<string | null>(null)
  const actingAsUserName = ref<string | null>(null)

  // Load from localStorage on init
  if (process.client) {
    const savedId = localStorage.getItem('coaching_act_as_id')
    const savedName = localStorage.getItem('coaching_act_as_name')
    if (savedId) {
      actingAsUserId.value = savedId
      actingAsUserName.value = savedName
    }
  }

  const isCoachingMode = computed(() => !!actingAsUserId.value)

  function startActingAs(userId: string, userName: string) {
    actingAsUserId.value = userId
    actingAsUserName.value = userName
    if (process.client) {
      localStorage.setItem('coaching_act_as_id', userId)
      localStorage.setItem('coaching_act_as_name', userName)
    }
  }

  function stopActingAs() {
    actingAsUserId.value = null
    actingAsUserName.value = null
    if (process.client) {
      localStorage.removeItem('coaching_act_as_id')
      localStorage.removeItem('coaching_act_as_name')
    }
  }

  return {
    actingAsUserId,
    actingAsUserName,
    isCoachingMode,
    startActingAs,
    stopActingAs
  }
})
