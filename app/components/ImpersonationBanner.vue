<template>
  <div
    v-if="isImpersonating"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-yellow-500 text-black py-2 px-4 rounded-full shadow-xl flex items-center gap-4 border border-black/10 whitespace-nowrap"
  >
    <div class="flex items-center gap-2 text-sm font-medium">
      <UIcon name="i-heroicons-eye" class="w-5 h-5" />
      <span>
        {{ t('impersonation_banner_active', { email: impersonatedUserEmail }) }}
      </span>
    </div>
    <div class="flex items-center gap-4">
      <UButton
        color="neutral"
        variant="solid"
        size="xs"
        :label="t('banner_exit')"
        :loading="stopping"
        @click="stopImpersonation"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('common')
  const { data, refresh } = useAuth()
  const toast = useToast()
  const stopping = ref(false)

  const impersonationMeta = useCookie<{
    adminId: string
    adminEmail: string
    impersonatedUserId: string
    impersonatedUserEmail: string
  }>('auth.impersonation_meta')

  const isImpersonating = computed(() => !!impersonationMeta.value)
  const impersonatedUserEmail = computed(() => impersonationMeta.value?.impersonatedUserEmail)
  const originalUserEmail = computed(() => impersonationMeta.value?.adminEmail)

  async function stopImpersonation() {
    stopping.value = true
    try {
      await $fetch('/api/admin/stop-impersonation', { method: 'POST' })
      toast.add({
        title: t.value('impersonation_toast_stopped_title'),
        description: t.value('impersonation_toast_stopped_description'),
        color: 'success'
      })

      // Wait a tiny bit for the toast to be seen, then hard reload back to users list
      setTimeout(() => {
        window.location.href = '/admin/users'
      }, 500)
    } catch (error) {
      console.error('Failed to stop impersonation:', error)
      toast.add({
        title: t.value('impersonation_toast_error_title'),
        description: t.value('impersonation_toast_error_description'),
        color: 'error'
      })
    } finally {
      stopping.value = false
    }
  }
</script>
