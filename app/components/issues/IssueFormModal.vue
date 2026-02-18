<script setup lang="ts">
  import { z } from 'zod'
  import type { FormSubmitEvent } from '#ui/types'

  const props = defineProps<{
    issue?: any
  }>()

  const emit = defineEmits(['success', 'close'])

  const isOpen = defineModel<boolean>('open', { default: false })
  const isEditing = computed(() => !!props.issue)

  const schema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100),
    description: z.string().min(10, 'Please provide more details (min 10 characters)').max(2000)
  })

  type Schema = z.output<typeof schema>

  const state = reactive({
    title: props.issue?.title || '',
    description: props.issue?.description || ''
  })

  const loading = ref(false)
  const toast = useToast()

  async function onSubmit(event: FormSubmitEvent<Schema>) {
    loading.value = true
    try {
      if (isEditing.value) {
        await $fetch(`/api/issues/${props.issue.id}`, {
          method: 'PATCH',
          body: event.data
        })
        toast.add({ title: 'Issue updated', color: 'success' })
      } else {
        // Collect some system context automatically
        const context = {
          userAgent: navigator.userAgent,
          language: navigator.language,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          url: window.location.href
        }

        await $fetch('/api/issues', {
          method: 'POST',
          body: { ...event.data, context }
        })
        toast.add({ title: 'Issue reported successfully', color: 'success' })
      }
      emit('success')
      isOpen.value = false
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Something went wrong',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <UModal v-model:open="isOpen" title="Dialog" description="Dialog content and actions.">
    <template #content>
      <UCard :ui="{ body: 'p-0 sm:p-6' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ isEditing ? 'Edit Issue' : 'Report an Issue' }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="isOpen = false"
            />
          </div>
        </template>

        <UForm :schema="schema" :state="state" class="space-y-4 p-4 sm:p-0" @submit="onSubmit">
          <UFormField
            label="Title"
            name="title"
            required
            help="Summarize the problem in a few words"
            class="w-full"
          >
            <UInput
              v-model="state.title"
              placeholder="e.g. Activity sync is failing"
              autofocus
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Description"
            name="description"
            required
            help="What happened? What did you expect to happen?"
            class="w-full"
          >
            <UTextarea
              v-model="state.description"
              placeholder="Provide as much detail as possible..."
              :rows="5"
              autoresize
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
            <UButton
              type="submit"
              color="primary"
              :loading="loading"
              :label="isEditing ? 'Save Changes' : 'Submit Report'"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
