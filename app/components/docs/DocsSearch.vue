<script setup lang="ts">
  const isOpen = ref(false)
  const query = ref('')

  // Search documentation using Nuxt Content v3 search
  const { data: results } = await useAsyncData(
    `docs-search-${query.value}`,
    () => {
      if (!query.value) return Promise.resolve([])
      return searchContent('content', query)
    },
    {
      watch: [query]
    }
  )

  const groups = computed(() => {
    if (!results.value?.length) return []

    return [
      {
        id: 'docs',
        label: 'Documentation Results',
        items: results.value.map((item) => ({
          id: item.id,
          label: item.title,
          suffix: item.description,
          to: item.id,
          icon: 'i-lucide-file-text'
        }))
      }
    ]
  })

  function onSelect(item: any) {
    isOpen.value = false
    navigateTo(item.to)
  }

  // Keyboard shortcut (CMD+K or CTRL+K)
  defineShortcuts({
    meta_k: () => (isOpen.value = true),
    ctrl_k: () => (isOpen.value = true)
  })
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-search"
      color="neutral"
      variant="ghost"
      class="text-gray-500 hover:text-gray-900 dark:hover:text-white"
      @click="isOpen = true"
    >
      <span class="hidden sm:inline-block">Search documentation...</span>
      <UKbd class="hidden sm:inline-flex ml-2">K</UKbd>
    </UButton>

    <UModal v-model:open="isOpen">
      <template #content>
        <UCommandPalette
          v-model:search-query="query"
          placeholder="Search documentation..."
          :groups="groups"
          :fuse="{ ignoreLocation: true, threshold: 0.3 }"
          class="h-[400px]"
          @update:model-value="onSelect"
        />
      </template>
    </UModal>
  </div>
</template>
