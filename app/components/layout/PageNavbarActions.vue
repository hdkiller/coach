<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import type { DropdownMenuItem } from '@nuxt/ui'

  defineProps<{
    overflowItems?: DropdownMenuItem[][]
  }>()

  const { t } = useTranslate('common')
</script>

<template>
  <div
    class="flex min-w-0 max-w-[calc(100vw-5.5rem)] shrink items-center justify-end gap-1 lg:max-w-none lg:gap-2"
  >
    <div class="navbar-actions-mobile flex items-center gap-1.5 lg:hidden">
      <slot name="mobile" />
      <UDropdownMenu v-if="overflowItems?.length" :items="overflowItems">
        <LayoutNavbarIconButton
          icon="i-heroicons-ellipsis-horizontal"
          :label="t('navbar_more_actions')"
        />
      </UDropdownMenu>
    </div>

    <div class="hidden items-center gap-2 lg:flex">
      <slot />
    </div>
  </div>
</template>
