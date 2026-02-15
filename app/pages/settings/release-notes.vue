<template>
  <div class="space-y-6">
    <UCard :ui="{ body: 'hidden' }">
      <template #header>
        <div class="flex items-center gap-4">
          <UButton
            to="/settings/developer"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            size="sm"
          />
          <div>
            <h2 class="text-xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
              Release Notes
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Explore the latest features and improvements in Coach Watts.
            </p>
          </div>
        </div>
      </template>
    </UCard>

    <div v-if="pending" class="space-y-6">
      <UCard v-for="i in 3" :key="i">
        <template #header>
          <div class="flex items-center justify-between">
            <USkeleton class="h-6 w-24" />
            <USkeleton class="h-4 w-32" />
          </div>
        </template>
        <div class="space-y-2">
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-5/6" />
          <USkeleton class="h-4 w-4/6" />
        </div>
      </UCard>
    </div>

    <div v-else-if="error" class="py-12 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p class="text-gray-900 dark:text-white font-bold">Failed to load release notes</p>
      <UButton label="Try Again" color="neutral" variant="outline" class="mt-4" @click="refresh" />
    </div>

    <div v-else-if="!data || data.length === 0" class="py-12 text-center">
      <UIcon
        name="i-heroicons-sparkles"
        class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4"
      />
      <p class="text-gray-500 dark:text-gray-400">No release notes found.</p>
    </div>

    <div v-else class="space-y-6">
      <UCard v-for="release in data" :key="release.version">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-tag" class="w-5 h-5 text-primary-500" />
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ release.version }}
              </h3>
            </div>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(release.date) }}
            </span>
          </div>
        </template>

        <div class="max-w-none text-gray-700 dark:text-gray-300">
          <MDC :value="release.content || ''" :components="components" />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { h } from 'vue'

  const { data, pending, error, refresh } = useFetch<any[]>('/api/releases')

  useHead({
    title: 'Release Notes',
    meta: [
      {
        name: 'description',
        content: 'Explore the latest features and improvements in Coach Watts.'
      }
    ]
  })

  // Custom components to override default Prose components and force small text
  // Matching ReleaseNotification.vue styling
  const components = {
    h1: (props: any, { slots }: any) =>
      h('h1', { ...props, class: 'text-lg font-bold my-2' }, slots.default?.()),
    h2: (props: any, { slots }: any) =>
      h('h2', { ...props, class: 'text-base font-bold my-2' }, slots.default?.()),
    h3: (props: any, { slots }: any) =>
      h('h3', { ...props, class: 'text-sm font-bold my-1' }, slots.default?.()),
    p: (props: any, { slots }: any) =>
      h('p', { ...props, class: 'text-sm my-2 leading-relaxed' }, slots.default?.()),
    li: (props: any, { slots }: any) =>
      h('li', { ...props, class: 'text-sm my-0.5' }, slots.default?.()),
    ul: (props: any, { slots }: any) =>
      h('ul', { ...props, class: 'list-disc list-inside my-2' }, slots.default?.()),
    ol: (props: any, { slots }: any) =>
      h('ol', { ...props, class: 'list-decimal list-inside my-2' }, slots.default?.())
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
</script>
