<script setup lang="ts">
  const { data } = useAuth()
  const user = computed(() => data.value?.user)
  const isMobileMenuOpen = ref(false)

  // Define standard header height for sticky elements
  const headerHeight = '64px'
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-950" :style="{ '--header-height': headerHeight }">
    <!-- Header -->
    <header
      class="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md"
    >
      <UContainer class="h-[--header-height] flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            class="lg:hidden"
            @click="isMobileMenuOpen = true"
          />

          <NuxtLink to="/" class="flex items-center gap-2 shrink-0">
            <img src="/media/logo.webp" alt="Coach Watts" class="h-8 w-8" />
            <span class="font-bold text-xl hidden sm:inline-block">Coach Watts</span>
            <span class="text-gray-400 dark:text-gray-600 hidden sm:inline-block">/</span>
            <span class="font-medium text-gray-600 dark:text-gray-400">Documentation</span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-2">
          <DocsSearch class="hidden sm:block" />

          <USeparator orientation="vertical" class="h-6 mx-2 hidden sm:block" />

          <UButton v-if="user" to="/dashboard" color="primary" variant="solid" size="sm">
            Dashboard
          </UButton>
          <UButton v-else to="/login" color="primary" variant="solid" size="sm"> Sign In </UButton>

          <ColorModeButton />
        </div>
      </UContainer>
    </header>

    <!-- Main Content Grid -->
    <UContainer>
      <div class="flex flex-col lg:grid lg:grid-cols-[250px_1fr_200px] gap-8">
        <!-- Sidebar Navigation (Desktop) -->
        <div class="hidden lg:block">
          <DocsAside />
        </div>

        <!-- Main Content -->
        <main class="py-8 min-w-0">
          <slot />
        </main>

        <!-- TOC (Desktop) -->
        <div class="hidden lg:block">
          <!-- TOC is injected by the page using a portal or template ref if needed, 
               but here we'll let the page handle its own TOC placement for simplicity 
               or pass it via a slot/provide -->
          <slot name="toc" />
        </div>
      </div>
    </UContainer>

    <!-- Mobile Navigation Sidebar -->
    <USlideover v-model:open="isMobileMenuOpen" title="Documentation">
      <template #content>
        <div class="p-4">
          <DocsAside @select="isMobileMenuOpen = false" />
        </div>
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
  /* Ensure prose headers have enough margin-top to account for sticky header */
  :deep(.prose h2),
  :deep(.prose h3) {
    scroll-margin-top: calc(var(--header-height) + 2rem);
  }
</style>
