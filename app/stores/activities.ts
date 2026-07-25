import { defineStore } from 'pinia'

export const useActivityStore = defineStore('activity', () => {
  const recentActivity = ref<any>(null)
  const loading = ref(false)

  async function fetchRecentActivity() {
    loading.value = true
    try {
      const data = await ($fetch as any)('/api/activity/recent')
      recentActivity.value = data
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    recentActivity,
    loading,
    fetchRecentActivity
  }
})
