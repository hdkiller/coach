<template>
  <UDashboardPanel id="team-dashboard">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <div class="flex items-center gap-1">
            <UDashboardSidebarCollapse />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-left"
              to="/coaching/team"
            />
          </div>
        </template>
        <template #title>
          <CoachingNavbarLinks />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
            <UBadge v-if="myRole" color="primary" variant="subtle" size="xs" class="font-bold">
              {{ myRole }}
            </UBadge>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="p-6 space-y-6">
        <USkeleton class="h-20 w-full rounded-xl" />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <USkeleton v-for="i in 3" :key="i" class="h-40 w-full rounded-xl" />
        </div>
      </div>

      <div v-else-if="!team" class="p-12 text-center">
        <p class="text-neutral-500">Team not found or access denied.</p>
      </div>

      <div v-else class="p-0 sm:p-6 space-y-6">
        <!-- Team Header Card -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            {{ team.name }}
          </h1>
          <p class="text-sm text-neutral-500 max-w-2xl mt-1">
            {{ team.description || 'No description provided.' }}
          </p>
        </div>

        <!-- Dashboard Content -->
        <UTabs :items="tabs" class="w-full">
          <!-- Roster Tab -->
          <template #roster>
            <div class="space-y-6 pt-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold">Team Roster</h3>
                <UButton
                  v-if="['OWNER', 'ADMIN', 'COACH'].includes(myRole)"
                  color="neutral"
                  variant="outline"
                  label="Add Athlete"
                  icon="i-heroicons-user-plus"
                  size="xs"
                  class="font-bold"
                  @click="openQuickAddModal"
                />
              </div>

              <div
                v-if="roster.length === 0"
                class="text-center py-12 bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800"
              >
                <UIcon name="i-heroicons-users" class="w-12 h-12 text-neutral-300 mb-2" />
                <p class="text-neutral-500">No athletes in this team roster yet.</p>
                <div class="flex items-center justify-center gap-2 mt-4">
                  <UButton
                    color="primary"
                    variant="link"
                    label="Invite with Code"
                    @click="isInviteModalOpen = true"
                  />
                  <span class="text-neutral-400 text-xs">or</span>
                  <UButton
                    color="primary"
                    variant="link"
                    label="Add Coached Athlete"
                    @click="openQuickAddModal"
                  />
                </div>
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CoachingAthleteCard
                  v-for="rel in roster"
                  :key="rel.id"
                  :athlete="rel.athlete"
                  @view="viewAthlete"
                  @message="messageAthlete"
                />
              </div>
            </div>
          </template>

          <!-- Groups Tab -->
          <template #groups>
            <div class="pt-4">
              <CoachingGroupManager
                v-model:active-group-id="activeGroupId"
                :groups="team.groups"
                :athletes="roster"
                :teams="[{ team: team }]"
                @refresh="refreshTeam"
              />

              <!-- Filtered Roster View -->
              <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CoachingAthleteCard
                  v-for="rel in filteredRoster"
                  :key="rel.id"
                  :athlete="rel.athlete"
                  @view="viewAthlete"
                  @message="messageAthlete"
                />
              </div>
              <div
                v-if="activeGroupId !== 'all' && filteredRoster.length === 0"
                class="py-12 text-center bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-gray-100 dark:border-gray-800"
              >
                <p class="text-neutral-500 text-sm italic font-medium">
                  No athletes assigned to this group yet.
                </p>
              </div>
            </div>
          </template>

          <!-- Staff Tab -->
          <template #staff>
            <div class="space-y-4 pt-4">
              <h3 class="text-lg font-bold">Team Staff</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UCard v-for="member in staffMembers" :key="member.id">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <UAvatar :src="member.user.image" :alt="member.user.name" />
                      <div>
                        <p class="font-bold text-sm">{{ member.user.name }}</p>
                        <p class="text-xs text-neutral-500">{{ member.user.email }}</p>
                      </div>
                    </div>
                    <UBadge color="neutral" variant="soft" size="xs">{{ member.role }}</UBadge>
                  </div>
                </UCard>
              </div>
            </div>
          </template>

          <!-- Settings & Management -->
          <template #settings>
            <div class="space-y-8 pt-4">
              <!-- Invites Section -->
              <div v-if="['OWNER', 'ADMIN'].includes(myRole)">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-bold">Pending Invitations</h3>
                  <UButton
                    color="neutral"
                    variant="outline"
                    label="Create Invite"
                    icon="i-heroicons-plus"
                    size="xs"
                    class="font-bold"
                    @click="isInviteModalOpen = true"
                  />
                </div>

                <div
                  v-if="invites.length === 0"
                  class="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <p class="text-sm text-neutral-500">No active invites.</p>
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="inv in invites"
                    :key="inv.id"
                    class="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
                  >
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-primary-600">{{ inv.code }}</span>
                        <UBadge size="xs" color="neutral">{{ inv.role }}</UBadge>
                      </div>
                      <p v-if="inv.email" class="text-xs text-neutral-500">{{ inv.email }}</p>
                      <p class="text-[10px] text-neutral-400">
                        Expires {{ formatRelative(inv.expiresAt) }}
                      </p>
                    </div>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-clipboard"
                      size="xs"
                      @click="copyInvite(inv.code)"
                    />
                  </div>
                </div>
              </div>

              <!-- Danger Zone -->
              <div
                v-if="myRole === 'OWNER'"
                class="pt-8 border-t border-gray-100 dark:border-gray-800"
              >
                <h3 class="text-lg font-bold text-error-600 mb-2">Danger Zone</h3>
                <UCard :ui="{ body: 'p-4', root: 'border-error-500/20 bg-error-50/10' }">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-bold text-sm">Delete Team</p>
                      <p class="text-xs text-neutral-500">
                        Permanently delete this team and all its groups. This cannot be undone.
                      </p>
                    </div>
                    <UButton
                      color="error"
                      variant="soft"
                      label="Delete Team"
                      @click="confirmDeleteTeam"
                    />
                  </div>
                </UCard>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create Invite Modal -->
  <UModal
    v-model:open="isInviteModalOpen"
    title="Invite Member to Team"
    description="Generate a secure invitation code to add new staff or athletes to your team."
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          label="Restricted to Email"
          help="Optional: If provided, only this email address can use the code."
        >
          <UInput
            v-model="newInvite.email"
            type="email"
            placeholder="athlete@example.com"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Assign Role" help="Determine the level of access for the new member.">
          <USelect
            v-model="newInvite.role"
            :items="[
              { label: 'Athlete', value: 'ATHLETE' },
              { label: 'Coach', value: 'COACH' },
              { label: 'Admin', value: 'ADMIN' }
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="isInviteModalOpen = false" />
      <UButton
        label="Generate Invite"
        color="primary"
        :loading="creatingInvite"
        @click="createInvite"
      />
    </template>
  </UModal>

  <!-- Quick Add Athlete Modal -->
  <UModal
    v-model:open="isQuickAddModalOpen"
    title="Add Connected Athlete"
    description="Directly add an athlete you already coach to this professional team."
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          label="Select Athlete"
          help="Only athletes you currently have a direct coaching relationship with are listed here."
        >
          <USelect
            v-model="selectedAthleteToQuickAdd"
            :items="availableCoachedAthletes"
            placeholder="Select from your coached athletes..."
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
        @click="isQuickAddModalOpen = false"
      />
      <UButton
        label="Add to Team"
        color="primary"
        :loading="quickAdding"
        :disabled="!selectedAthleteToQuickAdd"
        @click="quickAddAthlete"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { formatDistanceToNow } from 'date-fns'

  definePageMeta({
    middleware: 'auth'
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const team = ref<any>(null)
  const roster = ref<any[]>([])
  const invites = ref<any[]>([])
  const myCoachedAthletes = ref<any[]>([])
  const loading = ref(true)
  const creatingInvite = ref(false)
  const isInviteModalOpen = ref(false)
  const isQuickAddModalOpen = ref(false)
  const quickAdding = ref(false)
  const selectedAthleteToQuickAdd = ref('')
  const activeGroupId = ref('all')

  const newInvite = ref({
    email: '',
    role: 'ATHLETE' as any
  })

  const tabs = computed(() => {
    const isStaff = ['OWNER', 'ADMIN', 'COACH'].includes(myRole.value)

    const items = []
    if (isStaff) {
      items.push({ label: 'Roster', slot: 'roster', icon: 'i-heroicons-users' })
      items.push({ label: 'Groups', slot: 'groups', icon: 'i-heroicons-rectangle-group' })
    }

    items.push({ label: 'Staff', slot: 'staff', icon: 'i-heroicons-academic-cap' })

    if (['OWNER', 'ADMIN'].includes(myRole.value)) {
      items.push({ label: 'Management', slot: 'settings', icon: 'i-heroicons-cog-6-tooth' })
    }

    return items
  })

  const myRole = computed(() => {
    if (!team.value) return null
    const member = team.value.members.find((m: any) => m.userId === useUserStore().user?.id)
    return member?.role || null
  })

  const staffMembers = computed(() => {
    if (!team.value) return []
    return team.value.members.filter((m: any) => ['OWNER', 'ADMIN', 'COACH'].includes(m.role))
  })

  const filteredRoster = computed(() => {
    if (activeGroupId.value === 'all') return roster.value || []
    const group = team.value?.groups?.find((g: any) => g.id === activeGroupId.value)
    if (!group) return roster.value || []
    const memberIds = group.members?.map((m: any) => m.athleteId) || []
    return (roster.value || []).filter((rel) => rel.athlete && memberIds.includes(rel.athlete.id))
  })

  const availableCoachedAthletes = computed(() => {
    if (!myCoachedAthletes.value) return []
    return myCoachedAthletes.value
      .filter((a) => a.athlete && !roster.value.some((r) => r.athlete?.id === a.athlete.id))
      .map((a) => ({
        label: a.athlete.name || a.athlete.email,
        value: a.athlete.id
      }))
  })

  async function openQuickAddModal() {
    isQuickAddModalOpen.value = true
    try {
      const data = await $fetch('/api/coaching/athletes')
      myCoachedAthletes.value = data as any[]
    } catch (e) {
      console.error(e)
    }
  }

  async function quickAddAthlete() {
    if (!selectedAthleteToQuickAdd.value) return
    quickAdding.value = true
    try {
      await $fetch(`/api/coaching/teams/${team.value.id}/members/add`, {
        method: 'POST',
        body: { athleteId: selectedAthleteToQuickAdd.value }
      })
      toast.add({ title: 'Athlete added to team!', color: 'success' })
      isQuickAddModalOpen.value = false
      selectedAthleteToQuickAdd.value = ''
      await refreshTeam()
    } catch (e) {
      toast.add({ title: 'Failed to add athlete', color: 'error' })
    } finally {
      quickAdding.value = false
    }
  }

  async function refreshTeam() {
    const teamId = route.params.id as string
    try {
      team.value = await $fetch(`/api/coaching/teams/${teamId}`)

      const [rosterData, invitesData] = await Promise.all([
        $fetch(`/api/coaching/teams/${teamId}/roster`).catch(() => []),
        $fetch(`/api/coaching/teams/${teamId}/invites`).catch(() => [])
      ])

      roster.value = rosterData as any[]
      invites.value = invitesData as any[]
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Failed to load team data', color: 'error' })
    }
  }

  async function createInvite() {
    creatingInvite.value = true
    try {
      await $fetch(`/api/coaching/teams/${team.value.id}/invites`, {
        method: 'POST',
        body: newInvite.value
      })
      toast.add({ title: 'Invite code generated!', color: 'success' })
      isInviteModalOpen.value = false
      newInvite.value = { email: '', role: 'ATHLETE' }
      await refreshTeam()
    } catch (e) {
      toast.add({ title: 'Failed to create invite', color: 'error' })
    } finally {
      creatingInvite.value = false
    }
  }

  function copyInvite(code: string) {
    navigator.clipboard.writeText(code)
    toast.add({ title: 'Code copied to clipboard', color: 'primary' })
  }

  function viewAthlete(athlete: any) {
    router.push(`/coaching/athletes/${athlete.id}`)
  }

  function messageAthlete(athlete: any) {
    router.push('/chat')
  }

  function confirmDeleteTeam() {
    if (!confirm(`Are you sure you want to delete "${team.value.name}"? This cannot be undone.`))
      return
    // Implement delete logic
  }

  function formatRelative(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  onMounted(async () => {
    await refreshTeam()
    loading.value = false
  })
</script>
