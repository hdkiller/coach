<script setup lang="ts">
  interface TocLink {
    id: string
    text: string
    depth: number
    children?: TocLink[]
  }

  defineProps<{
    links: TocLink[]
  }>()

  const route = useRoute()
  const activeId = ref('')

  // Simple intersection observer to highlight active section
  onMounted(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeId.value = entry.target.id
          }
        })
      },
      { rootMargin: '0% 0% -80% 0%' }
    )

    document.querySelectorAll('h2, h3').forEach((el) => {
      observer.observe(el)
    })

    onUnmounted(() => observer.disconnect())
  })
</script>

<template>
  <aside
    class="sticky top-[--header-height] h-[calc(100vh-var(--header-height))] overflow-y-auto py-8 pl-4"
  >
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
        On this page
      </h3>
    </div>

    <nav class="space-y-1">
      <template v-for="link in links" :key="link.id">
        <a
          :href="`#${link.id}`"
          class="block text-sm py-1 transition-colors border-l-2 pl-3"
          :class="[
            activeId === link.id
              ? 'text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 font-medium'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 border-transparent'
          ]"
        >
          {{ link.text }}
        </a>

        <template v-if="link.children">
          <a
            v-for="child in link.children"
            :key="child.id"
            :href="`#${child.id}`"
            class="block text-sm py-1 transition-colors border-l-2 pl-6"
            :class="[
              activeId === child.id
                ? 'text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 font-medium'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 border-transparent'
            ]"
          >
            {{ child.text }}
          </a>
        </template>
      </template>
    </nav>
  </aside>
</template>
