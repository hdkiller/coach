<template>
  <!-- Ft2 statement footer — closes the page, does not catalogue a sitemap -->
  <footer class="border-t border-white/10 bg-[oklch(14%_0.018_155)] py-12">
    <UContainer>
      <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div class="max-w-md">
          <NuxtLink to="/" class="mb-4 inline-flex transition-opacity hover:opacity-90">
            <img
              src="/media/coach_watts_text_cropped.webp"
              alt="Coach Watts"
              class="h-12 w-auto object-contain"
            />
          </NuxtLink>
          <p class="text-sm leading-relaxed text-gray-400">
            {{ t('footer.tagline') }}
          </p>
        </div>

        <nav
          class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-400"
          aria-label="Footer"
        >
          <NuxtLink to="/#pricing" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('footer.pricing')
          }}</NuxtLink>
          <NuxtLink to="/calendar" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('footer.events')
          }}</NuxtLink>
          <NuxtLink to="/works-with" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('nav.integrations')
          }}</NuxtLink>
          <NuxtLink
            to="/documentation"
            class="whitespace-nowrap transition-colors hover:text-white"
            >{{ t('footer.docs') }}</NuxtLink
          >
          <NuxtLink to="/support" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('footer.support')
          }}</NuxtLink>
          <NuxtLink to="/privacy" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('footer.privacy')
          }}</NuxtLink>
          <NuxtLink to="/terms" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('footer.terms')
          }}</NuxtLink>
          <a
            href="https://discord.gg/dPYkzg49T9"
            target="_blank"
            rel="noopener noreferrer"
            class="whitespace-nowrap transition-colors hover:text-white"
            >Discord</a
          >
          <a
            href="https://github.com/newpush/coach"
            target="_blank"
            rel="noopener noreferrer"
            class="whitespace-nowrap transition-colors hover:text-white"
            >GitHub</a
          >
        </nav>
      </div>

      <p class="mt-10 text-sm text-gray-500">
        {{ t('footer.copyright') }}
      </p>
    </UContainer>
  </footer>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  const { t } = useTranslate('common')
</script>
