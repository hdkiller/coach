<template>
  <UCard
    class="flex flex-col h-full transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-primary-500/50"
    :class="[recommendation.isPinned ? 'ring-2 ring-primary-500 bg-primary-50/10' : '']"
    :ui="{
      header: 'py-3 px-4',
      body: 'flex-1 py-3 px-4',
      footer: 'h-12 flex items-center shrink-0 border-t border-gray-100 dark:border-gray-800 px-4'
    }"
    @click="navigateTo(`/recommendations/${recommendation.id}`)"
  >
    <template #header>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2.5">
          <UBadge :color="priorityColor" variant="subtle" size="sm" class="font-bold px-2 py-0.5">
            {{ recommendation.priority.toUpperCase() }}
          </UBadge>
          <UBadge color="neutral" variant="soft" size="sm" class="px-2 py-0.5 opacity-80">
            {{ recommendation.sourceType }} / {{ recommendation.metric }}
          </UBadge>
        </div>
        <div class="flex items-center gap-1" @click.stop>
          <UTooltip :text="recommendation.isPinned ? 'Unpin' : 'Pin to Focus'">
            <UButton
              :icon="
                recommendation.isPinned ? 'i-heroicons-paper-clip-solid' : 'i-heroicons-paper-clip'
              "
              color="neutral"
              variant="ghost"
              size="sm"
              class="hover:text-primary-500 p-1"
              @click="$emit('toggle-pin', recommendation)"
            />
          </UTooltip>
          <UDropdownMenu :items="menuItems">
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="sm"
              class="p-1"
            />
          </UDropdownMenu>
        </div>
      </div>
    </template>

    <div class="h-full flex flex-col justify-between">
      <div>
        <h3 class="font-semibold text-lg mb-2 line-clamp-2">{{ recommendation.title }}</h3>
        <p class="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap line-clamp-4">
          {{ recommendation.description }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full text-xs text-gray-500">
        <div class="flex items-center gap-3">
          <UTooltip :text="`Generated ${formatDate(recommendation.generatedAt)}`">
            <span class="cursor-default">{{
              formatDate(recommendation.generatedAt, 'MMM d')
            }}</span>
          </UTooltip>
          <AiFeedback
            v-if="recommendation.llmUsageId"
            :llm-usage-id="recommendation.llmUsageId"
            size="xs"
            @click.stop
          />
        </div>
        <div class="flex gap-1" @click.stop>
          <UTooltip v-if="recommendation.status !== 'COMPLETED'" text="Mark Done">
            <UButton
              color="success"
              variant="ghost"
              size="xs"
              class="group/btn"
              @click="$emit('update-status', recommendation, 'COMPLETED')"
            >
              <template #leading>
                <UIcon name="i-heroicons-check" class="w-5 h-5 group-hover/btn:hidden" />
                <UIcon
                  name="i-heroicons-check-solid"
                  class="w-5 h-5 hidden group-hover/btn:block text-green-600"
                />
              </template>
            </UButton>
          </UTooltip>

          <UTooltip v-if="recommendation.status === 'ACTIVE'" text="Dismiss">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              class="group/btn"
              @click="$emit('update-status', recommendation, 'DISMISSED')"
            >
              <template #leading>
                <UIcon name="i-heroicons-eye-slash" class="w-5 h-5 group-hover/btn:hidden" />
                <UIcon
                  name="i-heroicons-eye-slash-solid"
                  class="w-5 h-5 hidden group-hover/btn:block text-gray-600 dark:text-gray-400"
                />
              </template>
            </UButton>
          </UTooltip>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
  const props = defineProps<{
    recommendation: any
  }>()

  const emit = defineEmits(['toggle-pin', 'update-status'])

  const { formatDate } = useFormat()

  const priorityColor = computed(() => {
    switch (props.recommendation.priority) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'primary'
      default:
        return 'neutral'
    }
  })

  const menuItems = computed(() => [
    [
      {
        label: props.recommendation.status === 'DISMISSED' ? 'Restore' : 'Dismiss',
        icon:
          props.recommendation.status === 'DISMISSED'
            ? 'i-heroicons-arrow-uturn-left'
            : 'i-heroicons-eye-slash',
        click: () =>
          emit(
            'update-status',
            props.recommendation,
            props.recommendation.status === 'DISMISSED' ? 'ACTIVE' : 'DISMISSED'
          )
      },
      {
        label: 'View Details & History',
        icon: 'i-heroicons-clock',
        to: `/recommendations/${props.recommendation.id}`
      }
    ]
  ])
</script>
