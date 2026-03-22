<template>
  <UDashboardPanel id="coaching-team">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <CoachingNavbarLinks />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-8">
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            My Team
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Your Personal Coaching & Mentorship Network
          </p>
        </div>

        <!-- Invite Section -->
        <UCard
          :ui="{
            body: 'p-6',
            root: 'overflow-hidden border-2 border-primary-500/20 bg-primary-50/30 dark:bg-primary-950/10'
          }"
        >
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-1">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">Invite a Coach</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-md">
                Give this code to your coach so they can connect to your account and manage your
                training.
              </p>
            </div>

            <div class="flex flex-col items-center gap-3">
              <div v-if="invite.code" class="flex items-center gap-2">
                <div
                  class="px-6 py-3 bg-white dark:bg-gray-900 border-2 border-primary-500 rounded-lg font-mono text-2xl font-bold tracking-widest shadow-inner text-primary-600 dark:text-primary-400"
                >
                  {{ invite.code }}
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-clipboard"
                  @click="copyInvite"
                />
              </div>
              <div
                v-else-if="loadingInvite"
                class="h-14 w-48 bg-gray-200 animate-pulse rounded-lg"
              />

              <UButton
                v-if="!invite.code"
                color="primary"
                label="Generate Invite Code"
                icon="i-heroicons-plus"
                :loading="generatingInvite"
                @click="createInvite"
              />
              <p v-else class="text-[10px] text-neutral-500 uppercase font-bold">
                Expires {{ formatFullDate(invite.expiresAt) }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- My Teams Section (For Coaches) -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Professional Teams</h2>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                label="Join Team"
                icon="i-heroicons-ticket"
                size="xs"
                class="font-bold"
                @click="isJoinTeamModalOpen = true"
              />
              <UButton
                color="neutral"
                variant="outline"
                label="Create Team"
                icon="i-heroicons-plus"
                size="xs"
                class="font-bold"
                @click="isCreateTeamModalOpen = true"
              />
            </div>
          </div>

          <div v-if="loadingTeams" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <USkeleton v-for="i in 2" :key="i" class="h-32 w-full rounded-xl" />
          </div>

          <div
            v-else-if="teams.length === 0"
            class="text-center py-12 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800"
          >
            <div class="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-full mb-3 inline-block">
              <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-neutral-400" />
            </div>
            <p class="text-neutral-500 text-sm">You haven't created or joined any teams yet.</p>
            <div class="flex items-center justify-center gap-2 mt-4">
              <UButton
                color="primary"
                variant="link"
                label="Start a Team"
                @click="isCreateTeamModalOpen = true"
              />
              <span class="text-neutral-400 text-xs">or</span>
              <UButton
                color="primary"
                variant="link"
                label="Join with Code"
                @click="isJoinTeamModalOpen = true"
              />
            </div>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UCard
              v-for="membership in teams"
              :key="membership.id"
              class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group"
              @click="viewTeam(membership.team.id)"
            >
              <div class="flex items-start justify-between">
                <div class="space-y-1">
                  <h3
                    class="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors"
                  >
                    {{ membership.team.name }}
                  </h3>
                  <p class="text-xs text-neutral-500 line-clamp-2">
                    {{ membership.team.description || 'No description provided.' }}
                  </p>
                </div>
                <UBadge color="neutral" variant="subtle" size="xs" class="font-bold uppercase">
                  {{ membership.role }}
                </UBadge>
              </div>

              <div
                class="mt-4 flex items-center gap-4 text-[10px] font-black uppercase text-neutral-400"
              >
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-users" />
                  {{ membership.team._count?.members || 0 }} Members
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-rectangle-group" />
                  {{ membership.team._count?.groups || 0 }} Groups
                </div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- My Coaches List -->
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">My Coaches</h2>

          <div v-if="loading" class="space-y-4">
            <UCard v-for="i in 2" :key="i">
              <div class="flex items-center gap-3">
                <USkeleton class="h-10 w-10 rounded-full" />
                <USkeleton class="h-4 w-48" />
              </div>
            </UCard>
          </div>

          <div
            v-else-if="coaches.length === 0"
            class="text-center py-12 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-full mb-3 inline-block">
              <UIcon name="i-heroicons-academic-cap" class="w-6 h-6 text-neutral-400" />
            </div>
            <p class="text-neutral-500 text-sm">You haven't connected with any coaches yet.</p>
          </div>

          <div v-else class="space-y-3">
            <UCard v-for="rel in coaches" :key="rel.id" :ui="{ body: 'p-3 sm:p-4' }">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <UAvatar :src="rel.coach.image" :alt="rel.coach.name" />
                  <div>
                    <p class="font-bold text-sm">{{ rel.coach.name }}</p>
                    <p class="text-xs text-neutral-500">{{ rel.coach.email }}</p>
                  </div>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  label="Remove"
                  @click="confirmRemoveCoach(rel.coach)"
                />
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Remove Coach Confirmation -->
  <UModal
    v-model:open="isRemoveModalOpen"
    title="Remove Coach"
    :description="`Are you sure you want to remove ${coachToRemove?.name} as your coach? They will no longer have access to your data.`"
  >
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="isRemoveModalOpen = false" />
      <UButton label="Remove Coach" color="error" :loading="removingCoach" @click="removeCoach" />
    </template>
  </UModal>

  <!-- Create Team Modal -->
  <UModal
    v-model:open="isCreateTeamModalOpen"
    title="Start Professional Team"
    description="Create a new professional organization to manage your coaching staff and athletes."
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Team Name" help="The official name of your coaching group.">
          <UInput
            v-model="newTeam.name"
            placeholder="e.g., Summit Performance Lab"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Description" help="A brief overview of your team's focus or philosophy.">
          <UTextarea
            v-model="newTeam.description"
            placeholder="What is this team about?"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        @click="isCreateTeamModalOpen = false"
      />
      <UButton label="Create Team" color="primary" :loading="creatingTeam" @click="createTeam" />
    </template>
  </UModal>

  <!-- Join Team Modal -->
  <UModal
    v-model:open="isJoinTeamModalOpen"
    title="Join a Professional Team"
    description="Enter an invitation code to join an existing coaching organization."
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          label="Invitation Code"
          help="Codes are provided by team managers and are usually 8-10 characters long."
        >
          <UInput
            v-model="joinCode"
            placeholder="INVITE-CODE"
            class="font-mono uppercase text-center text-xl w-full"
            maxlength="10"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        @click="isJoinTeamModalOpen = false"
      />
      <UButton
        label="Join Team"
        color="primary"
        :loading="joiningTeam"
        :disabled="!joinCode"
        @click="joinTeam"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'My Team | Coaching',
    meta: [
      {
        name: 'description',
        content: 'Manage your coaching relationships and mentorship network.'
      }
    ]
  })

  const coaches = ref<any[]>([])
  const teams = ref<any[]>([])
  const invite = ref<any>({ status: 'NONE' })

  const loading = ref(true)
  const loadingTeams = ref(true)
  const loadingInvite = ref(false)
  const generatingInvite = ref(false)
  const removingCoach = ref(false)
  const creatingTeam = ref(false)
  const joiningTeam = ref(false)

  const isRemoveModalOpen = ref(false)
  const isCreateTeamModalOpen = ref(false)
  const isJoinTeamModalOpen = ref(false)
  const coachToRemove = ref<any>(null)

  const newTeam = ref({
    name: '',
    description: ''
  })
  const joinCode = ref('')

  const toast = useToast()
  const router = useRouter()

  async function fetchData() {
    loading.value = true
    loadingTeams.value = true
    try {
      const [coachesData, inviteData, teamsData] = await Promise.all([
        $fetch('/api/coaching/coaches'),
        $fetch('/api/coaching/invite'),
        $fetch('/api/coaching/teams')
      ])
      coaches.value = coachesData as any[]
      invite.value = inviteData
      teams.value = teamsData as any[]
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Failed to load coaching data', color: 'error' })
    } finally {
      loading.value = false
      loadingTeams.value = false
    }
  }

  async function createTeam() {
    if (!newTeam.value.name) return
    creatingTeam.value = true
    try {
      await $fetch('/api/coaching/teams', {
        method: 'POST',
        body: newTeam.value
      })
      toast.add({ title: 'Team created!', color: 'success' })
      isCreateTeamModalOpen.value = false
      newTeam.value = { name: '', description: '' }
      await fetchData()
    } catch (e) {
      toast.add({ title: 'Failed to create team', color: 'error' })
    } finally {
      creatingTeam.value = false
    }
  }

  async function joinTeam() {
    if (!joinCode.value) return
    joiningTeam.value = true
    try {
      await $fetch('/api/coaching/teams/accept', {
        method: 'POST',
        body: { code: joinCode.value.toUpperCase() }
      })
      toast.add({ title: 'Successfully joined the team!', color: 'success' })
      isJoinTeamModalOpen.value = false
      joinCode.value = ''
      await fetchData()
    } catch (err: any) {
      toast.add({
        title: 'Failed to join: ' + (err.data?.message || 'Invalid code'),
        color: 'error'
      })
    } finally {
      joiningTeam.value = false
    }
  }

  function viewTeam(teamId: string) {
    router.push(`/coaching/teams/${teamId}`)
  }

  async function createInvite() {
    generatingInvite.value = true
    try {
      invite.value = await $fetch('/api/coaching/invite', { method: 'POST' })
      toast.add({ title: 'Invite code generated!', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Failed to generate code', color: 'error' })
    } finally {
      generatingInvite.value = false
    }
  }

  function confirmRemoveCoach(coach: any) {
    coachToRemove.value = coach
    isRemoveModalOpen.value = true
  }

  async function removeCoach() {
    if (!coachToRemove.value) return
    removingCoach.value = true
    try {
      await $fetch(`/api/coaching/coaches/${coachToRemove.value.id}`, { method: 'DELETE' })
      toast.add({ title: 'Coach removed', color: 'success' })
      await fetchData()
      isRemoveModalOpen.value = false
    } catch (e) {
      toast.add({ title: 'Failed to remove coach', color: 'error' })
    } finally {
      removingCoach.value = false
    }
  }

  function copyInvite() {
    if (!invite.value.code) return
    navigator.clipboard.writeText(invite.value.code)
    toast.add({ title: 'Code copied to clipboard', color: 'primary' })
  }

  function formatFullDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  onMounted(fetchData)
</script>
