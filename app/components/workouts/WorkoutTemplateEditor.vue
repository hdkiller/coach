<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormField label="Workout Title">
        <UInput v-model="localTemplate.title" placeholder="e.g. 4x8 Threshold Intervals" />
      </UFormField>

      <UFormField label="Type">
        <USelect v-model="localTemplate.type" :items="WORKOUT_TYPES" />
      </UFormField>

      <UFormField label="Category">
        <UInput v-model="localTemplate.category" placeholder="e.g. Threshold, VO2Max" />
      </UFormField>

      <UFormField label="Sport">
        <USelect
          v-model="localTemplate.sport"
          :items="['Cycling', 'Running', 'Swimming', 'Strength']"
        />
      </UFormField>
    </div>

    <UFormField label="Description">
      <UTextarea
        v-model="localTemplate.description"
        autoresize
        placeholder="Describe the session's intent..."
      />
    </UFormField>

    <USeparator />

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-black uppercase tracking-widest text-primary">Workout Structure</h3>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-plus" size="xs" @click="addStep"
          >Add Step</UButton
        >
      </div>

      <div
        v-if="!localTemplate.structuredWorkout?.steps?.length"
        class="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-800"
      >
        <p class="text-xs text-muted">No steps defined. Add intervals to build the structure.</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(step, index) in localTemplate.structuredWorkout.steps"
          :key="index"
          class="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm group"
        >
          <div class="flex-none text-[10px] font-bold text-gray-400 w-4">{{ index + 1 }}</div>

          <div class="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <UInput v-model="step.name" placeholder="Step name" size="xs" class="sm:col-span-1" />

            <div class="flex items-center gap-1 sm:col-span-1">
              <UInput v-model.number="step.duration" type="number" size="xs" class="w-16" />
              <span class="text-[10px] text-muted uppercase font-bold">min</span>
            </div>

            <div class="flex items-center gap-1 sm:col-span-1">
              <UInput v-model.number="step.intensity" type="number" size="xs" class="w-16" />
              <span class="text-[10px] text-muted uppercase font-bold">% FTP</span>
            </div>

            <div class="flex items-center gap-1 sm:col-span-1">
              <USelect
                v-model="step.type"
                :items="['WORK', 'REST', 'WARMUP', 'COOLDOWN']"
                size="xs"
              />
            </div>
          </div>

          <UButton
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            size="xs"
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            @click="removeStep(index)"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
      <UButton color="neutral" variant="ghost" @click="$emit('cancel')">Cancel</UButton>
      <UButton color="primary" :loading="saving" @click="saveTemplate">Save Template</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    template?: any
  }>()

  const emit = defineEmits(['save', 'cancel'])
  const toast = useToast()
  const saving = ref(false)

  const WORKOUT_TYPES = ['Ride', 'VirtualRide', 'Run', 'Swim', 'WeightTraining', 'Hike', 'Walk']

  const localTemplate = ref(
    props.template
      ? JSON.parse(JSON.stringify(props.template))
      : {
          title: '',
          description: '',
          type: 'Ride',
          sport: 'Cycling',
          category: '',
          structuredWorkout: {
            steps: []
          }
        }
  )

  function addStep() {
    if (!localTemplate.value.structuredWorkout) {
      localTemplate.value.structuredWorkout = { steps: [] }
    }
    localTemplate.value.structuredWorkout.steps.push({
      name: 'Interval',
      duration: 10,
      intensity: 80,
      type: 'WORK'
    })
  }

  function removeStep(index: number) {
    localTemplate.value.structuredWorkout.steps.splice(index, 1)
  }

  async function saveTemplate() {
    if (!localTemplate.value.title) {
      toast.add({ title: 'Title required', color: 'error' })
      return
    }

    saving.value = true
    try {
      const isNew = !localTemplate.value.id
      const url = isNew
        ? '/api/library/workouts'
        : `/api/library/workouts/${localTemplate.value.id}`
      const method = isNew ? 'POST' : 'PATCH'

      await $fetch(url, {
        method,
        body: localTemplate.value
      })

      toast.add({
        title: isNew ? 'Template Created' : 'Template Updated',
        color: 'success'
      })
      emit('save')
    } catch (error: any) {
      toast.add({
        title: 'Save Failed',
        description: error.data?.message || 'Unknown error',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }
</script>
