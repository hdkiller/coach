<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top,#174033,transparent_18%),radial-gradient(circle_at_top_right,#1e293b,transparent_24%),linear-gradient(180deg,#050816,#0b1120_40%,#050816)] text-gray-100"
  >
    <div class="mx-auto max-w-6xl px-0 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div
        class="overflow-hidden rounded-none border-y border-white/10 bg-white/5 shadow-sm shadow-black/20 sm:rounded-[2rem] sm:border"
      >
        <div
          class="relative border-b border-white/10 px-4 py-8 sm:px-10 sm:py-14"
          :class="coach.coverImageUrl ? 'bg-cover bg-center' : ''"
          :style="
            coach.coverImageUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(5,8,22,0.45), rgba(5,8,22,0.92)), url(${coach.coverImageUrl})`
                }
              : undefined
          "
        >
          <div
            v-if="!coach.coverImageUrl"
            class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,rgba(5,8,22,0.72),rgba(5,8,22,0.96))]"
          />

          <div class="relative z-10 max-w-3xl space-y-6">
            <div class="flex items-center gap-4">
              <UAvatar
                :src="coach.image || undefined"
                :alt="coach.name"
                size="3xl"
                class="ring-4 ring-emerald-400/20"
              />
              <div>
                <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Join Under This Coach
                </div>
                <div class="mt-2 text-2xl font-black tracking-tight text-white">
                  {{ coach.name }}
                </div>
                <div v-if="coach.brand || coach.headline" class="mt-1 text-sm text-slate-300">
                  {{ coach.brand || coach.headline }}
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h1 class="text-3xl font-black tracking-tight text-white sm:text-5xl">
                {{ joinPage.headline }}
              </h1>
              <p class="max-w-2xl text-base leading-7 text-slate-300">
                {{ joinPage.intro }}
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <UButton
                v-if="canJoinNow"
                color="primary"
                size="xl"
                class="justify-center"
                :loading="joining"
                @click="emit('join')"
              >
                {{ session ? joinPage.ctaLabel : 'Create account to join' }}
              </UButton>
              <UButton
                v-else
                :to="fallbackJoinUrl"
                color="primary"
                size="xl"
                class="justify-center"
              >
                Create your account
              </UButton>
              <UButton
                v-if="!session"
                :to="loginUrl"
                color="neutral"
                variant="outline"
                size="xl"
                class="justify-center"
              >
                Log in instead
              </UButton>
              <UButton
                v-else-if="coach.profileUrl"
                :to="coach.profileUrl"
                color="neutral"
                variant="outline"
                size="xl"
                class="justify-center"
              >
                View coach page
              </UButton>
            </div>

            <div
              v-if="inviteReservedEmail"
              class="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
            >
              This invitation is reserved for {{ inviteReservedEmail }}.
            </div>

            <div
              v-if="!activeInviteAvailable"
              class="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-300"
            >
              {{ joinPage.unavailableMessage }}
            </div>
          </div>
        </div>

        <div
          class="grid gap-6 px-0 py-6 sm:px-10 sm:py-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]"
        >
          <div class="space-y-6">
            <section
              class="rounded-none border-y border-white/10 bg-[#0f172a]/85 p-5 shadow-sm shadow-black/30 sm:rounded-[1.8rem] sm:border sm:p-6"
            >
              <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                {{ joinPage.welcomeTitle }}
              </div>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div
                class="prose prose-invert mt-4 max-w-none prose-p:text-slate-300 prose-strong:text-white prose-headings:text-white prose-li:text-slate-300"
                v-html="welcomeHtml"
              />
            </section>

            <section
              class="rounded-none border-y border-white/10 bg-[#0f172a]/85 p-5 shadow-sm shadow-black/30 sm:rounded-[1.8rem] sm:border sm:p-6"
            >
              <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                What happens next
              </div>
              <div class="mt-5 grid gap-4 md:grid-cols-3">
                <div
                  v-for="(step, index) in joinPage.steps"
                  :key="step.id"
                  class="rounded-[1.2rem] border border-white/10 bg-black/20 p-4 sm:rounded-[1.4rem] sm:p-5"
                >
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Step {{ index + 1 }}
                  </div>
                  <div class="mt-3 text-lg font-semibold text-white">{{ step.title }}</div>
                  <p class="mt-3 text-sm leading-6 text-slate-300">{{ step.description }}</p>
                </div>
              </div>
            </section>

            <section
              v-if="joinPage.faq.length"
              class="rounded-none border-y border-white/10 bg-[#0f172a]/85 p-5 shadow-sm shadow-black/30 sm:rounded-[1.8rem] sm:border sm:p-6"
            >
              <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">FAQ</div>
              <div class="mt-5 space-y-3">
                <div
                  v-for="item in joinPage.faq"
                  :key="item.id"
                  class="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div class="text-base font-semibold text-white">{{ item.question }}</div>
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div
                    class="prose prose-invert mt-3 max-w-none prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300 prose-img:my-6 prose-img:rounded-2xl prose-img:border prose-img:border-white/10 prose-img:shadow-sm prose-img:shadow-black/30"
                    v-html="renderSafeMarkdown(item.answer)"
                  />
                </div>
              </div>
            </section>
          </div>

          <div class="space-y-6">
            <section
              class="rounded-none border-y border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(15,23,42,0.96))] p-5 shadow-sm shadow-black/30 sm:rounded-[1.8rem] sm:border sm:p-6"
            >
              <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                {{ joinPage.trustTitle }}
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-300">{{ joinPage.trustNote }}</p>

              <div class="mt-5 space-y-4">
                <div
                  v-if="proof.specialties.length"
                  class="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Specialties
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span
                      v-for="item in proof.specialties.slice(0, 6)"
                      :key="item"
                      class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200"
                    >
                      {{ item }}
                    </span>
                  </div>
                </div>

                <div
                  v-if="proof.credentials.length"
                  class="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Credentials
                  </div>
                  <div class="mt-3 space-y-2">
                    <div
                      v-for="credential in proof.credentials.slice(0, 4)"
                      :key="credential"
                      class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200"
                    >
                      {{ credential }}
                    </div>
                  </div>
                </div>

                <div
                  v-if="proof.testimonial"
                  class="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4"
                >
                  <div
                    class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80"
                  >
                    Social proof
                  </div>
                  <blockquote class="mt-3 text-sm leading-7 text-slate-200">
                    “{{ proof.testimonial.quote }}”
                  </blockquote>
                  <div class="mt-3 text-sm font-semibold text-white">
                    {{ proof.testimonial.authorName }}
                  </div>
                  <div v-if="proof.testimonial.authorRole" class="text-xs text-slate-400">
                    {{ proof.testimonial.authorRole }}
                  </div>
                </div>
              </div>
            </section>

            <section
              class="rounded-none border-y border-white/10 bg-[#0f172a]/85 p-5 shadow-sm shadow-black/30 sm:rounded-[1.8rem] sm:border sm:p-6"
            >
              <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Ready to continue?
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-300">
                {{
                  session
                    ? 'You are signed in. Finish the connection when you are ready.'
                    : 'Create your Coach Watts account or log back in, then come right back here to finish joining.'
                }}
              </p>
              <div class="mt-5 flex flex-col gap-3">
                <UButton
                  v-if="canJoinNow"
                  color="primary"
                  size="lg"
                  class="justify-center"
                  :loading="joining"
                  @click="emit('join')"
                >
                  {{ session ? joinPage.ctaLabel : 'Create account to join' }}
                </UButton>
                <UButton
                  v-else
                  :to="fallbackJoinUrl"
                  color="primary"
                  size="lg"
                  class="justify-center"
                >
                  Create your account
                </UButton>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { renderSafeMarkdown } from '~/utils/publicRichText'

  const props = defineProps<{
    coach: {
      name: string
      image?: string | null
      brand?: string | null
      headline?: string | null
      coverImageUrl?: string | null
      profileUrl?: string | null
    }
    joinPage: {
      headline: string
      intro: string
      ctaLabel: string
      welcomeTitle: string
      welcomeBody?: string | null
      trustTitle: string
      trustNote: string
      unavailableMessage: string
      steps: Array<{ id: string; title: string; description: string }>
      faq: Array<{ id: string; question: string; answer: string }>
    }
    proof: {
      specialties: string[]
      credentials: string[]
      testimonial?: {
        quote: string
        authorName: string
        authorRole?: string | null
      } | null
    }
    activeInviteAvailable: boolean
    session?: any
    joining?: boolean
    inviteReservedEmail?: string | null
    signupUrl: string
    loginUrl: string
  }>()

  const emit = defineEmits<{
    join: []
  }>()

  const welcomeHtml = computed(() => renderSafeMarkdown(props.joinPage.welcomeBody || ''))
  const canJoinNow = computed(() => Boolean(props.activeInviteAvailable))
  const fallbackJoinUrl = computed(() => props.signupUrl)
</script>
