<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6"
  >
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
      <h3 class="text-lg font-semibold">Power Profile</h3>
      <div class="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-chat-bubble-left-right"
          class="whitespace-nowrap"
          @click="$emit('add-messages')"
        >
          <span class="hidden sm:inline">Add Messages</span>
          <span class="inline sm:hidden">Messages</span>
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-eye"
          @click="$emit('view')"
        >
          View
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-adjustments-horizontal"
          @click="$emit('adjust')"
        >
          Adjust
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-pencil-square"
          :class="{ 'bg-primary-50 dark:bg-primary-900/20 text-primary': activeTab === 'edit' }"
          @click="activeTab = activeTab === 'edit' ? 'view' : 'edit'"
        >
          Edit
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="generating"
          @click="$emit('regenerate')"
        >
          <span class="hidden sm:inline">Regenerate</span>
          <span class="inline sm:hidden">Redo</span>
        </UButton>
      </div>
    </div>
    <WorkoutChart
      v-model:steps-tab="activeTab"
      :workout="workout"
      :user-ftp="userFtp"
      :sport-settings="sportSettings"
      :allow-edit="allowEdit"
      @save="$emit('save', $event)"
    />
  </div>
</template>

<script setup lang="ts">
  import WorkoutChart from '~/components/workouts/WorkoutChart.vue'

  const props = defineProps<{
    workout: any
    userFtp?: number
    sportSettings?: any
    generating?: boolean
    allowEdit?: boolean
    stepsTab?: 'view' | 'edit'
  }>()

  const emit = defineEmits([
    'add-messages',
    'view',
    'adjust',
    'regenerate',
    'save',
    'update:stepsTab'
  ])

  const activeTab = computed({
    get: () => props.stepsTab || 'view',
    set: (val) => emit('update:stepsTab', val)
  })
</script>
