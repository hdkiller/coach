<script setup lang="ts">
  const { formatDate: baseFormatDate, formatDateTime } = useFormat()

  // Public share page - accessible to everyone (authenticated or not)
  definePageMeta({
    layout: 'share'
  })

  const route = useRoute()
  const token = route.params.token as string

  const {
    data: chatData,
    pending: loading,
    error: fetchError
  } = await useFetch<any>(`/api/share/chat/${token}`)

  const error = computed(() => {
    if (fetchError.value) {
      return (
        fetchError.value.data?.message || 'Failed to load chat. The link may be invalid or expired.'
      )
    }
    return null
  })

  // Formatters
  function formatDate(date: string | Date) {
    if (!date) return ''
    return formatDateTime(date, 'EEEE, MMMM d, yyyy')
  }

  const pageTitle = computed(() =>
    chatData.value
      ? `${chatData.value.name || 'Chat'} - Shared Chat | Coach Wattz`
      : 'Shared Chat | Coach Wattz'
  )
  const pageDescription = computed(() => {
    if (chatData.value) {
      const user = chatData.value.user?.name || 'Coach Wattz User'
      return `Check out this AI coaching conversation shared by ${user} on Coach Wattz.`
    }
    return 'View shared AI coaching conversation on Coach Wattz.'
  })

  useHead({
    title: pageTitle,
    meta: [
      { name: 'description', content: pageDescription },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: pageDescription },
      { property: 'og:type', content: 'article' },
      { name: 'twitter:title', content: pageTitle },
      { name: 'twitter:description', content: pageDescription }
    ]
  })
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading shared chat...</p>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 max-w-md mx-auto">
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-12 h-12 text-red-500 mx-auto mb-4"
        />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unavailable</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">{{ error }}</p>
        <UButton to="/" color="primary" variant="solid">Go Home</UButton>
      </div>
    </div>

    <div v-else-if="chatData" class="space-y-6">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center gap-3 mb-4">
          <UAvatar
            :src="chatData.user?.image || undefined"
            :alt="chatData.user?.name || 'User'"
            size="sm"
          />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ chatData.user?.name || 'Coach Wattz User' }}
            </span>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Shared a conversation from {{ formatDate(chatData.createdAt) }}
            </p>
          </div>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ chatData.name || 'AI Coaching Session' }}
        </h1>
      </div>

      <div class="space-y-8 py-4">
        <div v-for="message in chatData.messages" :key="message.id" class="flex flex-col">
          <div
            :class="[
              'flex items-start gap-3 max-w-[90%] sm:max-w-[80%]',
              message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
            ]"
          >
            <UAvatar
              v-if="message.role === 'assistant'"
              src="/media/logo.webp"
              alt="Coach Watts"
              size="sm"
              class="flex-shrink-0 mt-1"
            />
            <UAvatar
              v-else
              :src="chatData.user?.image || undefined"
              :alt="chatData.user?.name || 'User'"
              size="sm"
              class="flex-shrink-0 mt-1"
            />

            <div
              :class="[
                'p-4 rounded-2xl text-sm shadow-sm',
                message.role === 'user'
                  ? 'bg-primary-500 text-white rounded-tr-none'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-tl-none'
              ]"
            >
              <ChatMessageContent
                :message="message"
                :show-tools="false"
                :show-charts="false"
                :show-approvals="false"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
