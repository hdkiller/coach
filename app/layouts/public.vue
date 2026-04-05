<template>
  <div class="min-h-screen flex flex-col font-sans bg-[#050816] text-gray-100">
    <header class="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/85 backdrop-blur">
      <UContainer class="h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center hover:opacity-90 transition-opacity">
          <img
            src="/media/coach_watts_text_cropped.webp"
            alt="Coach Watts"
            class="h-12 w-auto object-contain"
          />
        </NuxtLink>

        <nav class="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-300">
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
          <NuxtLink to="/training-plans" class="hover:text-primary transition-colors">
            Training Plans
          </NuxtLink>
          <NuxtLink to="/works-with" class="hover:text-primary transition-colors">{{
            t('nav.integrations')
          }}</NuxtLink>
          <NuxtLink to="/stories" class="hover:text-primary transition-colors">{{
            t('nav.stories')
          }}</NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <div class="h-8 min-w-[8.5rem] shrink-0">
            <ClientOnly>
              <LanguageSwitcher />
              <template #fallback>
                <div
                  class="h-full w-full rounded-md border border-white/10 bg-white/5"
                  aria-hidden="true"
                />
              </template>
            </ClientOnly>
          </div>
          <div class="hidden sm:flex items-center gap-2">
            <UButton v-if="route.path !== '/login'" to="/login" variant="ghost" color="neutral">{{
              t('nav.sign_in')
            }}</UButton>
            <UButton v-if="route.path !== '/join'" to="/join" color="primary">{{
              t('nav.get_started')
            }}</UButton>
          </div>

          <UPopover class="lg:hidden">
            <UButton icon="i-lucide-menu" color="neutral" variant="ghost" />
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
                  to="/training-plans"
                  class="text-sm font-medium hover:text-primary transition-colors"
                  >Training Plans</NuxtLink
                >
                <NuxtLink
                  to="/works-with"
                  class="text-sm font-medium hover:text-primary transition-colors"
                  >{{ t('nav.integrations') }}</NuxtLink
                >
                <NuxtLink
                  to="/stories"
                  class="text-sm font-medium hover:text-primary transition-colors"
                  >{{ t('nav.stories') }}</NuxtLink
                >
                <hr class="border-white/10" />
                <UButton
                  v-if="route.path !== '/login'"
                  to="/login"
                  variant="ghost"
                  color="neutral"
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

    <PublicFooter />
  </div>
</template>

<script setup>
  import { useTranslate } from '@tolgee/vue'
  import PublicFooter from '~/components/layout/PublicFooter.vue'

  const route = useRoute()
  const { t } = useTranslate('common')

  useHead({
    htmlAttrs: {
      class: 'dark'
    }
  })
</script>
