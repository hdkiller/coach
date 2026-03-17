<template>
  <UDashboardPanel id="workout-library">
    <template #header>
      <UDashboardNavbar title="Workout Library">
        <template #right>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            label="New Workout"
            @click="createNewTemplate"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tight">Workout Library</h1>
            <p class="text-xs font-bold text-muted uppercase tracking-[0.2em] mt-1 italic">
              Your Repository of Reusable Structured Sessions
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search library..."
              class="w-full md:w-64"
            />
          </div>
        </div>

        <div
          v-if="loading && !templates?.length"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <UCard v-for="i in 6" :key="i" class="min-h-[200px]">
            <USkeleton class="h-4 w-3/4 mb-4" />
            <USkeleton class="h-20 w-full mb-4" />
            <div class="flex justify-between">
              <USkeleton class="h-4 w-20" />
              <USkeleton class="h-4 w-20" />
            </div>
          </UCard>
        </div>

        <div
          v-else-if="filteredTemplates.length === 0"
          class="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
        >
          <UIcon name="i-heroicons-bookmark-slash" class="w-12 h-12 text-gray-300 mb-4" />
          <h3 class="text-lg font-bold">Your library is empty</h3>
          <p class="text-sm text-muted max-w-xs mx-auto mb-6">
            Save any workout from your calendar or create a new session to start building your
            library.
          </p>
          <UButton color="primary" variant="soft" @click="createNewTemplate"
            >Create First Template</UButton
          >
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UCard
            v-for="template in filteredTemplates"
            :key="template.id"
            class="group hover:border-primary/50 transition-all cursor-pointer"
            @click="editTemplate(template)"
          >
            <template #header>
              <div class="flex justify-between items-start">
                <div class="min-w-0">
                  <div class="font-bold truncate">{{ template.title }}</div>
                  <div class="text-[10px] text-muted uppercase font-bold">
                    {{ template.type }} • {{ template.category || 'Uncategorized' }}
                  </div>
                </div>
                <div class="flex gap-1">
                  <UIcon :name="getWorkoutIcon(template.type)" class="w-5 h-5 text-primary" />
                </div>
              </div>
            </template>

            <div class="space-y-3">
              <div
                v-if="template.structuredWorkout"
                class="h-16 w-full opacity-80 group-hover:opacity-100 transition-opacity"
              >
                <MiniWorkoutChart :workout="template" />
              </div>
              <div
                v-else
                class="h-16 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded italic text-[10px] text-muted"
              >
                No structure defined
              </div>

              <div
                class="flex justify-between text-xs text-muted border-t border-gray-100 dark:border-gray-800 pt-2"
              >
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                  {{ Math.round(template.durationSec / 60) }}m
                </div>
                <div v-if="template.tss" class="flex items-center gap-1 text-amber-500">
                  <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5" />
                  {{ Math.round(template.tss) }} TSS
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                  {{ template.usageCount || 0 }} uses
                </div>
              </div>
            </div>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click.stop="confirmDelete(template)"
                />
                <UButton
                  size="xs"
                  color="primary"
                  variant="soft"
                  label="Use Session"
                  icon="i-heroicons-calendar-plus"
                  @click.stop="useTemplate(template)"
                />
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Editor Modal -->
  <UModal
    v-model:open="isEditorOpen"
    :title="editingTemplate?.id ? 'Edit Workout Template' : 'New Workout Template'"
    description="Define your reusable workout structure here."
  >
    <template #body>
      <div class="p-6">
        <WorkoutTemplateEditor
          :template="editingTemplate"
          @save="onTemplateSaved"
          @cancel="isEditorOpen = false"
        />
      </div>
    </template>
  </UModal>

  <!-- Delete Confirmation -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Delete Template"
    description="Are you sure you want to delete this workout template? This cannot be undone."
  >
    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">Cancel</UButton>
        <UButton color="error" :loading="deleting" @click="deleteTemplate">Delete Template</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import WorkoutTemplateEditor from '~/components/workouts/WorkoutTemplateEditor.vue'
  import { getWorkoutIcon } from '~/utils/activity-types'

  const { data: templates, refresh, status } = await useFetch<any[]>('/api/library/workouts')
  const loading = computed(() => status.value === 'pending')
  const searchQuery = ref('')
  const toast = useToast()

  const isEditorOpen = ref(false)
  const isDeleteModalOpen = ref(false)
  const editingTemplate = ref<any>(null)
  const deleting = ref(false)

  const filteredTemplates = computed(() => {
    if (!templates.value) return []
    if (!searchQuery.value) return templates.value

    const query = searchQuery.value.toLowerCase()
    return templates.value.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query)
    )
  })

  function createNewTemplate() {
    editingTemplate.value = null
    isEditorOpen.value = true
  }

  function editTemplate(template: any) {
    editingTemplate.value = template
    isEditorOpen.value = true
  }

  function onTemplateSaved() {
    isEditorOpen.value = false
    refresh()
  }

  function useTemplate(template: any) {
    toast.add({ title: 'Schedule to calendar coming soon', color: 'info' })
  }

  function confirmDelete(template: any) {
    editingTemplate.value = template
    isDeleteModalOpen.value = true
  }

  async function deleteTemplate() {
    if (!editingTemplate.value) return

    deleting.value = true
    try {
      await $fetch(`/api/library/workouts/${editingTemplate.value.id}`, {
        method: 'DELETE'
      })
      toast.add({ title: 'Template deleted', color: 'success' })
      isDeleteModalOpen.value = false
      refresh()
    } catch (error: any) {
      toast.add({ title: 'Delete failed', color: 'error' })
    } finally {
      deleting.value = false
    }
  }
</script>
