<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2 overflow-x-auto pb-2 flex-1 scrollbar-hide">
        <UButton
          v-for="group in [{ id: 'all', name: 'All Athletes' }, ...groups]"
          :key="group.id"
          :color="activeGroupId === group.id ? 'primary' : 'neutral'"
          :variant="activeGroupId === group.id ? 'solid' : 'ghost'"
          size="sm"
          class="font-black uppercase tracking-tight whitespace-nowrap"
          @click="$emit('update:activeGroupId', group.id)"
        >
          {{ group.name }}
          <span v-if="group.id !== 'all'" class="ml-1 opacity-50 text-[10px]">
            ({{ group._count?.members || 0 }})
          </span>
        </UButton>
      </div>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-heroicons-cog-6-tooth"
        size="sm"
        label="Manage Groups"
        @click="isGroupListModalOpen = true"
      />
    </div>

    <!-- Group Management Modal -->
    <UModal
      v-model:open="isGroupListModalOpen"
      title="Manage Groups"
      description="Organize your athletes into functional groups."
    >
      <template #body>
        <div class="space-y-4">
          <div
            v-if="groups.length === 0"
            class="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            <p class="text-sm text-neutral-500">No groups created yet.</p>
          </div>

          <div v-else class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            <div
              v-for="group in groups"
              :key="group.id"
              class="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
            >
              <div>
                <p class="font-bold text-sm">{{ group.name }}</p>
                <p class="text-[10px] text-neutral-500 uppercase font-black">
                  {{ group._count?.members || 0 }} Athletes
                  <span v-if="group.team" class="ml-2 text-primary-500"
                    >• {{ group.team.name }}</span
                  >
                </p>
              </div>
              <div class="flex items-center gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-user-group"
                  size="xs"
                  @click="openMemberManager(group)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  size="xs"
                  @click="confirmDeleteGroup(group)"
                />
              </div>
            </div>
          </div>

          <UButton
            block
            color="primary"
            variant="soft"
            label="Create New Group"
            icon="i-heroicons-plus"
            @click="isCreateModalOpen = true"
          />
        </div>
      </template>
    </UModal>

    <!-- Create Group Modal -->
    <UModal
      v-model:open="isCreateModalOpen"
      title="New Athlete Group"
      description="Define a name and scope for your new coaching group."
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Group Name" help="Give your group a descriptive name.">
            <UInput v-model="newGroup.name" placeholder="e.g., Marathon Squad" class="w-full" />
          </UFormField>
          <UFormField label="Description" help="Optional details about the group's purpose.">
            <UInput
              v-model="newGroup.description"
              placeholder="Short summary of this group"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Team Scope" help="If selected, other team coaches can see this group.">
            <USelect
              v-model="newGroup.teamId"
              :items="teamOptions"
              placeholder="Private (Only Me)"
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
          @click="isCreateModalOpen = false"
        />
        <UButton label="Create Group" color="primary" :loading="creating" @click="createGroup" />
      </template>
    </UModal>

    <!-- Member Manager Modal -->
    <UModal
      v-if="editingGroup"
      v-model:open="isMemberModalOpen"
      :title="`Manage ${editingGroup.name}`"
      :description="`Add or remove athletes from the ${editingGroup.name} group.`"
    >
      <template #body>
        <div class="space-y-6">
          <UFormField label="Add Athlete" help="Search and select an athlete to add to this group.">
            <div class="flex gap-2">
              <USelect
                v-model="selectedAthleteId"
                :items="availableAthleteOptions"
                placeholder="Select an athlete..."
                class="flex-1"
              />
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                :disabled="!selectedAthleteId"
                :loading="addingMember"
                @click="addMember"
              />
            </div>
          </UFormField>

          <div>
            <h4 class="text-xs font-black uppercase text-neutral-400 mb-2">Current Members</h4>
            <div v-if="loadingMembers" class="space-y-2">
              <USkeleton v-for="i in 3" :key="i" class="h-10 w-full" />
            </div>
            <div
              v-else-if="currentMembers.length === 0"
              class="text-center py-4 text-xs text-neutral-500 italic"
            >
              No athletes in this group.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="member in currentMembers"
                :key="member.athleteId"
                class="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
              >
                <div class="flex items-center gap-2">
                  <UAvatar :src="member.athlete.image" :alt="member.athlete.name" size="xs" />
                  <span class="text-sm font-medium">{{ member.athlete.name }}</span>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  size="xs"
                  @click="removeMember(member.athleteId)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    groups: any[]
    athletes: any[]
    teams: any[]
    activeGroupId: string
  }>()

  const emit = defineEmits(['update:activeGroupId', 'refresh'])

  const toast = useToast()

  const isGroupListModalOpen = ref(false)
  const isCreateModalOpen = ref(false)
  const isMemberModalOpen = ref(false)
  const creating = ref(false)
  const addingMember = ref(false)
  const loadingMembers = ref(false)

  const newGroup = ref({
    name: '',
    description: '',
    teamId: undefined
  })

  const editingGroup = ref<any>(null)
  const currentMembers = ref<any[]>([])
  const selectedAthleteId = ref('')

  const teamOptions = computed(() => {
    const options = props.teams.map((t) => ({
      label: t.team.name,
      value: t.team.id
    }))

    return [{ label: 'Private (Only Me)', value: 'private' }, ...options]
  })

  const availableAthleteOptions = computed(() => {
    return props.athletes
      .filter((a) => {
        const athleteId = a.athlete?.id || a.id
        return !currentMembers.value.some((m) => m.athleteId === athleteId)
      })
      .map((a) => {
        const athlete = a.athlete || a
        return {
          label: athlete.name || athlete.email,
          value: athlete.id
        }
      })
  })

  async function createGroup() {
    if (!newGroup.value.name) return
    creating.value = true
    try {
      const payload = {
        ...newGroup.value,
        teamId: newGroup.value.teamId === 'private' ? undefined : newGroup.value.teamId
      }
      await $fetch('/api/coaching/groups', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Group created!', color: 'success' })
      isCreateModalOpen.value = false
      newGroup.value = { name: '', description: '', teamId: undefined }
      emit('refresh')
    } catch (e) {
      toast.add({ title: 'Failed to create group', color: 'error' })
    } finally {
      creating.value = false
    }
  }

  async function openMemberManager(group: any) {
    editingGroup.value = group
    isMemberModalOpen.value = true
    loadingMembers.value = true
    try {
      const data = await $fetch(`/api/coaching/groups/${group.id}`)
      currentMembers.value = (data as any).members
    } catch (e) {
      toast.add({ title: 'Failed to load members', color: 'error' })
    } finally {
      loadingMembers.value = false
    }
  }

  async function addMember() {
    if (!selectedAthleteId.value || !editingGroup.value) return
    addingMember.value = true
    try {
      await $fetch(`/api/coaching/groups/${editingGroup.value.id}/members`, {
        method: 'POST',
        body: { athleteId: selectedAthleteId.value }
      })
      toast.add({ title: 'Athlete added to group', color: 'success' })
      selectedAthleteId.value = ''
      // Refresh members
      const data = await $fetch(`/api/coaching/groups/${editingGroup.value.id}`)
      currentMembers.value = (data as any).members
      emit('refresh')
    } catch (e) {
      toast.add({ title: 'Failed to add member', color: 'error' })
    } finally {
      addingMember.value = false
    }
  }

  async function removeMember(athleteId: string) {
    if (!editingGroup.value) return
    try {
      await $fetch(`/api/coaching/groups/${editingGroup.value.id}/members/${athleteId}`, {
        method: 'DELETE'
      })
      currentMembers.value = currentMembers.value.filter((m) => m.athleteId !== athleteId)
      toast.add({ title: 'Athlete removed from group', color: 'success' })
      emit('refresh')
    } catch (e) {
      toast.add({ title: 'Failed to remove member', color: 'error' })
    }
  }

  async function confirmDeleteGroup(group: any) {
    if (!confirm(`Are you sure you want to delete the group "${group.name}"?`)) return
    try {
      await ($fetch as any)(`/api/coaching/groups/${group.id}`, { method: 'DELETE' })
      toast.add({ title: 'Group deleted', color: 'success' })
      emit('refresh')
    } catch (e) {
      toast.add({ title: 'Failed to delete group', color: 'error' })
    }
  }
</script>
