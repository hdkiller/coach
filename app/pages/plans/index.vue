<template>
  <UDashboardPanel id="my-plans">
    <template #header>
      <UDashboardNavbar title="My Plans" />
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-4 sm:space-y-6">
        <!-- Page Header -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Plans
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Strategy Repository & Training History
          </p>
        </div>

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
            <UCard
              v-for="plan in templates"
              :key="plan.id"
              class="relative group hover:border-primary/50 transition-colors cursor-pointer"
              @click="viewPlan(plan.id)"
            >
              <template #header>
                <div class="flex justify-between items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">{{ plan.name || 'Untitled Template' }}</div>
                    <div
                      v-if="plan.goal?.title"
                      class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate"
                    >
                      {{ plan.goal.title }}
                    </div>
                  </div>
                  <UBadge color="neutral" variant="soft" size="xs" class="shrink-0">{{
                    plan.strategy
                  }}</UBadge>
                </div>
              </template>

              <div class="space-y-3">
                <p class="text-sm text-muted line-clamp-2 min-h-[2.5rem]">
                  {{ plan.description || 'No description provided.' }}
                </p>

                <!-- Plan Stats -->
                <div
                  class="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <div v-if="plan._count?.blocks" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-cube-transparent" class="w-3.5 h-3.5" />
                    <span
                      >{{ plan._count.blocks }}
                      {{ plan._count.blocks === 1 ? 'Block' : 'Blocks' }}</span
                    >
                  </div>
                  <div v-if="getTotalWeeks(plan)" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-calendar-days" class="w-3.5 h-3.5" />
                    <span
                      >{{ getTotalWeeks(plan) }}
                      {{ getTotalWeeks(plan) === 1 ? 'Week' : 'Weeks' }}</span
                    >
                  </div>
                  <div class="flex items-center gap-1">
                    <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                    <span>{{ formatDate(plan.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex justify-end gap-2">
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    :loading="deletingId === plan.id"
                    @click.stop="deleteTemplate(plan.id)"
                  />
                  <UButton
                    size="xs"
                    color="primary"
                    variant="ghost"
                    icon="i-heroicons-play"
                    :loading="loadingId === plan.id"
                    @click.stop="useTemplate(plan)"
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
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 text-gray-500" />
              Plan History
            </h3>
            <div
              v-if="history.length > 3 && !showAllHistory"
              class="text-sm text-gray-500 dark:text-gray-400"
            >
              Showing {{ Math.min(3, history.length) }} of {{ history.length }}
            </div>
          </div>
          <div v-if="history.length === 0" class="text-muted text-sm italic">
            No plan history found.
          </div>
          <div v-else class="space-y-3">
            <UCard
              v-for="plan in paginatedHistory"
              :key="plan.id"
              class="cursor-pointer hover:border-primary/50 transition-colors"
              @click="viewPlan(plan.id)"
            >
              <div class="flex items-center justify-between p-3 sm:p-4">
                <div>
                  <div class="font-semibold">{{ plan.goal?.title || 'Unnamed Plan' }}</div>
                  <div class="text-xs text-muted mt-1">
                    Created {{ new Date(plan.createdAt).toLocaleDateString() }} •
                    <span :class="getStatusColor(plan.status)">{{ plan.status }}</span>
                  </div>
                </div>
                <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
              </div>
            </UCard>

            <!-- Show More / Pagination -->
            <div v-if="history.length > 3" class="flex justify-center pt-2">
              <UButton
                v-if="!showAllHistory"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showAllHistory = true"
              >
                Show All ({{ history.length }})
              </UButton>
              <div v-else class="flex items-center gap-2">
                <UButton
                  :disabled="currentHistoryPage === 1"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-chevron-left"
                  @click="previousPage"
                />
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  Page {{ currentHistoryPage }} of {{ totalHistoryPages }}
                </span>
                <UButton
                  :disabled="currentHistoryPage === totalHistoryPages"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-chevron-right"
                  @click="nextPage"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Use Template Modal -->
  <UModal
    v-model:open="isModalOpen"
    title="Use Template"
    description="When do you want to start this training plan?"
  >
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

  <!-- Plan Detail Modal -->
  <PlanOverviewModal
    v-model:open="isPlanDetailOpen"
    :plan="selectedPlanDetail"
    :loading="loadingPlanDetail"
  >
    <template #footer-actions>
      <div class="flex justify-between items-center w-full">
        <UButton
          v-if="selectedPlanDetail?.isTemplate"
          label="Use Template"
          color="primary"
          icon="i-heroicons-play"
          @click="useTemplateFromDetail"
        />
        <UButton label="Close" color="neutral" variant="ghost" @click="isPlanDetailOpen = false" />
      </div>
    </template>
  </PlanOverviewModal>

  <!-- Delete Template Confirmation Modal -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Delete Template"
    description="Are you sure you want to permanently delete this template?"
  >
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">
          Cancel
        </UButton>
        <UButton color="error" :loading="deletingId !== null" @click="executeDeleteTemplate">
          Delete
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import PlanOverviewModal from '~/components/plans/PlanOverviewModal.vue'

  const {
    formatDate: baseFormatDate,
    formatDateUTC,
    formatShortDate,
    getUserLocalDate
  } = useFormat()

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'My Plans'
  })

  const { data: plans, refresh } = await useFetch<any[]>('/api/plans')
  const toast = useToast()

  const templates = computed(() => plans.value?.filter((p) => p.isTemplate) || [])
  const history = computed(() => plans.value?.filter((p) => !p.isTemplate) || [])

  const loadingId = ref<string | null>(null)
  const deletingId = ref<string | null>(null)
  const isModalOpen = ref(false)
  const isDeleteModalOpen = ref(false)
  const templateToDeleteId = ref<string | null>(null)
  const selectedTemplate = ref<any>(null)
  const startDate = ref(getUserLocalDate().toISOString().split('T')[0])
  const activating = ref(false)

  // Plan detail modal state
  const isPlanDetailOpen = ref(false)
  const selectedPlanDetail = ref<any>(null)
  const loadingPlanDetail = ref(false)

  // Pagination state for history
  const showAllHistory = ref(false)
  const currentHistoryPage = ref(1)
  const itemsPerPage = 10

  const paginatedHistory = computed(() => {
    if (!showAllHistory.value) {
      // Show only first 3 items by default
      return history.value.slice(0, 3)
    }

    // Show paginated items when "Show All" is clicked
    const start = (currentHistoryPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return history.value.slice(start, end)
  })

  const totalHistoryPages = computed(() => {
    return Math.ceil(history.value.length / itemsPerPage)
  })

  function nextPage() {
    if (currentHistoryPage.value < totalHistoryPages.value) {
      currentHistoryPage.value++
    }
  }

  function previousPage() {
    if (currentHistoryPage.value > 1) {
      currentHistoryPage.value--
    }
  }

  async function viewPlan(planId: string) {
    isPlanDetailOpen.value = true
    loadingPlanDetail.value = true
    selectedPlanDetail.value = null

    try {
      const data = await $fetch(`/api/plans/${planId}`)
      selectedPlanDetail.value = data
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || error.message || 'Failed to load plan details',
        color: 'error'
      })
      isPlanDetailOpen.value = false
    } finally {
      loadingPlanDetail.value = false
    }
  }

  function useTemplate(plan: any) {
    selectedTemplate.value = plan
    isModalOpen.value = true
  }

  function useTemplateFromDetail() {
    if (selectedPlanDetail.value) {
      isPlanDetailOpen.value = false
      useTemplate(selectedPlanDetail.value)
    }
  }

  function deleteTemplate(id: string) {
    templateToDeleteId.value = id
    isDeleteModalOpen.value = true
  }

  async function executeDeleteTemplate() {
    if (!templateToDeleteId.value) return

    deletingId.value = templateToDeleteId.value
    try {
      await $fetch(`/api/plans/${templateToDeleteId.value}`, {
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
      templateToDeleteId.value = null
      isDeleteModalOpen.value = false
    }
  }

  async function confirmUse() {
    if (!selectedTemplate.value) return

    activating.value = true
    try {
      const response = await $fetch<{ planId?: string }>(
        `/api/plans/${selectedTemplate.value.id}/activate`,
        {
          method: 'POST',
          body: {
            startDate: new Date(startDate.value + 'T00:00:00').toISOString()
          }
        }
      )

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

  function getTotalWeeks(plan: any) {
    if (!plan.blocks || plan.blocks.length === 0) return 0
    return plan.blocks.reduce((total: number, block: any) => {
      return total + (block._count?.weeks || 0)
    }, 0)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-500'
      case 'ABANDONED':
        return 'text-red-500'
      case 'ARCHIVED':
        return 'text-gray-500'
      default:
        return 'text-gray-500'
    }
  }

  function formatDate(d: string | Date) {
    if (!d) return ''
    return baseFormatDate(d)
  }
</script>
