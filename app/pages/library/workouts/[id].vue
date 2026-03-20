<template>
  <UDashboardPanel id="workout-template-details">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <span class="hidden sm:inline">{{ template?.title || 'Workout Template' }}</span>
        </template>
        <template #leading>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            class="hidden sm:flex"
            @click="goBack"
          >
            Back
          </UButton>
        </template>
        <template #right>
          <TriggerMonitorButton />

          <UButton
            v-if="template"
            color="neutral"
            variant="outline"
            size="sm"
            class="font-bold"
            icon="i-heroicons-pencil-square"
            @click="isEditorOpen = true"
          >
            Edit details
          </UButton>

          <UButton
            v-if="template"
            icon="i-heroicons-chat-bubble-left-right"
            color="primary"
            variant="solid"
            size="sm"
            class="font-bold"
            @click="chatAboutWorkout"
          >
            <span class="hidden sm:inline">Chat</span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-5xl mx-auto w-full p-0 sm:p-6 space-y-4 sm:space-y-8 pb-24">
        <!-- Loading State -->
        <div v-if="loading" class="space-y-6">
          <UCard :ui="{ root: 'rounded-3xl shadow-none' }">
            <div class="flex items-center justify-between mb-4">
              <div class="space-y-2">
                <USkeleton class="h-8 w-64" />
                <USkeleton class="h-4 w-48" />
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <USkeleton v-for="i in 4" :key="i" class="h-16 w-full rounded-lg" />
            </div>
          </UCard>
          <USkeleton class="h-64 w-full rounded-3xl" />
        </div>

        <!-- Template Content -->
        <template v-else-if="template">
          <WorkoutTemplatePreview
            :template="template"
            :user-ftp="userFtp"
            :loading="loading"
            :generating="generating"
            :allow-edit="true"
            @save="handleSaveStructure"
            @regenerate="generateStructure"
            @view="openViewModal"
          />

          <!-- Execution Plan Extension (if structure is missing, the preview component shows a placeholder, but we still want the button on full page) -->
          <div v-if="!template.structuredWorkout" class="flex justify-center">
            <UButton
              size="sm"
              color="primary"
              variant="solid"
              class="font-black uppercase tracking-widest text-[10px]"
              :loading="generating"
              :disabled="generating"
              @click="generateStructure"
            >
              {{ generating ? 'Generating...' : 'Build Structure with AI' }}
            </UButton>
          </div>
        </template>

        <!-- Error State -->
        <div v-else class="text-center py-20">
          <UIcon
            name="i-heroicons-exclamation-circle"
            class="w-16 h-16 text-red-500 mx-auto mb-4"
          />
          <h3 class="text-xl font-semibold mb-2">Workout Template Not Found</h3>
          <UButton color="primary" @click="goBack">Go Back</UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Editor Modal -->
  <UModal v-model:open="isEditorOpen" title="Edit Workout Template">
    <template #body>
      <div class="p-6">
        <WorkoutTemplateEditor
          :template="template"
          :owner-scope="template?.ownerScope"
          @save="onTemplateSaved"
          @cancel="isEditorOpen = false"
        />
      </div>
    </template>
  </UModal>

  <!-- Technical View Modal -->
  <WorkoutTechnicalViewModal
    v-if="showViewModal"
    :workout="template"
    @update:open="showViewModal = $event"
  />

  <WorkoutTemplatePreviewModal
    v-if="template"
    v-model:template-id="previewTemplateId"
    :template-owner-scope="template?.ownerScope"
  />
</template>

<script setup lang="ts">
  import WorkoutTemplateEditor from '~/components/workouts/WorkoutTemplateEditor.vue'
  import WorkoutTemplatePreview from '~/components/workouts/WorkoutTemplatePreview.vue'
  import WorkoutTemplatePreviewModal from '~/components/workouts/WorkoutTemplatePreviewModal.vue'
  import WorkoutTechnicalViewModal from '~/components/workouts/WorkoutTechnicalViewModal.vue'
  import RideView from '~/components/workouts/planned/RideView.vue'
  import RunView from '~/components/workouts/planned/RunView.vue'
  import SwimView from '~/components/workouts/planned/SwimView.vue'
  import StrengthView from '~/components/workouts/planned/StrengthView.vue'
  import TriggerMonitorButton from '~/components/dashboard/TriggerMonitorButton.vue'

  definePageMeta({
    middleware: 'auth'
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const loading = ref(true)
  const template = ref<any>(null)
  const userFtp = ref<number | undefined>(undefined)
  const userLthr = ref<number | undefined>(undefined)
  const generating = ref(false)
  const isEditorOpen = ref(false)
  const activeStepsTab = ref<'view' | 'edit'>('view')
  const isPreviewModalOpen = ref(false)

  // Technical View state
  const showViewModal = ref(false)

  const previewTemplateId = computed({
    get: () => (isPreviewModalOpen.value ? template.value?.id : null),
    set: (val) => {
      isPreviewModalOpen.value = !!val
    }
  })

  const { onTaskCompleted } = useUserRunsState()
  const { runs } = useUserRuns()

  async function fetchTemplate() {
    loading.value = true
    try {
      const data: any = await $fetch(`/api/library/workouts/${route.params.id}`, {
        query: {
          scope: route.query.scope
        }
      })
      template.value = data.template
      userFtp.value = data.userFtp
      userLthr.value = data.userLthr
    } catch (error) {
      console.error('Failed to fetch template', error)
    } finally {
      loading.value = false
    }
  }

  function goBack() {
    router.back()
  }

  function formatDuration(seconds: number | null | undefined) {
    if (!seconds) return '0m'
    const mins = Math.floor(seconds / 60)
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    return `${mins}m`
  }

  function getWorkoutComponent(type: string) {
    switch (type) {
      case 'Ride':
      case 'VirtualRide':
        return RideView
      case 'Run':
        return RunView
      case 'Swim':
        return SwimView
      case 'Gym':
      case 'WeightTraining':
        return StrengthView
      default:
        return RideView
    }
  }

  async function generateStructure() {
    generating.value = true
    try {
      await $fetch(`/api/library/workouts/${route.params.id}/generate-structure`, {
        method: 'POST',
        query: {
          scope: template.value?.ownerScope || route.query.scope
        }
      })
      toast.add({
        title: 'Generation Started',
        description: 'AI is building the workout structure.',
        color: 'success'
      })
    } catch (error: any) {
      generating.value = false
      toast.add({
        title: 'Generation Failed',
        description: error.data?.message || 'Failed to trigger generation',
        color: 'error'
      })
    }
  }

  async function handleSaveStructure(steps: any[]) {
    try {
      await $fetch(`/api/library/workouts/${route.params.id}`, {
        method: 'PATCH',
        query: {
          scope: template.value?.ownerScope || route.query.scope
        },
        body: { structuredWorkout: { ...template.value.structuredWorkout, steps } }
      })
      toast.add({ title: 'Structure Updated', color: 'success' })
      await fetchTemplate()
      activeStepsTab.value = 'view'
    } catch (error: any) {
      toast.add({ title: 'Update Failed', color: 'error' })
    }
  }

  function onTemplateSaved() {
    isEditorOpen.value = false
    fetchTemplate()
  }

  const activeStructureRun = computed(() => {
    const id = route.params.id as string
    return runs.value.find(
      (run) =>
        run.taskIdentifier === 'generate-structured-workout' &&
        Array.isArray(run.tags) &&
        run.tags.includes(`workout-template:${id}`)
    )
  })

  const structureJobStatusLabel = computed(() => {
    if (!activeStructureRun.value) return null
    return 'Structure generation running...'
  })

  onTaskCompleted('generate-structured-workout', async (run) => {
    if (Array.isArray(run.tags) && run.tags.includes(`workout-template:${route.params.id}`)) {
      await fetchTemplate()
      generating.value = false
      toast.add({
        title: 'Structure Ready',
        description: 'AI has finished generating the structure.',
        color: 'success'
      })
    }
  })

  function openViewModal() {
    showViewModal.value = true
  }

  function chatAboutWorkout() {
    navigateTo({
      path: '/chat',
      query: { workoutId: template.value.id, isTemplate: 'true' }
    })
  }

  onMounted(fetchTemplate)
</script>
