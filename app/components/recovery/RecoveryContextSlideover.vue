<template>
  <USlideover v-model:open="isOpen" side="right" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content>
      <div class="flex h-full flex-col bg-white dark:bg-gray-950">
        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
                Recovery Context
              </p>
              <h2 class="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {{ title }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ subtitle }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              square
              @click="isOpen = false"
            />
          </div>
        </div>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div
            v-if="selectedItem"
            class="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800"
          >
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="badgeColor" variant="subtle">{{ selectedItem.origin }}</UBadge>
              <UBadge v-if="selectedItem.severity" color="warning" variant="subtle">
                Severity {{ selectedItem.severity }}/10
              </UBadge>
            </div>
            <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {{ selectedItem.description || 'No additional context provided.' }}
            </p>
          </div>

          <div v-if="isImported">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Imported items are read-only here so the app stays aligned with the connected source.
            </p>
          </div>

          <template v-else-if="isJourneyEvent || createMode">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  Category
                </label>
                <USelect v-model="journeyForm.category" :items="journeyCategories" class="w-full" />
              </div>
              <div>
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  Type
                </label>
                <USelect v-model="journeyForm.eventType" :items="journeyTypes" class="w-full" />
              </div>
              <div>
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  Severity
                </label>
                <UInput v-model="journeyForm.severity" type="number" min="1" max="10" />
              </div>
              <div class="sm:col-span-2">
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  Timestamp
                </label>
                <UInput v-model="journeyForm.timestamp" type="datetime-local" />
              </div>
              <div class="sm:col-span-2">
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  Notes
                </label>
                <UTextarea v-model="journeyForm.description" :rows="5" class="w-full" />
              </div>
            </div>
          </template>

          <template v-else-if="isCheckin">
            <div class="space-y-3">
              <div
                v-for="question in checkinForm.questions"
                :key="question.id"
                class="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800"
              >
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ question.text }}</p>
                <div class="mt-3">
                  <URadioGroup
                    v-model="question.answer"
                    :items="[
                      { label: 'Yes', value: 'YES' },
                      { label: 'No', value: 'NO' }
                    ]"
                    orientation="horizontal"
                  />
                </div>
              </div>
              <div>
                <label
                  class="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  Notes
                </label>
                <UTextarea v-model="checkinForm.userNotes" :rows="5" />
              </div>
            </div>
          </template>
        </div>

        <div class="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex gap-2">
              <UButton color="neutral" variant="outline" to="/fitness"> Open on Fitness </UButton>
              <UButton
                v-if="canDelete"
                color="error"
                variant="ghost"
                icon="i-lucide-trash"
                :loading="deleting"
                @click="handleDelete"
              >
                Delete
              </UButton>
            </div>

            <div class="flex gap-2">
              <UButton color="neutral" variant="ghost" @click="isOpen = false">Close</UButton>
              <UButton v-if="canSave" color="primary" :loading="saving" @click="handleSave">
                {{ createMode ? 'Log event' : 'Save changes' }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
  import type { RecoveryContextItem } from '~/types/recovery-context'

  const props = defineProps<{
    open: boolean
    item: RecoveryContextItem | null
    createMode?: boolean
    createDate?: string | null
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    saved: []
    deleted: []
  }>()

  const toast = useToast()
  const { formatDateTime } = useFormat()
  const saving = ref(false)
  const deleting = ref(false)

  const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
  })

  const selectedItem = computed(() => props.item)
  const createMode = computed(() => props.createMode === true)
  const isImported = computed(() => selectedItem.value?.sourceType === 'imported')
  const isJourneyEvent = computed(() => selectedItem.value?.kind === 'journey_event')
  const isCheckin = computed(() => selectedItem.value?.kind === 'daily_checkin')
  const canSave = computed(() => createMode.value || !!selectedItem.value?.editable)
  const canDelete = computed(() => !!selectedItem.value?.deletable && !createMode.value)

  const title = computed(() => {
    if (createMode.value) return 'Log recovery event'
    return selectedItem.value?.label || 'Recovery Context'
  })

  const subtitle = computed(() => {
    if (createMode.value)
      return 'Add a manual recovery event that can explain changes in readiness, sleep, or biometrics.'
    if (!selectedItem.value) return 'Review how this item affects your recovery context.'
    return `${selectedItem.value.origin} • ${formatDateTime(selectedItem.value.startAt, 'MMM d, yyyy h:mm a')}`
  })

  const badgeColor = computed(() => {
    if (selectedItem.value?.sourceType === 'imported') return 'info'
    if (selectedItem.value?.sourceType === 'manual_event') return 'warning'
    return 'success'
  })

  const journeyCategories = [
    { label: 'GI Distress', value: 'GI_DISTRESS' },
    { label: 'Muscle Pain', value: 'MUSCLE_PAIN' },
    { label: 'Fatigue', value: 'FATIGUE' },
    { label: 'Sleep', value: 'SLEEP' },
    { label: 'Mood', value: 'MOOD' },
    { label: 'Cramping', value: 'CRAMPING' },
    { label: 'Dizziness', value: 'DIZZINESS' },
    { label: 'Hunger', value: 'HUNGER' }
  ]

  const journeyTypes = [
    { label: 'Symptom', value: 'SYMPTOM' },
    { label: 'Wellness Check', value: 'WELLNESS_CHECK' },
    { label: 'Recovery Note', value: 'RECOVERY_NOTE' }
  ]

  const journeyForm = reactive({
    category: 'FATIGUE',
    eventType: 'SYMPTOM',
    severity: 5,
    timestamp: '',
    description: ''
  })

  const checkinForm = reactive({
    questions: [] as Array<{ id: string; text: string; answer?: string }>,
    userNotes: ''
  })

  watch(
    () => props.item,
    (item) => {
      if (item?.kind === 'journey_event') {
        journeyForm.category = item.category || 'FATIGUE'
        journeyForm.eventType = String(item.metadata?.eventType || 'SYMPTOM')
        journeyForm.severity = item.severity || 5
        journeyForm.timestamp = toLocalDateTimeValue(item.startAt)
        journeyForm.description = item.description || ''
      } else if (item?.kind === 'daily_checkin') {
        checkinForm.questions = (item.rawAnswerSummary || []).map((question) => ({
          ...question,
          answer: question.answer || undefined
        }))
        checkinForm.userNotes = item.userNotes || ''
      }
    },
    { immediate: true }
  )

  watch(
    () => props.createDate,
    (createDate) => {
      if (createMode.value) {
        journeyForm.category = 'FATIGUE'
        journeyForm.eventType = 'SYMPTOM'
        journeyForm.severity = 5
        journeyForm.timestamp = toLocalDateTimeValue(createDate || new Date().toISOString())
        journeyForm.description = ''
      }
    },
    { immediate: true }
  )

  function toLocalDateTimeValue(value: string) {
    return new Date(value).toISOString().slice(0, 16)
  }

  async function handleSave() {
    saving.value = true

    try {
      if (createMode.value) {
        await $fetch('/api/recovery-context/journey', {
          method: 'POST',
          body: {
            timestamp: new Date(journeyForm.timestamp).toISOString(),
            eventType: journeyForm.eventType,
            category: journeyForm.category,
            severity: Number(journeyForm.severity),
            description: journeyForm.description || undefined
          }
        })
      } else if (isJourneyEvent.value && selectedItem.value) {
        await $fetch(`/api/recovery-context/journey/${selectedItem.value.sourceRecordId}`, {
          method: 'PATCH',
          body: {
            timestamp: new Date(journeyForm.timestamp).toISOString(),
            eventType: journeyForm.eventType,
            category: journeyForm.category,
            severity: Number(journeyForm.severity),
            description: journeyForm.description || null
          }
        })
      } else if (isCheckin.value && selectedItem.value) {
        await $fetch(`/api/checkin/${selectedItem.value.sourceRecordId}`, {
          method: 'PATCH',
          body: {
            questions: checkinForm.questions,
            userNotes: checkinForm.userNotes || null
          }
        })
      }

      toast.add({
        title: createMode.value ? 'Recovery event logged' : 'Recovery context updated',
        color: 'success'
      })
      emit('saved')
      isOpen.value = false
    } catch (error: any) {
      toast.add({
        title: 'Unable to save changes',
        description: error?.data?.message || error?.message || 'Please try again.',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }

  async function handleDelete() {
    if (!selectedItem.value) return
    if (!window.confirm('Delete this recovery context entry?')) return

    deleting.value = true

    try {
      if (selectedItem.value.kind === 'journey_event') {
        await $fetch(`/api/recovery-context/journey/${selectedItem.value.sourceRecordId}`, {
          method: 'DELETE'
        })
      } else if (selectedItem.value.kind === 'daily_checkin') {
        await $fetch(`/api/checkin/${selectedItem.value.sourceRecordId}`, {
          method: 'DELETE'
        })
      }

      toast.add({
        title: 'Entry deleted',
        color: 'success'
      })
      emit('deleted')
      isOpen.value = false
    } catch (error: any) {
      toast.add({
        title: 'Unable to delete entry',
        description: error?.data?.message || error?.message || 'Please try again.',
        color: 'error'
      })
    } finally {
      deleting.value = false
    }
  }
</script>
