<template>
  <UModal
    v-model:open="isOpen"
    title="Share Plan"
    description="Manage who can see and use this training blueprint."
  >
    <template #body>
      <div class="space-y-6 p-4">
        <UFormField label="Visibility">
          <USelectMenu v-model="visibility" value-key="value" :items="visibilityOptions" />
        </UFormField>

        <UFormField
          v-if="visibility === 'TEAM'"
          label="Select Team"
          hint="The plan will be visible to all coaches and athletes in this team."
        >
          <USelectMenu
            v-model="teamId"
            value-key="id"
            :items="teams"
            :loading="loadingTeams"
            placeholder="Choose a team..."
          />
        </UFormField>

        <UAlert
          v-if="visibility === 'PUBLIC'"
          color="info"
          variant="soft"
          icon="i-heroicons-globe-alt"
          title="Public Store"
          description="Public plans are listed in the marketplace. You can configure full public details in the Plan Architect."
        />

        <UAlert
          v-if="visibility === 'PRIVATE'"
          color="neutral"
          variant="soft"
          icon="i-heroicons-lock-closed"
          title="Private"
          description="Only you (and your coach if assigned) can see this plan."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
        <UButton
          color="primary"
          :loading="saving"
          :disabled="visibility === 'TEAM' && !teamId"
          @click="save"
        >
          Save Changes
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  const props = defineProps<{
    plan: any
  }>()

  const emit = defineEmits<{
    updated: []
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })
  const visibility = ref(props.plan?.visibility || 'PRIVATE')
  const teamId = ref(props.plan?.teamId || null)
  const saving = ref(false)
  const teams = ref<any[]>([])
  const loadingTeams = ref(false)

  const visibilityOptions = [
    { label: 'Private (Only me)', value: 'PRIVATE' },
    { label: 'Team (Shared with specific team)', value: 'TEAM' },
    { label: 'Public (Marketplace)', value: 'PUBLIC' }
  ]

  async function fetchTeams() {
    loadingTeams.value = true
    try {
      const data: any = await $fetch('/api/coaching/teams')
      teams.value = data.map((t: any) => ({
        id: t.id,
        label: t.name
      }))
    } catch (e) {
      console.error('Failed to fetch teams', e)
    } finally {
      loadingTeams.value = false
    }
  }

  async function save() {
    saving.value = true
    try {
      await $fetch(`/api/library/plans/${props.plan.id}/publication`, {
        method: 'PATCH',
        body: {
          visibility: visibility.value,
          teamId: visibility.value === 'TEAM' ? teamId.value : null
        }
      })
      emit('updated')
      isOpen.value = false
    } catch (error: any) {
      useToast().add({
        title: 'Save failed',
        description: error.data?.message || 'Could not update visibility.',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }

  watch(isOpen, (val) => {
    if (val) {
      visibility.value = props.plan?.visibility || 'PRIVATE'
      teamId.value = props.plan?.teamId || null
      void fetchTeams()
    }
  })
</script>
