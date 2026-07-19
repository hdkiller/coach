<template>
  <div
    v-if="pending"
    class="min-h-screen bg-gray-950 flex items-center justify-center text-neutral-400"
  >
    <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary-500" />
  </div>

  <div
    v-else-if="error"
    class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4"
  >
    <UCard class="w-full max-w-md">
      <div class="p-8 text-center space-y-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500 mx-auto" />
        <h1 class="text-lg font-bold">Join page unavailable</h1>
        <p class="text-sm text-neutral-500">
          {{ error.message || 'This coach join link is invalid or expired.' }}
        </p>
        <UButton to="/join" color="primary" label="Enter an invite code" />
      </div>
    </UCard>
  </div>

  <CoachJoinPage
    v-else-if="joinPayload"
    :coach="joinPayload.join.coach"
    :join-page="joinPayload.join.joinPage"
    :proof="joinPayload.join.proof"
    :active-invite-available="joinPayload.join.activeInviteAvailable"
    :session="session"
    :joining="joining"
    :signup-url="signupUrl"
    :login-url="loginUrl"
    @join="acceptJoin"
  />
</template>

<script setup lang="ts">
  import CoachJoinPage from '~/components/public/CoachJoinPage.vue'

  definePageMeta({
    layout: false
  })

  useHead({
    htmlAttrs: {
      class: 'dark'
    }
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useAuth()

  const slug = computed(() => route.params.slug as string)
  const joining = ref(false)

  const {
    data: joinPayload,
    pending,
    error
  } = await useAsyncData(
    () => `coach-join-${slug.value}`,
    () => $fetch(`/api/public/coaches/${slug.value}/join`),
    { watch: [slug] }
  )

  const inviteCode = computed(() => joinPayload.value?.join?.activeInviteCode || null)

  const callbackPath = computed(() => {
    if (inviteCode.value) {
      return `/join/${inviteCode.value}?accept=1`
    }
    return `/coach/${slug.value}/join`
  })

  const signupUrl = computed(
    () => `/join?callbackUrl=${encodeURIComponent(callbackPath.value)}`
  )
  const loginUrl = computed(
    () => `/login?callbackUrl=${encodeURIComponent(callbackPath.value)}`
  )

  async function acceptJoin() {
    if (!session.value) {
      await navigateTo(signupUrl.value)
      return
    }

    if (!inviteCode.value) {
      toast.add({
        title: 'No active invite available',
        description: 'Ask your coach for a fresh share link.',
        color: 'warning'
      })
      return
    }

    joining.value = true
    try {
      await $fetch(`/api/join/${inviteCode.value}`, { method: 'POST' })
      toast.add({
        title: 'Successfully connected with coach!',
        color: 'success'
      })
      router.push('/coaching/team')
    } catch (err: any) {
      toast.add({
        title: 'Failed to join: ' + (err.data?.message || 'Unknown error'),
        color: 'error'
      })
    } finally {
      joining.value = false
    }
  }
</script>
