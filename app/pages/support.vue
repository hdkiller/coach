<template>
  <div class="py-24 sm:py-32">
    <UContainer>
      <div class="mx-auto max-w-2xl text-center mb-16">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Support
        </h1>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
          We're here to help. Choose the channel that works best for you.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <!-- Community Support -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-simple-icons-discord" class="w-8 h-8 text-[#5865F2]" />
              <h2 class="text-xl font-semibold">Community Support</h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Join our Discord server to ask questions, share feedback, and connect with other users.
            This is the fastest way to get help.
          </p>

          <template #footer>
            <UButton
              to="https://discord.gg/dPYkzg49T9"
              target="_blank"
              color="primary"
              variant="solid"
              block
              icon="i-simple-icons-discord"
            >
              Join our Discord
            </UButton>
          </template>
        </UCard>

        <!-- GitHub Issues -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-simple-icons-github" class="w-8 h-8 text-gray-900 dark:text-white" />
              <h2 class="text-xl font-semibold">GitHub Issues</h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Found a bug or have a feature request? Open an issue on our GitHub repository to track
            its progress and contribute.
          </p>

          <template #footer>
            <UButton
              to="https://github.com/newpush/coach/issues"
              target="_blank"
              color="gray"
              variant="solid"
              block
              icon="i-simple-icons-github"
            >
              Open an Issue
            </UButton>
          </template>
        </UCard>

        <!-- Email Support -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-envelope" class="w-8 h-8 text-primary-500" />
              <h2 class="text-xl font-semibold">Email Support</h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Have a specific issue or need private assistance? Send us an email and we'll get back to
            you as soon as possible.
          </p>

          <template #footer>
            <UButton
              to="mailto:support@newpush.com"
              color="gray"
              variant="solid"
              block
              icon="i-heroicons-envelope"
            >
              Contact Support
            </UButton>
          </template>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
    layout: 'home',
    auth: false
  })

  useHead({
    title: 'Support | Coach Watts',
    meta: [
      {
        name: 'description',
        content:
          'Get help with Coach Watts. Join our Discord community or contact our support team.'
      }
    ]
  })
</script>
