<template>
  <UDashboardPanel id="coaching-athletes">
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
            <UButton
              color="primary"
              variant="solid"
              icon="i-heroicons-user-plus"
              size="sm"
              class="font-bold"
              @click="openInviteModal('email')"
            >
              Invite Athlete
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-6">
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            My Athletes
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Managing Your Performance Roster
          </p>
        </div>

        <CoachingGroupManager
          v-if="athletes.length > 0 || groups.length > 0"
          v-model:active-group-id="activeGroupId"
          :groups="groups"
          :athletes="athletes"
          :teams="teams"
          @refresh="fetchGroups"
        />

        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UCard v-for="i in 3" :key="i">
            <template #header>
              <div class="flex items-center gap-3">
                <USkeleton class="h-12 w-12 rounded-full" />
                <div class="space-y-2">
                  <USkeleton class="h-4 w-32" />
                  <USkeleton class="h-3 w-48" />
                </div>
              </div>
            </template>
            <USkeleton class="h-20 w-full rounded-lg" />
          </UCard>
        </div>

        <div
          v-else-if="athletes.length === 0"
          class="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
        >
          <div class="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-full mb-4">
            <UIcon name="i-heroicons-users" class="w-8 h-8 text-neutral-400" />
          </div>
          <h3 class="font-bold text-lg">No Athletes Yet</h3>
          <p class="text-neutral-500 mb-6 max-w-xs">
            Send a direct email invite, create one share link for your community, or use an
            athlete's personal invite code.
          </p>
          <div class="flex flex-col sm:flex-row items-center gap-3">
            <UButton
              color="primary"
              label="Create Share Link"
              icon="i-heroicons-link"
              @click="openInviteModal('share')"
            />
            <UButton
              color="neutral"
              variant="outline"
              label="Invite by Email"
              icon="i-heroicons-envelope"
              @click="openInviteModal('email')"
            />
            <UButton
              color="neutral"
              variant="outline"
              label="Connect by Code"
              icon="i-heroicons-ticket"
              @click="openInviteModal('code')"
            />
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CoachingAthleteCard
            v-for="rel in filteredAthletes"
            :key="rel.id"
            :athlete="rel.athlete"
            @view="viewAthlete"
            @message="messageAthlete"
          />
        </div>

        <div
          v-if="activeGroupId !== 'all' && filteredAthletes.length === 0"
          class="py-12 text-center flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-800/20 rounded-lg border border-gray-100 dark:border-gray-800"
        >
          <p class="text-neutral-500 text-sm italic font-medium">
            No athletes assigned to this group yet.
          </p>
        </div>

        <UCard
          :ui="{
            body: 'p-6',
            root: 'overflow-hidden border-2 border-primary-500/20 bg-primary-50/30 dark:bg-primary-950/10'
          }"
        >
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div class="space-y-2 max-w-2xl">
              <p
                class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-700 dark:text-primary-300"
              >
                Coach Onboarding
              </p>
              <h2
                class="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight"
              >
                Invite athletes by email or connect by code
              </h2>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                Send a direct join link to a new athlete, or keep using their existing personal
                invite code if they already shared one with you. You can also create a public share
                link for Facebook groups or community posts.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-3">
              <UButton
                color="primary"
                variant="solid"
                icon="i-heroicons-link"
                label="Create Share Link"
                @click="openInviteModal('share')"
              />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-envelope"
                label="Invite by Email"
                @click="openInviteModal('email')"
              />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-ticket"
                label="Connect by Code"
                @click="openInviteModal('code')"
              />
            </div>
          </div>
        </UCard>

        <UCard v-if="pendingInvites.length > 0" :ui="{ body: 'p-6' }">
          <div class="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Pending Invitations</h2>
              <p class="text-sm text-neutral-500">
                Manage private email invites and public share links from one place.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-plus"
              label="New Invite"
              size="xs"
              class="font-bold"
              @click="openInviteModal('share')"
            />
          </div>

          <div class="space-y-3">
            <div
              v-for="invite in pendingInvites"
              :key="invite.id"
              class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 p-4"
            >
              <div class="space-y-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-gray-900 dark:text-white">
                    {{ invite.email || 'Public Share Link' }}
                  </span>
                  <UBadge
                    :color="invite.email ? 'primary' : 'neutral'"
                    variant="subtle"
                    size="xs"
                    class="uppercase font-bold"
                  >
                    {{ invite.email ? 'Email Invite' : 'Share Link' }}
                  </UBadge>
                </div>
                <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  Expires {{ formatRelative(invite.expiresAt) }}
                </p>
                <CoachingInviteLink :code="invite.code" />
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :icon="invite.email ? 'i-heroicons-envelope' : 'i-heroicons-link'"
                  :label="invite.email ? 'Invite Another' : 'New Share Link'"
                  @click="
                    invite.email ? prefillInviteEmail(invite.email) : openInviteModal('share')
                  "
                />
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  :loading="revokingInviteId === invite.id"
                  @click="revokeInvite(invite.id)"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Connect Athlete Modal -->
  <UModal
    v-model:open="isConnectModalOpen"
    title="Add Athlete"
    description="Send a private email invite, create a public share link, or connect instantly with an athlete-generated invite code."
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <UButton
            label="Share Link"
            icon="i-heroicons-link"
            :color="inviteTab === 'share' ? 'primary' : 'neutral'"
            :variant="inviteTab === 'share' ? 'solid' : 'outline'"
            @click="inviteTab = 'share'"
          />
          <UButton
            label="Invite by Email"
            icon="i-heroicons-envelope"
            :color="inviteTab === 'email' ? 'primary' : 'neutral'"
            :variant="inviteTab === 'email' ? 'solid' : 'outline'"
            @click="inviteTab = 'email'"
          />
          <UButton
            label="Connect by Code"
            icon="i-heroicons-ticket"
            :color="inviteTab === 'code' ? 'primary' : 'neutral'"
            :variant="inviteTab === 'code' ? 'solid' : 'outline'"
            @click="inviteTab = 'code'"
          />
        </div>

        <div v-if="inviteTab === 'share'" class="space-y-4 pt-2">
          <p class="text-sm text-neutral-500">
            Create one open join link you can post in a Facebook group, newsletter, or community
            chat. Anyone with an account can join under you from this link.
          </p>
          <div
            class="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-neutral-50 dark:bg-neutral-900/50 p-4"
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Best For
            </p>
            <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Facebook groups, WhatsApp communities, website CTAs, and onboarding posts for athletes
              who already use Coach Watts.
            </p>
          </div>
        </div>

        <div v-else-if="inviteTab === 'email'" class="space-y-4 pt-2">
          <p class="text-sm text-neutral-500">
            We’ll send a secure join link to your athlete so they can connect their account to you
            directly.
          </p>
          <UFormField
            label="Athlete Email"
            help="The athlete must accept the invite with the same email address."
          >
            <UInput
              v-model="inviteEmail"
              type="email"
              placeholder="athlete@example.com"
              class="w-full"
            />
          </UFormField>
        </div>

        <div v-else class="space-y-4 pt-2">
          <p class="text-sm text-neutral-500">
            Use this when an athlete already shared their personal coach code from their My Team
            page.
          </p>
          <UFormField
            label="Athlete Invite Code"
            help="Codes are 6 characters long (e.g. AB12XY) and are generated by the athlete."
          >
            <UInput
              v-model="connectCode"
              placeholder="ENTER-CODE"
              class="font-mono uppercase text-center text-xl w-full"
              maxlength="6"
            />
          </UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="isConnectModalOpen = false" />
      <UButton
        v-if="inviteTab === 'share'"
        label="Create Share Link"
        color="primary"
        icon="i-heroicons-link"
        :loading="creatingInvite"
        @click="createShareInvite"
      />
      <UButton
        v-else-if="inviteTab === 'email'"
        label="Send Invitation"
        color="primary"
        icon="i-heroicons-envelope"
        :loading="creatingInvite"
        :disabled="!inviteEmail"
        @click="createInvite"
      />
      <UButton
        v-else
        label="Connect Athlete"
        color="primary"
        icon="i-heroicons-ticket"
        :loading="connecting"
        :disabled="!connectCode || connectCode.length < 6"
        @click="connectAthlete"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { formatDistanceToNow } from 'date-fns'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'My Athletes | Coaching',
    meta: [
      {
        name: 'description',
        content: 'Manage the athletes you are currently coaching.'
      }
    ]
  })

  const athletes = ref<any[]>([])
  const groups = ref<any[]>([])
  const teams = ref<any[]>([])
  const activeGroupId = ref('all')
  const loading = ref(true)
  const connecting = ref(false)
  const creatingInvite = ref(false)
  const isConnectModalOpen = ref(false)
  const connectCode = ref('')
  const inviteEmail = ref('')
  const pendingInvites = ref<any[]>([])
  const revokingInviteId = ref<string | null>(null)
  const inviteTab = ref('share')
  const toast = useToast()
  const router = useRouter()

  const filteredAthletes = computed(() => {
    if (activeGroupId.value === 'all') return athletes.value
    const group = groups.value.find((g) => g.id === activeGroupId.value)
    if (!group) return athletes.value
    const memberIds = group.members?.map((m: any) => m.athleteId) || []
    return athletes.value.filter((rel) => memberIds.includes(rel.athlete.id))
  })

  async function fetchData() {
    loading.value = true
    try {
      const [athletesData, groupsData, teamsData, invitesData] = await Promise.all([
        $fetch('/api/coaching/athletes'),
        $fetch('/api/coaching/groups'),
        $fetch('/api/coaching/teams'),
        $fetch('/api/coaching/athletes/invites').catch(() => [])
      ])
      athletes.value = athletesData as any[]
      groups.value = groupsData as any[]
      teams.value = teamsData as any[]
      pendingInvites.value = invitesData as any[]
    } catch (e) {
      console.error(e)
      toast.add({ title: 'Failed to load coaching data', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function fetchGroups() {
    try {
      groups.value = (await ($fetch as any)('/api/coaching/groups')) as any[]
    } catch (e) {
      console.error(e)
    }
  }

  async function connectAthlete() {
    connecting.value = true
    try {
      await $fetch('/api/coaching/athletes/connect', {
        method: 'POST',
        body: { code: connectCode.value.toUpperCase() }
      })
      toast.add({ title: 'Athlete connected successfully!', color: 'success' })
      await fetchData()
      isConnectModalOpen.value = false
      connectCode.value = ''
    } catch (err: any) {
      toast.add({
        title: 'Failed to connect: ' + (err.data?.message || 'Invalid code'),
        color: 'error'
      })
    } finally {
      connecting.value = false
    }
  }

  async function createInvite() {
    creatingInvite.value = true
    try {
      await $fetch('/api/coaching/athletes/invites', {
        method: 'POST',
        body: { email: inviteEmail.value.trim() }
      })
      toast.add({ title: 'Invitation email sent!', color: 'success' })
      inviteEmail.value = ''
      isConnectModalOpen.value = false
      await fetchData()
    } catch (err: any) {
      toast.add({
        title: err.data?.message || 'Failed to send invitation email',
        color: 'error'
      })
    } finally {
      creatingInvite.value = false
    }
  }

  async function revokeInvite(inviteId: string) {
    revokingInviteId.value = inviteId
    try {
      await $fetch(`/api/coaching/athletes/invites/${inviteId}`, {
        method: 'DELETE'
      })
      toast.add({ title: 'Invite revoked', color: 'success' })
      pendingInvites.value = pendingInvites.value.filter((invite) => invite.id !== inviteId)
    } catch (err: any) {
      toast.add({
        title: err.data?.message || 'Failed to revoke invite',
        color: 'error'
      })
    } finally {
      revokingInviteId.value = null
    }
  }

  async function createShareInvite() {
    creatingInvite.value = true
    try {
      await $fetch('/api/coaching/athletes/invites', {
        method: 'POST',
        body: {}
      })
      toast.add({ title: 'Share link created!', color: 'success' })
      isConnectModalOpen.value = false
      await fetchData()
    } catch (err: any) {
      toast.add({
        title: err.data?.message || 'Failed to create share link',
        color: 'error'
      })
    } finally {
      creatingInvite.value = false
    }
  }

  function openInviteModal(tab: 'share' | 'email' | 'code') {
    inviteTab.value = tab
    isConnectModalOpen.value = true
    if (tab !== 'email') inviteEmail.value = ''
    if (tab !== 'code') connectCode.value = ''
  }

  function prefillInviteEmail(email: string) {
    inviteEmail.value = email
    openInviteModal('email')
  }

  function formatRelative(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  function viewAthlete(athlete: any) {
    router.push(`/coaching/athletes/${athlete.id}`)
  }

  function messageAthlete(athlete: any) {
    router.push('/chat')
  }

  onMounted(fetchData)
</script>
