<template>
  <div
    class="min-h-screen flex flex-col font-sans bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
  >
    <header
      class="sticky top-0 z-50 bg-white/75 dark:bg-gray-950/75 backdrop-blur border-b border-gray-200 dark:border-gray-800"
    >
      <UContainer class="h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center hover:opacity-90 transition-opacity">
          <img src="/media/coach_watts_text_cropped.webp" alt="Coach Watts" class="h-12 w-auto object-contain" />
        </NuxtLink>

        <nav
          class="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300"
        >
          <NuxtLink to="/#how-it-works" class="hover:text-primary transition-colors">
            {{ t('nav.how_it_works') }}
          </NuxtLink>
          <NuxtLink
            to="/#pricing"
            class="hover:text-primary transition-colors flex items-center gap-1"
          >
            {{ t('nav.pricing') }}
            <UBadge
              size="xs"
              color="primary"
              variant="soft"
              class="font-bold leading-none inline-flex items-center justify-center !bg-emerald-400 !text-emerald-950 px-1.5 py-0.5"
              >{{ t('nav.pricing_badge') }}</UBadge
            >
          </NuxtLink>
          <NuxtLink to="/stories" class="hover:text-primary transition-colors">{{
            t('nav.stories')
          }}</NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <ClientOnly>
            <LanguageSwitcher />
          </ClientOnly>
          <div class="hidden sm:flex items-center gap-2">
            <UButton v-if="route.path !== '/login'" to="/login" variant="ghost" color="gray">{{
              t('nav.sign_in')
            }}</UButton>
            <UButton v-if="route.path !== '/join'" to="/join" color="primary">{{
              t('nav.get_started')
            }}</UButton>
          </div>

          <UPopover class="lg:hidden">
            <UButton icon="i-lucide-menu" color="gray" variant="ghost" />
            <template #content>
              <div class="p-4 w-48 flex flex-col gap-4">
                <NuxtLink
                  to="/#how-it-works"
                  class="text-sm font-medium hover:text-primary transition-colors"
                  >{{ t('nav.how_it_works') }}</NuxtLink
                >
                <NuxtLink
                  to="/#pricing"
                  class="text-sm font-medium hover:text-primary transition-colors flex items-center justify-between"
                >
                  {{ t('nav.pricing') }}
                  <UBadge
                    size="xs"
                    color="primary"
                    variant="soft"
                    class="font-bold leading-none inline-flex items-center justify-center !bg-emerald-400 !text-emerald-950 px-1.5 py-0.5"
                    >{{ t('nav.pricing_badge') }}</UBadge
                  >
                </NuxtLink>
                <NuxtLink
                  to="/stories"
                  class="text-sm font-medium hover:text-primary transition-colors"
                  >{{ t('nav.stories') }}</NuxtLink
                >
                <hr class="border-gray-200 dark:border-gray-800" />
                <UButton
                  v-if="route.path !== '/login'"
                  to="/login"
                  variant="ghost"
                  color="gray"
                  block
                  >{{ t('nav.sign_in') }}</UButton
                >
                <UButton v-if="route.path !== '/join'" to="/join" color="primary" block>{{
                  t('nav.get_started')
                }}</UButton>
              </div>
            </template>
          </UPopover>
        </div>
      </UContainer>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800 py-12 bg-gray-50 dark:bg-gray-900">
      <UContainer>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          <div class="md:col-span-2">
            <NuxtLink to="/" class="flex items-center mb-4 hover:opacity-90 transition-opacity">
              <img
                src="/media/coach_watts_text_cropped.webp"
                alt="Coach Watts"
                class="h-16 w-auto object-contain"
              />
            </NuxtLink>
            <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              AI-powered endurance coaching that adapts to your life, recovery, and goals.
            </p>
          </div>
          <div>
            <h3 class="font-semibold mb-4 text-white">Product</h3>
            <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <NuxtLink to="/#features" class="hover:text-primary">Features</NuxtLink>
              </li>
              <li>
                <NuxtLink to="/#architecture" class="hover:text-primary">Architecture</NuxtLink>
              </li>
              <li>
                <NuxtLink to="/#pricing" class="hover:text-primary flex items-center gap-1">
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
            <h3 class="font-semibold mb-4 text-white">Resources</h3>
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
            <h3 class="font-semibold mb-4 text-white">Legal</h3>
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
              color="gray"
              variant="ghost"
              to="https://discord.gg/dPYkzg49T9"
              target="_blank"
            />
            <UButton
              icon="i-simple-icons-github"
              color="gray"
              variant="ghost"
              to="https://github.com/newpush/coach"
              target="_blank"
            />
            <UButton
              icon="i-lucide-twitter"
              color="gray"
              variant="ghost"
              to="https://twitter.com"
              target="_blank"
            />
          </div>
        </div>
      </UContainer>
    </footer>
  </div>
</template>

<script setup>
  import { useTranslate } from '@tolgee/vue'

  const route = useRoute()
  const { t } = useTranslate('common')

  // Landing page is always dark — no light mode support
  const colorMode = useColorMode()
  const prevPreference = colorMode.preference
  colorMode.preference = 'dark'
  onBeforeUnmount(() => {
    colorMode.preference = prevPreference
  })
</script>
