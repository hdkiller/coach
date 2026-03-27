<template>
  <UModal
    v-model:open="isOpen"
    :title="milestone?.title || 'Milestone'"
    :description="milestone?.description || 'Details of this progress event.'"
  >
    <template #body>
      <div v-if="milestone" class="space-y-6">
        <!-- Header Info with Big Icon -->
        <div class="flex items-center gap-4">
          <div :class="['p-4 rounded-2xl ring-1 ring-inset', typeColorClasses]">
            <UIcon :name="typeIcon" class="w-8 h-8" />
          </div>
          <div>
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
              {{ typeLabel }}
            </div>
            <h3 class="text-xl font-black text-gray-900 dark:text-white leading-tight">
              {{ milestone.title }}
            </h3>
          </div>
        </div>

        <!-- Metric Details -->
        <div
          v-if="milestone.metric || milestone.value"
          class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
        >
          <div class="grid grid-cols-2 gap-4">
            <div v-if="milestone.metric">
              <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                Metric
              </div>
              <div class="text-sm font-bold text-gray-900 dark:text-white">
                {{ milestone.metric }}
              </div>
            </div>
            <div v-if="milestone.sportProfileName">
              <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                Sport Profile
              </div>
              <div class="text-sm font-bold text-gray-900 dark:text-white">
                {{ milestone.sportProfileName }}
              </div>
            </div>
            <div v-if="milestone.value != null">
              <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                New Value
              </div>
              <div class="text-sm font-bold text-gray-900 dark:text-white">
                {{ milestone.value }}{{ milestone.unit || '' }}
              </div>
            </div>
            <div v-if="milestone.oldValue != null">
              <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                Previous
              </div>
              <div class="text-sm font-bold text-gray-900 dark:text-white">
                {{ milestone.oldValue }}{{ milestone.unit || '' }}
              </div>
            </div>
            <div v-if="milestone.priority">
              <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                Priority
              </div>
              <UBadge :color="priorityColor" variant="subtle" size="xs">
                {{ milestone.priority }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="milestone.description" class="space-y-2">
          <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">Notes</div>
          <p
            class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
          >
            {{ milestone.description }}
          </p>
        </div>

        <div
          class="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest"
        >
          <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
          <span>Recorded on {{ formatDateUTC(new Date(milestone.date), 'MMMM do, yyyy') }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Coach Watts Milestone
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          class="font-bold uppercase text-[10px] tracking-widest"
          @click="isOpen = false"
        >
          Dismiss
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import type { CalendarActivity } from '~/types/calendar'

  const props = defineProps<{
    milestone: CalendarActivity | null
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })

  const { formatDateUTC } = useFormat()

  const typeIcon = computed(() => {
    if (!props.milestone) return 'i-heroicons-flag'
    switch (props.milestone.source) {
      case 'goal':
        return props.milestone.priority === 'HIGH'
          ? 'i-heroicons-star-solid'
          : 'i-heroicons-flag-solid'
      case 'threshold':
        return 'i-heroicons-arrow-trending-up'
      case 'pb':
        return 'i-heroicons-trophy-solid'
      default:
        return 'i-heroicons-flag'
    }
  })

  const typeLabel = computed(() => {
    if (!props.milestone) return 'Milestone'
    switch (props.milestone.source) {
      case 'goal':
        return 'Personal Goal'
      case 'threshold':
        return 'Threshold Update'
      case 'pb':
        return 'Personal Best'
      default:
        return 'Milestone'
    }
  })

  const typeColorClasses = computed(() => {
    if (!props.milestone) return ''
    switch (props.milestone.source) {
      case 'goal':
        return 'bg-yellow-50 text-yellow-600 ring-yellow-500/10 dark:bg-yellow-900/20 dark:text-yellow-400 dark:ring-yellow-400/20'
      case 'threshold':
        return 'bg-purple-50 text-purple-600 ring-purple-500/10 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-400/20'
      case 'pb':
        return 'bg-teal-50 text-teal-600 ring-teal-500/10 dark:bg-teal-900/20 dark:text-teal-400 dark:ring-teal-400/20'
      default:
        return ''
    }
  })

  const priorityColor = computed(() => {
    switch (props.milestone?.priority) {
      case 'HIGH':
        return 'error'
      case 'MEDIUM':
        return 'warning'
      case 'LOW':
        return 'success'
      default:
        return 'neutral'
    }
  })
</script>
