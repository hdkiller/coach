<template>
  <section
    v-if="contactMethods.length || hasForm || ownerMode"
    class="rounded-none border-y border-white/10 bg-[#0f172a]/85 p-5 shadow-sm shadow-black/30 backdrop-blur sm:rounded-[2rem] sm:border sm:p-6"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="max-w-3xl">
        <h2 class="text-2xl font-black tracking-tight text-white">{{ title }}</h2>
        <p v-if="intro" class="mt-3 text-sm leading-7 text-slate-400">{{ intro }}</p>
      </div>
      <UBadge v-if="hasForm" color="primary" variant="soft">Email form available</UBadge>
    </div>

    <div
      class="mt-6 grid gap-5"
      :class="hasForm ? 'xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]' : ''"
    >
      <div class="space-y-3">
        <div v-if="contactMethods.length" class="grid gap-3">
          <a
            v-for="method in contactMethods"
            :key="method.id"
            :href="resolveMethodHref(method)"
            :target="method.type === 'link' ? '_blank' : undefined"
            :rel="method.type === 'link' ? 'noopener noreferrer' : undefined"
            class="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 transition hover:border-emerald-400/30 hover:bg-white/[0.08]"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"
            >
              <UIcon :name="iconForMethod(method.type)" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-white">
                {{ method.label || defaultMethodLabel(method.type) }}
              </div>
              <div class="truncate text-sm text-slate-300">{{ method.value }}</div>
            </div>
          </a>
        </div>

        <div
          v-else-if="ownerMode"
          class="rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400"
        >
          Add a phone number, booking link, or direct email so visitors can contact you immediately.
        </div>
      </div>

      <div
        v-if="hasForm"
        class="rounded-[1.7rem] border border-emerald-400/15 bg-emerald-400/5 p-5"
      >
        <div class="max-w-2xl">
          <div class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
            Contact form
          </div>
          <h3 class="mt-2 text-xl font-black tracking-tight text-white">
            {{ formTitle }}
          </h3>
          <p v-if="formIntro" class="mt-2 text-sm leading-7 text-slate-300">{{ formIntro }}</p>
        </div>

        <div class="mt-5 space-y-4">
          <input
            v-model="formState.website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            class="pointer-events-none absolute opacity-0"
            aria-hidden="true"
          />
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="Name">
              <UInput v-model="formState.name" class="w-full" placeholder="Your name" />
            </UFormField>
            <UFormField label="Email" required>
              <UInput
                v-model="formState.email"
                type="email"
                class="w-full"
                placeholder="your@email.com"
              />
            </UFormField>
          </div>

          <UFormField label="Subject">
            <UInput v-model="formState.subject" class="w-full" placeholder="How can I help?" />
          </UFormField>

          <UFormField label="Message" required>
            <UTextarea
              v-model="formState.message"
              :rows="6"
              class="w-full"
              placeholder="Tell me a little about your goals, timeline, and what you need help with."
            />
          </UFormField>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-slate-400">Your email is required so the coach can reply.</p>
            <UButton color="primary" :loading="sending" @click="submitForm">
              {{ submitLabel }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      role: 'coach' | 'athlete'
      slug: string
      title?: string
      intro?: string | null
      content?: Record<string, any> | null
      ownerMode?: boolean
    }>(),
    {
      title: 'Contact',
      intro: null,
      content: () => ({}),
      ownerMode: false
    }
  )

  const toast = useToast()
  const sending = ref(false)
  const formState = reactive({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: ''
  })

  const normalizedContent = computed(() => ({
    methods: Array.isArray(props.content?.methods) ? props.content.methods : [],
    formEnabled: Boolean(props.content?.formEnabled),
    formTitle: typeof props.content?.formTitle === 'string' ? props.content.formTitle : null,
    formIntro: typeof props.content?.formIntro === 'string' ? props.content.formIntro : null,
    submitLabel: typeof props.content?.submitLabel === 'string' ? props.content.submitLabel : null
  }))

  const contactMethods = computed(() =>
    normalizedContent.value.methods.filter((item: any) => item?.value)
  )
  const hasForm = computed(() => normalizedContent.value.formEnabled)
  const formTitle = computed(() => normalizedContent.value.formTitle || 'Send a message')
  const formIntro = computed(
    () =>
      normalizedContent.value.formIntro ||
      'Reach out directly and the page owner will get this by email.'
  )
  const submitLabel = computed(() => normalizedContent.value.submitLabel || 'Send message')

  function defaultMethodLabel(type?: string | null) {
    if (type === 'phone') return 'Phone'
    if (type === 'email') return 'Email'
    return 'Link'
  }

  function iconForMethod(type?: string | null) {
    if (type === 'phone') return 'i-heroicons-phone'
    if (type === 'email') return 'i-heroicons-envelope'
    return 'i-heroicons-link'
  }

  function resolveMethodHref(method: any) {
    if (method.type === 'phone') return `tel:${method.value}`
    if (method.type === 'email') return `mailto:${method.value}`
    return method.value
  }

  async function submitForm() {
    if (!formState.email.trim() || !formState.message.trim()) {
      toast.add({
        title: 'Missing fields',
        description: 'Email and message are required for the contact form.',
        color: 'warning'
      })
      return
    }

    sending.value = true
    try {
      await $fetch('/api/public/contact', {
        method: 'POST',
        body: {
          role: props.role,
          slug: props.slug,
          name: formState.name || null,
          email: formState.email.trim(),
          subject: formState.subject || null,
          message: formState.message.trim(),
          website: formState.website || ''
        }
      })

      formState.name = ''
      formState.email = ''
      formState.subject = ''
      formState.message = ''
      formState.website = ''

      toast.add({
        title: 'Message sent',
        description: 'Your message has been sent successfully.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Could not send message',
        description:
          error.data?.message || error.data?.statusMessage || 'Please try again shortly.',
        color: 'error'
      })
    } finally {
      sending.value = false
    }
  }
</script>
