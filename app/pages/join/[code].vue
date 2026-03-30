<script setup lang="ts">
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useAuth()

  const code = computed(() => (route.params.code as string)?.toUpperCase())
  const invite = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const joining = ref(false)

  async function fetchInvite() {
    loading.value = true
    error.value = null
    try {
      invite.value = await $fetch(`/api/join/${code.value}`)
    } catch (err: any) {
      error.value = err.data?.message || 'Invalid or expired invitation code.'
    } finally {
      loading.value = false
    }
  }

  async function acceptJoin() {
    if (!session.value) {
      // Redirect to login with callback
      await navigateTo(`/login?callbackUrl=${encodeURIComponent(route.fullPath)}`)
      return
    }

    joining.value = true
    try {
      const response: any = await $fetch(`/api/join/${code.value}`, {
        method: 'POST'
      })

      toast.add({
        title:
          response.type === 'TEAM'
            ? 'Successfully joined the team!'
            : 'Successfully connected with coach!',
        color: 'success'
      })

      if (response.type === 'TEAM' && response.teamId) {
        router.push(`/coaching/teams/${response.teamId}`)
      } else {
        router.push('/coaching/team')
      }
    } catch (err: any) {
      toast.add({
        title: 'Failed to join: ' + (err.data?.message || 'Unknown error'),
        color: 'error'
      })
    } finally {
      joining.value = false
    }
  }

  onMounted(fetchInvite)
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
    <UCard class="w-full max-w-md overflow-hidden">
      <div v-if="loading" class="p-8 text-center space-y-4">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-12 h-12 text-primary-500 animate-spin mx-auto"
        />
        <p class="text-neutral-500 font-medium">Checking invitation...</p>
      </div>

      <div v-else-if="error" class="p-8 text-center space-y-6">
        <div class="bg-error-50 dark:bg-error-950/20 p-4 rounded-full inline-block">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500" />
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-black text-gray-900 dark:text-white uppercase">
            Invite Not Found
          </h1>
          <p class="text-neutral-500">{{ error }}</p>
        </div>
        <UButton
          to="/dashboard"
          color="neutral"
          variant="ghost"
          label="Back to Dashboard"
          block
          size="lg"
        />
      </div>

      <div v-else-if="invite" class="p-0">
        <!-- Hero Header -->
        <div class="bg-primary-600 p-8 text-center text-white space-y-2 relative overflow-hidden">
          <div class="relative z-10">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
              You've been invited
            </p>
            <h1 class="text-3xl font-black uppercase tracking-tight leading-none">
              {{ invite.type === 'TEAM' ? 'Join Team' : 'Connect with Coach' }}
            </h1>
          </div>
          <!-- Decorative Background -->
          <div class="absolute inset-0 opacity-10 pointer-events-none">
            <UIcon
              name="i-lucide-users"
              class="w-64 h-64 -bottom-12 -right-12 absolute transform rotate-12"
            />
          </div>
        </div>

        <div class="p-8 space-y-8">
          <!-- Content -->
          <div class="flex flex-col items-center text-center space-y-4">
            <UAvatar
              v-if="invite.image"
              :src="invite.image"
              :alt="invite.name"
              size="2xl"
              class="ring-4 ring-primary-500/20"
            />
            <div v-else class="bg-primary-50 dark:bg-primary-950/30 p-6 rounded-full">
              <UIcon
                :name="invite.type === 'TEAM' ? 'i-heroicons-user-group' : 'i-heroicons-user'"
                class="w-12 h-12 text-primary-600 dark:text-primary-400"
              />
            </div>

            <div class="space-y-1">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ invite.name }}</h2>
              <p v-if="invite.description" class="text-sm text-neutral-500 italic max-w-xs">
                "{{ invite.description }}"
              </p>
              <div v-if="invite.type === 'TEAM'" class="mt-4 flex flex-wrap justify-center gap-2">
                <UBadge color="neutral" variant="subtle" size="xs" class="font-bold uppercase">
                  Role: {{ invite.role }}
                </UBadge>
                <UBadge
                  v-if="invite.groupName"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="font-bold uppercase"
                >
                  Group: {{ invite.groupName }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <UButton
              color="primary"
              size="xl"
              block
              class="font-black uppercase tracking-wide"
              :loading="joining"
              @click="acceptJoin"
            >
              {{ session ? 'Accept Invitation' : 'Login to Join' }}
            </UButton>
            <p v-if="!session" class="text-[10px] text-center text-neutral-400 uppercase font-bold">
              You must have a Coach Watts account to join
            </p>
            <UButton
              v-if="session"
              to="/dashboard"
              color="neutral"
              variant="ghost"
              label="Not now"
              block
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
