import { useCoachingStore } from '../stores/coaching'

export default defineNuxtPlugin(() => {
  const coachingStore = useCoachingStore()

  // Intercept all $fetch requests
  globalThis.$fetch = $fetch.create({
    onRequest({ options }) {
      if (coachingStore.actingAsUserId) {
        options.headers = {
          ...options.headers,
          'x-act-as-user': coachingStore.actingAsUserId
        }
      }
    }
  })
})
