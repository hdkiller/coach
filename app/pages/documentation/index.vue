<script setup lang="ts">
  definePageMeta({
    layout: 'docs'
  })

  useSeoMeta({
    title: 'Documentation Hub',
    description: 'Welcome to the Coach Watts documentation center.'
  })
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <header class="mb-12">
      <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
        Coach Watts Documentation
      </h1>
      <p class="text-xl text-gray-500 dark:text-gray-400">
        Welcome to our documentation center. We have organized our resources into four main sections
        to help you find exactly what you need.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-8 mt-8">
      <!-- Athlete Card -->
      <UCard
        class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group flex flex-col h-full"
        @click="
          () => {
            void navigateTo('/documentation/athletes')
          }
        "
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="p-2 bg-primary-50 dark:bg-primary-950/30 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors"
            >
              <UIcon name="i-lucide-users" class="size-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 class="font-bold text-lg">Athletes</h2>
          </div>
        </template>

        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Learn how to set up your account, sync your devices (Strava, Garmin, Oura), connect AI
          assistants via MCP, and interpret your training scores.
        </p>

        <template #footer>
          <div
            class="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:gap-2 transition-all"
          >
            Browse Athlete Docs
            <UIcon name="i-lucide-arrow-right" class="ml-1" />
          </div>
        </template>
      </UCard>

      <!-- Coach Card -->
      <UCard
        class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group flex flex-col h-full"
        @click="
          () => {
            void navigateTo('/documentation/coaches')
          }
        "
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="p-2 bg-primary-50 dark:bg-primary-950/30 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors"
            >
              <UIcon
                name="i-lucide-graduation-cap"
                class="size-6 text-primary-600 dark:text-primary-400"
              />
            </div>
            <h2 class="font-bold text-lg">Coaches</h2>
          </div>
        </template>

        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Resources for human coaches: squad management, performance monitoring, and strategic
          oversight.
        </p>

        <template #footer>
          <div
            class="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:gap-2 transition-all"
          >
            Browse Coach Docs
            <UIcon name="i-lucide-arrow-right" class="ml-1" />
          </div>
        </template>
      </UCard>

      <!-- Developer Card -->
      <UCard
        class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group flex flex-col h-full"
        @click="
          () => {
            void navigateTo('/documentation/developers')
          }
        "
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="p-2 bg-primary-50 dark:bg-primary-950/30 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors"
            >
              <UIcon name="i-lucide-code-2" class="size-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 class="font-bold text-lg">Developers</h2>
          </div>
        </template>

        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Integration guides, OAuth 2.0 PKCE authentication, MCP server, webhooks, and API
          references for building on our platform.
        </p>

        <template #footer>
          <div
            class="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:gap-2 transition-all"
          >
            Browse Developer Docs
            <UIcon name="i-lucide-arrow-right" class="ml-1" />
          </div>
        </template>
      </UCard>

      <!-- Help Card -->
      <UCard
        class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group flex flex-col h-full"
        @click="
          () => {
            void navigateTo('/documentation/help')
          }
        "
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="p-2 bg-primary-50 dark:bg-primary-950/30 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors"
            >
              <UIcon
                name="i-lucide-circle-help"
                class="size-6 text-primary-600 dark:text-primary-400"
              />
            </div>
            <h2 class="font-bold text-lg">Help</h2>
          </div>
        </template>

        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          FAQ, glossary, account and billing info, data privacy, and troubleshooting for common
          issues.
        </p>

        <template #footer>
          <div
            class="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:gap-2 transition-all"
          >
            Browse Help Docs
            <UIcon name="i-lucide-arrow-right" class="ml-1" />
          </div>
        </template>
      </UCard>
    </div>

    <div class="mt-16 pt-8 border-t border-gray-100 dark:border-gray-900">
      <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">Quick Links</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <UButton
          to="/documentation/athletes/getting-started"
          variant="ghost"
          color="neutral"
          class="justify-start"
          >Getting Started</UButton
        >
        <UButton
          to="/documentation/athletes/integrations"
          variant="ghost"
          color="neutral"
          class="justify-start"
          >Integrations</UButton
        >
        <UButton
          to="/documentation/athletes/training-plans"
          variant="ghost"
          color="neutral"
          class="justify-start"
          >Training Plans</UButton
        >
        <UButton
          to="/documentation/athletes/mcp-server"
          variant="ghost"
          color="neutral"
          class="justify-start"
          >AI Assistants (MCP)</UButton
        >
        <UButton to="/documentation/coaches" variant="ghost" color="neutral" class="justify-start"
          >Coach Guides</UButton
        >
        <UButton
          to="/documentation/developers/api-reference"
          variant="ghost"
          color="neutral"
          class="justify-start"
          >API Reference</UButton
        >
        <UButton to="/documentation/help/faq" variant="ghost" color="neutral" class="justify-start"
          >FAQ</UButton
        >
        <UButton
          to="https://github.com/newpush/coach"
          target="_blank"
          variant="ghost"
          color="neutral"
          class="justify-start"
          >GitHub Repo</UButton
        >
      </div>
    </div>
  </div>
</template>
