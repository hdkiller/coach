<template>
  <footer class="border-t border-gray-200 dark:border-gray-800 py-12 bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <div class="grid grid-cols-3 md:grid-cols-5 gap-y-12 gap-x-4 mb-8 text-center md:text-left">
        <div class="col-span-3 md:col-span-2 flex flex-col items-center md:items-start">
          <NuxtLink
            to="/"
            class="flex items-center mb-4 hover:opacity-90 transition-opacity justify-center md:justify-start"
          >
            <img
              src="/media/coach_watts_text_cropped.webp"
              alt="Coach Watts"
              class="h-16 w-auto object-contain"
            />
          </NuxtLink>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto md:mx-0">
            AI-powered endurance coaching that adapts to your life, recovery, and goals.
          </p>
        </div>
        <div>
          <h3 class="font-semibold mb-4 text-highlighted">Product</h3>
          <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <NuxtLink to="/#features" class="hover:text-primary">Features</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/#architecture" class="hover:text-primary">Architecture</NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/#pricing"
                class="hover:text-primary flex items-center gap-1 justify-center md:justify-start"
              >
                Pricing
                <UBadge
                  size="xs"
                  color="primary"
                  variant="soft"
                  class="font-bold leading-none inline-flex items-center justify-center !bg-emerald-400 !text-emerald-950 px-1.5 py-0.5"
                  >FREE</UBadge
                >
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/login" class="hover:text-primary">Login</NuxtLink>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold mb-4 text-highlighted">Resources</h3>
          <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <NuxtLink to="/support" class="hover:text-primary">Support</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/documentation" class="hover:text-primary">Docs</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/works-with" class="hover:text-primary">Integrations</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/brand-manual" class="hover:text-primary italic font-medium"
                >Brand Manual</NuxtLink
              >
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-semibold mb-4 text-highlighted">Legal</h3>
          <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <NuxtLink to="/privacy" class="hover:text-primary">Privacy</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/terms" class="hover:text-primary">Terms</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/cookies" class="hover:text-primary">Cookies</NuxtLink>
            </li>
          </ul>
        </div>
      </div>
      <div
        class="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-200 dark:border-gray-800"
      >
        <div class="text-sm text-gray-500 text-center md:text-left">
          {{ t('footer.copyright') }}
        </div>
        <div class="flex flex-wrap justify-center gap-4">
          <UButton
            icon="i-simple-icons-discord"
            color="neutral"
            variant="ghost"
            to="https://discord.gg/dPYkzg49T9"
            target="_blank"
          />
          <UButton
            icon="i-simple-icons-github"
            color="neutral"
            variant="ghost"
            to="https://github.com/newpush/coach"
            target="_blank"
          />
          <UButton
            icon="i-lucide-twitter"
            color="neutral"
            variant="ghost"
            to="https://twitter.com"
            target="_blank"
          />
        </div>
      </div>
    </UContainer>
  </footer>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  const { t } = useTranslate('common')
</script>
