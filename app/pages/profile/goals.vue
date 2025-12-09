<script setup lang="ts">
import GoalWizard from '~/components/goals/GoalWizard.vue'
import GoalCard from '~/components/goals/GoalCard.vue'

definePageMeta({
  middleware: 'auth'
})

const showWizard = ref(false)
const editingGoal = ref<any>(null)
const showDeleteModal = ref(false)
const goalToDelete = ref<string | null>(null)
const toast = useToast()

const { data, pending: loading, refresh } = await useFetch('/api/goals')

const goals = computed(() => data.value?.goals || [])

function handleEdit(goal: any) {
  editingGoal.value = goal
  showWizard.value = true
}

function closeWizard() {
  showWizard.value = false
  editingGoal.value = null
}

async function refreshGoals() {
  await refresh()
}

function deleteGoal(id: string) {
  goalToDelete.value = id
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!goalToDelete.value) return
  
  try {
    await $fetch(`/api/goals/${goalToDelete.value}`, {
      method: 'DELETE'
    })
    refreshGoals()
    toast.add({
      title: 'Goal Deleted',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete goal',
      color: 'error'
    })
  } finally {
    showDeleteModal.value = false
    goalToDelete.value = null
  }
}
</script>

<template>
  <UDashboardPanel id="goals">
    <template #header>
      <UDashboardNavbar title="Goals">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="!showWizard"
            color="primary"
            size="sm"
            icon="i-heroicons-plus"
            @click="showWizard = true"
          >
            Add Goal
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Page Header -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
          <p class="text-sm text-muted mt-1">
            Set and track your fitness goals to stay motivated and measure progress
          </p>
        </div>
        
        <div class="max-w-6xl mx-auto space-y-6">
          
          <div v-if="showWizard">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">{{ editingGoal ? 'Edit Goal' : 'Create New Goal' }}</h3>
                  <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="closeWizard" />
                </div>
              </template>
              <GoalWizard
                :goal="editingGoal"
                @close="closeWizard"
                @created="refreshGoals"
                @updated="refreshGoals"
              />
            </UCard>
          </div>
          
          <div v-if="loading" class="space-y-4">
            <USkeleton class="h-32 w-full" v-for="i in 2" :key="i" />
          </div>
          
          <div v-else-if="goals.length === 0 && !showWizard" class="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <UIcon name="i-heroicons-trophy" class="w-8 h-8 text-primary" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">No goals set</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md mx-auto">
              Set your first goal to get personalized AI coaching advice and track your progress.
            </p>
            <UButton color="primary" size="lg" @click="showWizard = true" icon="i-heroicons-plus">
              Create First Goal
            </UButton>
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GoalCard
              v-for="goal in goals"
              :key="goal.id"
              :goal="goal"
              @edit="handleEdit"
              @delete="deleteGoal"
            />
          </div>
          
          <!-- Delete Confirmation Modal -->
          <UModal
            v-model:open="showDeleteModal"
            title="Delete Goal?"
            description="Are you sure you want to delete this goal? This action cannot be undone."
            :ui="{ footer: 'justify-end' }"
          >
            <template #footer="{ close }">
              <UButton
                label="Cancel"
                variant="outline"
                color="neutral"
                @click="close"
              />
              <UButton
                label="Delete Goal"
                color="error"
                @click="confirmDelete"
              />
            </template>
          </UModal>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>