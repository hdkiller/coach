<template>
  <UModal
    v-model:open="isOpen"
    :title="template?.title || 'Workout Preview'"
    :ui="{ content: 'sm:max-w-4xl md:max-w-[1200px] lg:max-w-[1400px]' }"
  >
    <template #body>
      <div class="p-6">
        <WorkoutTemplatePreview
          :template="template"
          :user-ftp="userFtp"
          :loading="loading"
          :generating="generating"
          @view="$emit('view')"
          @adjust="$emit('adjust')"
          @regenerate="$emit('regenerate')"
          @save="$emit('save', $event)"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">Close</UButton>
        <UButton
          v-if="template"
          color="primary"
          variant="solid"
          icon="i-heroicons-arrow-top-right-on-square"
          @click="goToFullPage"
        >
          View Full Page
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import WorkoutTemplatePreview from '~/components/workouts/WorkoutTemplatePreview.vue'

  const props = defineProps<{
    templateId: string | null
    templateOwnerScope?: 'athlete' | 'coach'
  }>()

  const emit = defineEmits<{
    'update:templateId': [value: string | null]
    view: []
    adjust: []
    regenerate: []
    save: [payload: any]
  }>()

  const isOpen = computed({
    get: () => !!props.templateId,
    set: (val) => {
      if (!val) emit('update:templateId', null)
    }
  })

  const template = ref<any>(null)
  const userFtp = ref<number | undefined>(undefined)
  const loading = ref(false)
  const generating = ref(false)

  async function fetchTemplate(id: string) {
    loading.value = true
    try {
      const data: any = await $fetch(`/api/library/workouts/${id}`, {
        query: {
          scope: props.templateOwnerScope
        }
      })
      template.value = data.template
      userFtp.value = data.userFtp
    } catch (error) {
      console.error('Failed to fetch template', error)
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [props.templateId, props.templateOwnerScope],
    ([newId]) => {
      if (newId) {
        fetchTemplate(newId)
      } else {
        template.value = null
      }
    }
  )

  function goToFullPage() {
    if (props.templateId) {
      navigateTo({
        path: `/library/workouts/${props.templateId}`,
        query: props.templateOwnerScope ? { scope: props.templateOwnerScope } : undefined
      })
      isOpen.value = false
    }
  }
</script>
