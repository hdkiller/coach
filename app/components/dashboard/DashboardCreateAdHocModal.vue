<template>
  <UModal 
    v-model:open="isOpen" 
    title="Generate Ad-Hoc Workout" 
    description="Create a custom workout for today instantly."
    :ui="{ width: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Type">
            <USelect 
              v-model="form.type" 
              :items="['Ride', 'Run', 'Swim', 'WeightTraining']" 
            />
          </UFormField>
          
          <UFormField label="Duration (min)">
             <UInput v-model.number="form.durationMinutes" type="number" step="15" />
          </UFormField>
        </div>
        
        <UFormField label="Intensity">
          <USelect 
            v-model="form.intensity" 
            :items="['Recovery', 'Endurance', 'Tempo', 'Threshold', 'VO2Max', 'Anaerobic']"
            placeholder="Select intensity"
          />
        </UFormField>
        
        <UFormField label="Instructions / Goals">
          <UTextarea 
            v-model="form.notes"
            placeholder="e.g. 'Focus on high cadence', 'Hill repeats', 'Upper body focus'"
            :rows="3"
          />
        </UFormField>
      </div>
    </template>
    
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
        <UButton color="primary" :loading="loading" @click="submit">Generate</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  loading?: boolean
}>()

const emit = defineEmits(['update:open', 'submit'])

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const form = reactive({
  type: 'Ride',
  durationMinutes: 60,
  intensity: 'Endurance',
  notes: ''
})

function submit() {
  emit('submit', { ...form })
}
</script>
