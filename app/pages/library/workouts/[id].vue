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
        <div v-if="loading" class="p-4 sm:p-0 space-y-6">
          <UCard :ui="{ root: 'rounded-none sm:rounded-xl shadow-none sm:shadow' }">
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
          <USkeleton class="h-64 w-full rounded-xl" />
        </div>

        <!-- Template Content -->
        <div v-else-if="template" class="space-y-4 sm:space-y-8">
          <!-- Header Card -->
          <div
            class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-4 sm:p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
          >
            <div class="mb-6">
              <h1 class="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                {{ template.title }}
              </h1>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <UBadge
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[10px]"
                >
                  {{ template.type }}
                </UBadge>
                <UBadge
                  v-if="template.category"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[10px]"
                >
                  {{ template.category }}
                </UBadge>
                <UBadge
                  v-if="structureJobStatusLabel"
                  color="primary"
                  variant="soft"
                  size="sm"
                  class="font-black uppercase tracking-widest text-[10px]"
                >
                  {{ structureJobStatusLabel }}
                </UBadge>
              </div>
            </div>

            <div
              v-if="template.description"
              class="mb-6 p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800"
            >
              <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {{ template.description }}
              </p>
            </div>
          </div>

          <!-- KPI Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-4">
            <div
              class="bg-white dark:bg-gray-900 p-5 rounded-none sm:rounded-xl border-x-0 sm:border-x border-y sm:border-y border-gray-100 dark:border-gray-800 shadow-none sm:shadow-sm overflow-hidden relative"
            >
              <div class="flex items-center gap-2 mb-4">
                <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary-500" />
                <span class="text-[10px] font-black uppercase text-gray-500 tracking-widest"
                  >Duration</span
                >
              </div>
              <div class="flex items-baseline gap-1 mb-2">
                <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {{ formatDuration(template.durationSec) }}
                </span>
              </div>
            </div>

            <div
              v-if="template.tss"
              class="bg-white dark:bg-gray-900 p-5 rounded-none sm:rounded-xl border-x-0 sm:border-x border-y sm:border-y border-gray-100 dark:border-gray-800 shadow-none sm:shadow-sm overflow-hidden relative"
            >
              <div class="flex items-center gap-2 mb-4">
                <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-amber-500" />
                <span class="text-[10px] font-black uppercase text-gray-500 tracking-widest"
                  >Stress</span
                >
              </div>
              <div class="flex items-baseline gap-1 mb-2">
                <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {{ Math.round(template.tss) }}
                </span>
                <span class="text-xs font-bold text-gray-400 uppercase">TSS</span>
              </div>
            </div>

            <div
              class="bg-white dark:bg-gray-900 p-5 rounded-none sm:rounded-xl border-x-0 sm:border-x border-y sm:border-y border-gray-100 dark:border-gray-800 shadow-none sm:shadow-sm overflow-hidden relative"
            >
              <div class="flex items-center gap-2 mb-4">
                <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-green-500" />
                <span class="text-[10px] font-black uppercase text-gray-500 tracking-widest"
                  >Usage</span
                >
              </div>
              <div class="flex items-baseline gap-1 mb-2">
                <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {{ template.usageCount || 0 }}
                </span>
                <span class="text-xs font-bold text-gray-400 uppercase">Times used</span>
              </div>
            </div>
          </div>

          <!-- Execution Plan -->
          <div class="space-y-4">
            <h2 class="text-base font-black uppercase tracking-widest text-gray-400 px-4 sm:px-0">
              Execution Plan
            </h2>

            <component
              :is="getWorkoutComponent(template.type)"
              v-if="template.structuredWorkout"
              v-model:steps-tab="activeStepsTab"
              :workout="template"
              :user-ftp="userFtp"
              :generating="generating"
              :allow-edit="true"
              class="rounded-none sm:rounded-xl"
              @save="handleSaveStructure"
              @regenerate="generateStructure"
            />

            <!-- No Structured Data -->
            <div
              v-else
              class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-12 border-y sm:border border-gray-100 dark:border-gray-800"
            >
              <div class="text-center">
                <div
                  class="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-gray-400" />
                </div>
                <h3 class="text-base font-black uppercase tracking-widest mb-2">
                  Structure Pending
                </h3>
                <p class="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
                  This template doesn't have a structured execution plan yet.
                </p>
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
            </div>
          </div>
        </div>

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
          @save="onTemplateSaved"
          @cancel="isEditorOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import WorkoutTemplateEditor from '~/components/workouts/WorkoutTemplateEditor.vue'
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

  const { onTaskCompleted } = useUserRunsState()
  const { runs } = useUserRuns()

  async function fetchTemplate() {
    loading.value = true
    try {
      const data: any = await $fetch(`/api/library/workouts/${route.params.id}`)
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
        method: 'POST'
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

  function chatAboutWorkout() {
    navigateTo({
      path: '/chat',
      query: { workoutId: template.value.id, isTemplate: 'true' }
    })
  }

  onMounted(fetchTemplate)
</script>
