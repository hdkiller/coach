import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  const profile = ref<any>(null)
  const loading = ref(false)
  const generating = ref(false)
  const toast = useToast()
  const { poll } = usePolling()

  async function fetchProfile(force = false) {
    if (profile.value && !force) return

    loading.value = true
    try {
      const data = await $fetch('/api/profile/dashboard')
      profile.value = data?.profile || null
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      loading.value = false
    }
  }

  function generateProfile() {
    return new Promise<void>((resolve, reject) => {
      generating.value = true
      $fetch('/api/profile/generate', { method: 'POST' })
        .then((res: any) => {
          const jobId = res.jobId

          toast.add({
            title: 'Profile Generation Started',
            description: 'Creating your comprehensive athlete profile. This may take a minute...',
            color: 'success',
            icon: 'i-heroicons-check-circle'
          })

          // Poll for completion
          poll(
            () => $fetch(`/api/profile/status?jobId=${jobId}`),
            (data) => !data.isRunning,
            {
              onSuccess: async () => {
                // Fetch the updated profile
                await fetchProfile(true)
                generating.value = false
                toast.add({
                  title: 'Profile Ready',
                  description: 'Your athlete profile has been generated',
                  color: 'success',
                  icon: 'i-heroicons-check-badge'
                })
                resolve()
              },
              onMaxAttemptsReached: () => {
                generating.value = false
                toast.add({
                  title: 'Generation Taking Longer',
                  description: 'Profile generation is still processing.',
                  color: 'warning',
                  icon: 'i-heroicons-clock'
                })
                resolve() // Resolve anyway so UI can unblock, user can check later
              },
              onError: (error) => {
                generating.value = false
                console.error('Profile polling error:', error)
                reject(error)
              }
            }
          )
        })
        .catch((error: any) => {
          generating.value = false
          toast.add({
            title: 'Generation Failed',
            description: error.data?.message || 'Failed to generate profile',
            color: 'error',
            icon: 'i-heroicons-exclamation-circle'
          })
          reject(error)
        })
    })
  }

  return {
    profile,
    loading,
    generating,
    fetchProfile,
    generateProfile
  }
})
