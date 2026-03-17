<template>
  <UDashboardPanel id="plan-library">
    <template #header>
      <UDashboardNavbar title="Plans">
        <template #right>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            label="Create Plan Template"
            :loading="isCreating"
            @click="createNewPlanTemplate"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6">
        <div>
          <h1 class="text-3xl font-black uppercase tracking-tight">Plans</h1>
          <p class="text-xs font-bold text-muted uppercase tracking-[0.2em] mt-1 italic">
            Architectural Blueprint for Your Season
          </p>
        </div>

        <!-- Catalog View -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Existing Templates (Fetched from API) -->
          <UCard
            v-for="plan in templates"
            :key="plan.id"
            class="group hover:border-primary/50 transition-all cursor-pointer"
            @click="editPlan(plan.id)"
          >
            <template #header>
              <div class="flex justify-between items-start">
                <div class="min-w-0">
                  <div class="font-bold truncate">{{ plan.name || 'Untitled Plan' }}</div>
                  <div class="text-[10px] text-muted uppercase font-bold">{{ plan.strategy }}</div>
                </div>
                <UBadge v-if="plan.isPublic" color="success" variant="soft" size="xs"
                  >Public</UBadge
                >
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-xs text-muted line-clamp-2 min-h-[2.5rem]">
                {{ plan.description || 'No description provided.' }}
              </p>

              <div
                class="flex justify-between items-center text-xs border-t border-gray-100 dark:border-gray-800 pt-3"
              >
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-primary" />
                  {{ getTotalWeeks(plan) }} Weeks
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-amber-500" />
                  {{ plan.difficulty || 5 }}/10
                </div>
              </div>
            </div>

            <template #footer>
              <div class="flex justify-between items-center w-full">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-share"
                  label="Share"
                  @click.stop="sharePlan(plan)"
                />
                <UButton
                  size="xs"
                  color="primary"
                  variant="solid"
                  label="Edit Structure"
                  icon="i-heroicons-pencil-square"
                  @click.stop="editStructure(plan.id)"
                />
              </div>
            </template>
          </UCard>

          <!-- Empty State -->
          <div
            v-if="templates.length === 0"
            class="col-span-full text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
          >
            <UIcon name="i-heroicons-document-duplicate" class="w-12 h-12 text-gray-300 mb-4" />
            <h3 class="text-lg font-bold">No plan templates yet</h3>
            <p class="text-sm text-muted max-w-xs mx-auto mb-6">
              Start by saving an active plan as a template, or create a new one from scratch.
            </p>
            <UButton color="primary" @click="createNewPlanTemplate">Create Plan Template</UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  const { data: plans } = await useFetch<any[]>('/api/plans')
  const templates = computed(() => plans.value?.filter((p) => p.isTemplate) || [])
  const toast = useToast()

  const isCreating = ref(false)

  async function createNewPlanTemplate() {
    isCreating.value = true
    try {
      const newPlan: any = await $fetch('/api/library/plans', {
        method: 'POST',
        body: {
          name: 'New Training Blueprint',
          description: 'A professional-grade training progression.'
        }
      })

      toast.add({ title: 'Blueprint created', color: 'success' })
      navigateTo(`/library/plans/${newPlan.id}/architect`)
    } catch (error: any) {
      toast.add({ title: 'Creation failed', color: 'error' })
    } finally {
      isCreating.value = false
    }
  }

  function editPlan(id: string) {
    // navigateTo(`/library/plans/${id}/edit`)
    toast.add({ title: 'Plan Metadata Editor coming soon', color: 'info' })
  }

  function editStructure(id: string) {
    navigateTo(`/library/plans/${id}/architect`)
  }

  function sharePlan(plan: any) {
    toast.add({ title: 'Public sharing coming soon', color: 'info' })
  }

  function getTotalWeeks(plan: any) {
    if (!plan.blocks) return 0
    return plan.blocks.reduce(
      (acc: number, b: any) => acc + (b._count?.weeks || b.durationWeeks || 0),
      0
    )
  }
</script>
