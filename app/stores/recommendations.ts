import { defineStore } from 'pinia'

export const useRecommendationStore = defineStore('recommendation', () => {
  const todayRecommendation = ref<any>(null)
  const loading = ref(false)
  const generating = ref(false)
  const currentRecommendationId = ref<string | null>(null)
  const toast = useToast()
  const { poll } = usePolling()

  // We need to know if intervals is connected to fetch
  const integrationStore = useIntegrationStore()

  async function fetchTodayRecommendation() {
    // If not connected, don't fetch (or handle appropriately)
    if (!integrationStore.intervalsConnected) return

    loading.value = true
    try {
      const data = await $fetch('/api/recommendations/today')
      todayRecommendation.value = data
    } catch (error: any) {
        // 404 is expected if no recommendation exists
        if (error?.statusCode !== 404) {
             console.error('Error fetching recommendation:', error)
        }
    } finally {
      loading.value = false
    }
  }

  async function generateTodayRecommendation() {
    if (generating.value) return

    generating.value = true
    try {
      const result: any = await $fetch('/api/recommendations/today', { method: 'POST' })
      currentRecommendationId.value = result.recommendationId
      
      // Initial fetch to show processing state if API returns it immediately
      await fetchTodayRecommendation()

      toast.add({
        title: 'Analysis Started',
        description: 'Analyzing your recovery and planned workout...',
        color: 'success',
        icon: 'i-heroicons-arrow-path'
      })

      poll(
        () => $fetch('/api/recommendations/today'),
        (data: any) => {
             // Check matching ID and completed status
             return data && 
                    data.id === currentRecommendationId.value && 
                    data.status === 'COMPLETED'
        },
        {
          onSuccess: (data) => {
            todayRecommendation.value = data
            generating.value = false
            currentRecommendationId.value = null
            toast.add({
              title: 'Analysis Complete',
              description: 'Your training recommendation is ready!',
              color: 'success',
              icon: 'i-heroicons-check-circle'
            })
          },
          onMaxAttemptsReached: () => {
             generating.value = false
             currentRecommendationId.value = null
             toast.add({
                title: 'Analysis Taking Longer',
                description: 'The analysis is still running. Please check back in a moment.',
                color: 'warning',
                icon: 'i-heroicons-clock'
             })
          },
          onError: (error) => {
             generating.value = false
             currentRecommendationId.value = null
             console.error('Recommendation polling error:', error)
          }
        }
      )

    } catch (error: any) {
      generating.value = false
      currentRecommendationId.value = null
      toast.add({
        title: 'Generation Failed',
        description: error.data?.message || 'Failed to generate recommendation',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
  }

  return {
    todayRecommendation,
    loading,
    generating,
    fetchTodayRecommendation,
    generateTodayRecommendation
  }
})
