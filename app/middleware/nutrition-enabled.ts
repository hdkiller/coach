export default defineNuxtRouteMiddleware(async () => {
  const userStore = useUserStore()

  if (!userStore.user) {
    await userStore.fetchUser()
  }
  if (!userStore.profile) {
    await userStore.fetchProfile()
  }

  const nutritionEnabled =
    userStore.user?.nutritionTrackingEnabled !== false &&
    userStore.profile?.nutritionTrackingEnabled !== false

  if (!nutritionEnabled) {
    return navigateTo('/dashboard')
  }
})
