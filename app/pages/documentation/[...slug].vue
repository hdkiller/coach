<script setup lang="ts">
  // We disable the automatic layout to use NuxtLayout component for multi-slot support
  definePageMeta({
    layout: false
  })

  const route = useRoute()

  // Fetch the page content
  const { data: page } = await useAsyncData(route.path, () => {
    return queryCollection('content').path(route.path).first()
  })

  if (!page.value) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  useSeoMeta({
    title: page.value.title,
    description: page.value.description
  })
</script>

<template>
  <NuxtLayout name="docs">
    <div v-if="page">
      <!-- Breadcrumbs -->
      <div class="mb-6">
        <UBreadcrumb
          :items="[{ label: 'Documentation', to: '/documentation' }, { label: page.title }]"
        />
      </div>

      <!-- Title & Description -->
      <header class="mb-12 border-b border-gray-100 dark:border-gray-900 pb-8">
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          {{ page.title }}
        </h1>
        <p v-if="page.description" class="text-xl text-gray-500 dark:text-gray-400">
          {{ page.description }}
        </p>
      </header>

      <!-- Main Body -->
      <div class="prose dark:prose-invert max-w-none">
        <ContentRenderer :value="page" />
      </div>

      <!-- Footer Pagination -->
      <div
        class="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center"
      >
        <UButton to="/documentation" color="neutral" variant="ghost" icon="i-lucide-arrow-left">
          Back to Index
        </UButton>

        <UButton
          variant="link"
          color="neutral"
          icon="i-lucide-arrow-up"
          @click="() => window.scrollTo({ top: 0, behavior: 'smooth' })"
        >
          Back to top
        </UButton>
      </div>
    </div>

    <template #toc>
      <DocsToc v-if="page?.body?.toc?.links?.length" :links="page.body.toc.links" />
    </template>
  </NuxtLayout>
</template>
