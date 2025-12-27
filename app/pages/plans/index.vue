<template>
  <UDashboardPanel id="my-plans">
    <template #header>
      <UDashboardNavbar title="My Plans" />
    </template>

    <template #body>
      <div class="p-6 space-y-8">
        <!-- Templates Section -->
        <div>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-bookmark" class="w-5 h-5 text-primary" />
            Templates
          </h3>
          <div v-if="templates.length === 0" class="text-muted text-sm italic">
            No templates saved yet. Save a plan as a template to reuse it later.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UCard v-for="plan in templates" :key="plan.id" class="relative group hover:border-primary/50 transition-colors">
              <template #header>
                <div class="flex justify-between items-start">
                  <div class="font-bold truncate pr-4">{{ plan.name || 'Untitled Template' }}</div>
                  <UBadge color="neutral" variant="soft" size="xs">{{ plan.strategy }}</UBadge>
                </div>
              </template>
              
              <p class="text-sm text-muted line-clamp-3 h-10 mb-4">
                {{ plan.description || 'No description provided.' }}
              </p>
              
              <template #footer>
                <div class="flex justify-end gap-2">
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    :loading="deletingId === plan.id"
                    @click="deleteTemplate(plan.id)"
                  />
                  <UButton
                    size="xs"
                    color="primary"
                    variant="ghost"
                    icon="i-heroicons-play"
                    :loading="loadingId === plan.id"
                    @click="useTemplate(plan)"
                  >
                    Use
                  </UButton>
                </div>
              </template>
            </UCard>
          </div>
        </div>

        <USeparator />

        <!-- Past Plans Section -->
        <div>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-gray-500" />
            Plan History
          </h3>
          <div v-if="history.length === 0" class="text-muted text-sm italic">
            No plan history found.
          </div>
          <div v-else class="space-y-3">
            <UCard v-for="plan in history" :key="plan.id">
              <div class="flex items-center justify-between p-3 sm:p-4">
                <div>
                  <div class="font-semibold">{{ plan.goal?.title || 'Unnamed Plan' }}</div>
                  <div class="text-xs text-muted mt-1">
                    Created {{ new Date(plan.createdAt).toLocaleDateString() }} • 
                    <span :class="getStatusColor(plan.status)">{{ plan.status }}</span>
                  </div>
                </div>
                <!-- Actions could go here, like 'View' or 'Delete' -->
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="isModalOpen" title="Use Template" description="When do you want to start this training plan?">
    <template #body>
      <UFormField label="Start Date">
        <UInput v-model="startDate" type="date" />
      </UFormField>
    </template>

    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="isModalOpen = false" />
      <UButton label="Start Plan" color="primary" :loading="activating" @click="confirmUse" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { data: plans, refresh } = await useFetch<any[]>('/api/plans')
const toast = useToast()

const templates = computed(() => plans.value?.filter(p => p.isTemplate) || [])
const history = computed(() => plans.value?.filter(p => !p.isTemplate) || [])

const loadingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const isModalOpen = ref(false)
const selectedTemplate = ref<any>(null)
const startDate = ref(new Date().toISOString().split('T')[0])
const activating = ref(false)

function useTemplate(plan: any) {
  selectedTemplate.value = plan
  isModalOpen.value = true
}

async function deleteTemplate(id: string) {
  if (!confirm('Are you sure you want to permanently delete this template?')) return
  
  deletingId.value = id
  try {
    await $fetch(`/api/plans/${id}`, {
      method: 'DELETE'
    })
    
    toast.add({
      title: 'Success',
      description: 'Template deleted successfully.',
      color: 'success'
    })
    
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || error.message || 'Failed to delete template',
      color: 'error'
    })
  } finally {
    deletingId.value = null
  }
}

async function confirmUse() {
  if (!selectedTemplate.value) return
  
  activating.value = true
  try {
    const response = await $fetch<{ planId?: string }>(`/api/plans/${selectedTemplate.value.id}/activate`, {
      method: 'POST',
      body: {
        startDate: startDate.value
      }
    })
    
    toast.add({
      title: 'Success',
      description: 'Training plan activated successfully.',
      color: 'success'
    })
    
    isModalOpen.value = false
    await refresh()
    
    // Redirect to the active plan page
    navigateTo('/plan')
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || error.message || 'Failed to start plan',
      color: 'error'
    })
  } finally {
    activating.value = false
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED': return 'text-green-500'
    case 'ABANDONED': return 'text-red-500'
    case 'ARCHIVED': return 'text-gray-500'
    default: return 'text-gray-500'
  }
}
</script>
