<template>
  <div class="py-24 sm:py-32">
    <UContainer>
      <div class="mx-auto max-w-2xl text-center mb-16">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {{ t('title') }}
        </h1>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
          {{ t('subtitle') }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <!-- Community Support -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-simple-icons-discord" class="w-8 h-8 text-[#5865F2]" />
              <h2 class="text-xl font-semibold">{{ t('community.title') }}</h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300 mb-6">{{ t('community.desc') }}</p>

          <template #footer>
            <UButton
              to="https://discord.gg/dPYkzg49T9"
              target="_blank"
              color="primary"
              variant="solid"
              block
              icon="i-simple-icons-discord"
            >
              {{ t('community.btn') }}
            </UButton>
          </template>
        </UCard>

        <!-- GitHub Issues -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-simple-icons-github" class="w-8 h-8 text-gray-900 dark:text-white" />
              <h2 class="text-xl font-semibold">{{ t('github.title') }}</h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300 mb-6">{{ t('github.desc') }}</p>

          <template #footer>
            <UButton
              to="https://github.com/newpush/coach/issues"
              target="_blank"
              color="neutral"
              variant="solid"
              block
              icon="i-simple-icons-github"
            >
              {{ t('github.btn') }}
            </UButton>
          </template>
        </UCard>

        <!-- Email Support -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-envelope" class="w-8 h-8 text-primary-500" />
              <h2 class="text-xl font-semibold">{{ t('email.title') }}</h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300 mb-6">{{ t('email.desc') }}</p>

          <template #footer>
            <UButton
              to="mailto:support@coachwatts.com"
              color="neutral"
              variant="solid"
              block
              icon="i-heroicons-envelope"
            >
              {{ t('email.btn') }}
            </UButton>
          </template>
        </UCard>
      </div>

      <!-- Contact Form -->
      <div class="mt-16 max-w-6xl mx-auto">
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-chat-bubble-left-right" class="w-8 h-8 text-primary-500" />
              <h2 class="text-xl font-semibold">{{ t('form.title') }}</h2>
            </div>
          </template>

          <UForm :state="form" class="grid grid-cols-1 md:grid-cols-2 gap-6" @submit="sendMessage">
            <template v-if="!isAuthenticated">
              <UFormField :label="t('form.name')" name="name" required class="col-span-1">
                <UInput
                  v-model="form.name"
                  :placeholder="t('form.name_placeholder')"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('form.email')" name="email" required class="col-span-1">
                <UInput
                  v-model="form.email"
                  type="email"
                  placeholder="your@email.com"
                  class="w-full"
                />
              </UFormField>
            </template>
            <template v-else>
              <div class="col-span-1 md:col-span-2">
                <p class="text-sm text-gray-500">
                  {{ t('form.sending_as') }} <strong>{{ user?.name || user?.email }}</strong>
                </p>
              </div>
            </template>

            <UFormField
              :label="t('form.subject')"
              name="subject"
              required
              class="col-span-1 md:col-span-2"
            >
              <UInput
                v-model="form.subject"
                :placeholder="t('form.subject_placeholder')"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('form.message')"
              name="message"
              required
              class="col-span-1 md:col-span-2"
            >
              <UTextarea
                v-model="form.message"
                :rows="5"
                :placeholder="t('form.message_placeholder')"
                class="w-full"
              />
            </UFormField>

            <div class="col-span-1 md:col-span-2 flex justify-end">
              <UButton type="submit" :loading="loading" color="primary" size="lg">
                {{ t('form.submit') }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('support')
  function translate(key: string): string {
    return (t.value as (key: string) => string)(key)
  }
  const { status, data: session } = useAuth()
  const isAuthenticated = computed(() => status.value === 'authenticated')
  const user = computed(() => session.value?.user)
  const toast = useToast()

  const loading = ref(false)
  const form = reactive({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  async function sendMessage() {
    if (!isAuthenticated.value && (!form.name || !form.email)) {
      toast.add({ title: translate('toast.missing_fields'), color: 'error' })
      return
    }
    if (!form.subject || !form.message) {
      toast.add({ title: translate('toast.missing_content'), color: 'error' })
      return
    }

    loading.value = true
    try {
      await $fetch('/api/support/send', {
        method: 'POST',
        body: form
      })
      toast.add({ title: translate('toast.success'), color: 'success' })
      form.subject = ''
      form.message = ''
      if (!isAuthenticated.value) {
        form.name = ''
        form.email = ''
      }
    } catch (error: any) {
      toast.add({
        title: translate('toast.error'),
        description: error.message || 'Unknown error',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

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
