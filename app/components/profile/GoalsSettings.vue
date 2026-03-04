<template>
  <div class="space-y-6 animate-fade-in">
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              {{ t('goals_header') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('goals_description') }}
            </p>
          </div>
          <div class="flex gap-2 shrink-0">
            <UButton
              to="/profile/goals/wizard"
              icon="i-lucide-wand-2"
              size="sm"
              variant="soft"
              color="primary"
              :label="t('goals_button_wizard')"
              class="flex-1 sm:flex-none justify-center"
            />
            <UButton
              icon="i-lucide-plus"
              size="sm"
              variant="soft"
              color="primary"
              :label="t('goals_button_add')"
              class="flex-1 sm:flex-none justify-center"
              @click="openAddModal"
            />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div
        v-if="!goals || goals.length === 0"
        class="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg border-t border-gray-200 dark:border-gray-800"
      >
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4"
        >
          <UIcon name="i-lucide-trophy" class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {{ t('goals_empty_title') }}
        </h3>
        <p class="text-gray-500 mt-2 max-w-sm mx-auto mb-6">
          {{ t('goals_empty_desc') }}
        </p>
        <UButton icon="i-lucide-plus" size="md" color="primary" @click="openAddModal">
          {{ t('goals_button_add') }}
        </UButton>
      </div>

      <!-- Goal List -->
      <div
        v-else
        class="divide-y divide-gray-200 dark:divide-gray-800 border-t border-gray-200 dark:border-gray-800"
      >
        <div
          v-for="goal in goals"
          :key="goal.id"
          class="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-bold text-gray-900 dark:text-white truncate">
                  {{ goal.title }}
                </h4>
                <UBadge :color="getGoalStatusColor(goal.status)" variant="subtle" size="xs">
                  {{ goal.status }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {{ goal.description }}
              </p>

              <div
                class="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider"
              >
                <div class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                  {{ formatDate(goal.targetDate) }}
                </div>
                <div v-if="goal.metric" class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-activity" class="w-3.5 h-3.5" />
                  {{ goal.metric }}: {{ goal.targetValue }}{{ goal.unit }}
                </div>
              </div>
            </div>

            <div class="flex gap-1">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="editGoal(goal)"
              />
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                color="error"
                @click="deleteGoal(goal.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('profile')
  const { formatDate } = useFormat()

  const props = defineProps<{
    goals: any[]
  }>()

  const emit = defineEmits(['update:goals', 'refresh'])

  const toast = useToast()

  function getGoalStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE':
        return 'primary'
      case 'COMPLETED':
        return 'success'
      case 'ABANDONED':
        return 'neutral'
      case 'PAUSED':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  function openAddModal() {
    // Navigate to wizard or open simple form
    navigateTo('/profile/goals/wizard')
  }

  function editGoal(goal: any) {
    // For now navigate to wizard or similar
    navigateTo(`/profile/goals/wizard?edit=${goal.id}`)
  }

  async function deleteGoal(id: string) {
    if (!confirm('Are you sure you want to remove this goal?')) return

    try {
      await $fetch(`/api/goals/${id}`, { method: 'DELETE' })
      toast.add({
        title: 'Goal Deleted',
        color: 'success'
      })
      emit('refresh')
    } catch (error) {
      toast.add({
        title: 'Error',
        description: 'Failed to delete goal',
        color: 'error'
      })
    }
  }
</script>
