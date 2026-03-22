<script setup lang="ts">
  const toast = useToast()
  const isCreateModalOpen = ref(false)
  const loading = ref(false)
  const deleting = ref<string | null>(null)

  const { data: fields, refresh } = await useFetch('/api/analytics/fields/definitions')

  const newField = ref({
    entityType: 'WELLNESS' as any,
    fieldKey: '',
    label: '',
    dataType: 'NUMBER' as any,
    unit: ''
  })

  const entityOptions = [
    { label: 'Wellness (Daily)', value: 'WELLNESS' },
    { label: 'Workout (Activity)', value: 'WORKOUT' }
  ]

  const typeOptions = [
    { label: 'Number', value: 'NUMBER' },
    { label: 'True/False (Boolean)', value: 'BOOLEAN' },
    { label: 'Text (String)', value: 'STRING' }
  ]

  async function createField() {
    if (!newField.value.fieldKey || !newField.value.label) return
    
    loading.value = true
    try {
      await $fetch('/api/analytics/fields/definitions', {
        method: 'POST',
        body: newField.value
      })
      toast.add({ title: 'Metric defined successfully!', color: 'success' })
      isCreateModalOpen.value = false
      newField.value = {
        entityType: 'WELLNESS',
        fieldKey: '',
        label: '',
        dataType: 'NUMBER',
        unit: ''
      }
      await refresh()
    } catch (e: any) {
      toast.add({ title: 'Failed to define metric', description: e.data?.statusMessage, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function deleteField(id: string) {
    if (!confirm('Are you sure you want to remove this metric definition? Data already stored in this field will be preserved but no longer chartable via this key.')) return
    
    deleting.value = id
    try {
      await $fetch(`/api/analytics/fields/definitions/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Metric definition removed', color: 'neutral' })
      await refresh()
    } catch (e) {
      toast.add({ title: 'Failed to remove metric', color: 'error' })
    } finally {
      deleting.value = null
    }
  }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-black uppercase tracking-widest text-neutral-500">Custom Metrics</h3>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-plus"
        size="xs"
        label="Define New Metric"
        class="font-bold"
        @click="isCreateModalOpen = true"
      />
    </div>

    <div v-if="!fields?.length" class="p-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
      <p class="text-xs text-neutral-400 italic">No custom metrics defined yet.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div 
        v-for="field in fields" 
        :key="field.id"
        class="p-3 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-between group"
      >
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-900 dark:text-white">{{ field.label }}</span>
            <UBadge size="xs" color="neutral" variant="subtle" class="text-[8px] font-black uppercase tracking-tighter">
              {{ field.entityType }}
            </UBadge>
          </div>
          <p class="text-[9px] text-neutral-400 font-mono mt-0.5">key: {{ field.fieldKey }}</p>
        </div>
        <UButton
          color="error"
          variant="ghost"
          icon="i-lucide-trash"
          size="xs"
          class="hidden group-hover:flex"
          :loading="deleting === field.id"
          @click="deleteField(field.id)"
        />
      </div>
    </div>

    <!-- Create Modal -->
    <UModal
      v-model:open="isCreateModalOpen"
      title="Define Custom Metric"
      description="Track arbitrary data points that aren't part of the standard system metrics."
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Scope" help="Where will you log this data?">
            <USelect v-model="newField.entityType" :items="entityOptions" class="w-full" />
          </UFormField>

          <UFormField label="Metric Label" help="The display name (e.g., Sleep Quality).">
            <UInput v-model="newField.label" placeholder="e.g., Morning Soreness" class="w-full" />
          </UFormField>

          <UFormField label="Field Key" help="Technical ID used in data storage. Only lowercase, numbers, and underscores.">
            <UInput v-model="newField.fieldKey" placeholder="e.g., morning_soreness" class="w-full font-mono" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
          <UFormField label="Data Type" help="Only numeric metrics are chartable right now.">
            <USelect v-model="newField.dataType" :items="typeOptions" class="w-full" />
          </UFormField>
            <UFormField label="Unit" help="e.g., kg, ms, /10">
              <UInput v-model="newField.unit" placeholder="Optional" class="w-full" />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="ghost" @click="isCreateModalOpen = false" />
        <UButton label="Create Metric" color="primary" variant="solid" :loading="loading" @click="createField" />
      </template>
    </UModal>
  </div>
</template>
