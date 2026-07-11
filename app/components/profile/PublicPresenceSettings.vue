<template>
  <div class="space-y-8">
    <section class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">Coach Profile</h3>
              <p class="mt-1 text-sm text-muted">
                Create a public coach minisite with a strong CTA and curated sections.
              </p>
            </div>
            <UBadge :color="coachProfile.settings.enabled ? 'success' : 'neutral'" variant="soft">
              {{ coachProfile.settings.enabled ? 'Enabled' : 'Disabled' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Enable coach page">
            <USwitch v-model="coachProfile.settings.enabled" />
          </UFormField>

          <UFormField label="Coach slug">
            <UInput
              :model-value="coachProfile.settings.slug ?? undefined"
              placeholder="coach-jane"
              class="w-full"
              @update:model-value="coachProfile.settings.slug = $event ?? null"
            />
          </UFormField>

          <UFormField label="Display name">
            <UInput
              :model-value="coachProfile.settings.displayName ?? undefined"
              placeholder="Coach Jane Doe"
              class="w-full"
              @update:model-value="coachProfile.settings.displayName = $event ?? null"
            />
          </UFormField>

          <UFormField label="Headline">
            <UInput
              :model-value="coachProfile.settings.headline ?? undefined"
              placeholder="Helping busy athletes train with clarity."
              class="w-full"
              @update:model-value="coachProfile.settings.headline = $event ?? null"
            />
          </UFormField>

          <UFormField label="Brand">
            <UInput
              :model-value="coachProfile.settings.coachingBrand ?? undefined"
              placeholder="Summit Endurance"
              class="w-full"
              @update:model-value="coachProfile.settings.coachingBrand = $event ?? null"
            />
          </UFormField>

          <UFormField
            label="Primary CTA URL"
            help="Optional. Leave empty to hide the button for now."
            :error="coachErrors['settings.ctaUrl']"
          >
            <UInput
              :model-value="coachProfile.settings.ctaUrl ?? undefined"
              placeholder="https://cal.com/coach-jane"
              class="w-full"
              @update:model-value="coachProfile.settings.ctaUrl = $event ?? null"
            />
          </UFormField>

          <UFormField label="SEO title">
            <UInput
              :model-value="coachProfile.settings.seoTitle ?? undefined"
              placeholder="Coach Jane | Endurance Coaching"
              class="w-full"
              @update:model-value="coachProfile.settings.seoTitle = $event ?? null"
            />
          </UFormField>

          <UFormField label="SEO description">
            <UTextarea
              :model-value="coachProfile.settings.seoDescription ?? undefined"
              :rows="3"
              class="w-full"
              @update:model-value="coachProfile.settings.seoDescription = $event ?? null"
            />
          </UFormField>

          <div class="flex flex-col gap-3">
            <div class="text-xs text-muted">
              {{ coachPreviewUrl || 'Set a slug to generate the public URL.' }}
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <div class="flex gap-2">
                <UButton
                  :to="coachPreviewUrl"
                  variant="outline"
                  color="neutral"
                  class="w-full sm:w-auto justify-center"
                  :disabled="!coachPreviewUrl"
                  target="_blank"
                >
                  Preview
                </UButton>
                <UButton
                  :to="coachEditUrl"
                  color="primary"
                  class="w-full sm:w-auto justify-center"
                  :disabled="!coachPreviewUrl"
                >
                  Edit Page
                </UButton>
              </div>
              <UButton
                color="primary"
                class="w-full sm:w-auto justify-center"
                :loading="savingCoach"
                @click="
                  () => {
                    void saveCoach()
                  }
                "
              >
                Save Coach Settings
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">Coach Start Page</h3>
              <p class="mt-1 text-sm text-muted">
                Configure the public start funnel where athletes request coaching before they sign
                up or log in.
              </p>
            </div>
            <UBadge :color="coachStartPage.enabled ? 'success' : 'neutral'" variant="soft">
              {{ coachStartPage.enabled ? 'Enabled' : 'Disabled' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Enable coach start page">
            <USwitch v-model="coachStartPage.enabled" />
          </UFormField>

          <div class="text-xs text-muted">
            {{ coachStartPreviewUrl || 'Set a coach slug to generate the public start URL.' }}
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div class="flex gap-2">
              <UButton
                :to="coachStartPreviewUrl"
                variant="outline"
                color="neutral"
                class="w-full sm:w-auto justify-center"
                :disabled="!coachStartPreviewUrl"
                target="_blank"
              >
                Preview Start Page
              </UButton>
              <UButton
                :to="coachStartEditUrl"
                color="primary"
                class="w-full sm:w-auto justify-center"
                :disabled="!coachStartPreviewUrl"
              >
                Edit Start Page
              </UButton>
            </div>
            <UButton
              color="primary"
              class="w-full sm:w-auto justify-center"
              :loading="savingCoachStart"
              @click="
                () => {
                  void saveCoachStartPage()
                }
              "
            >
              Save Start Page
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">Direct Invite Page</h3>
              <p class="mt-1 text-sm text-muted">
                Customize the branded page used for raw `/join/:code` coach-generated invite links.
              </p>
            </div>
            <UBadge :color="coachJoinPage.enabled ? 'success' : 'neutral'" variant="soft">
              {{ coachJoinPage.enabled ? 'Enabled' : 'Disabled' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Enable branded direct invite page">
            <USwitch v-model="coachJoinPage.enabled" />
          </UFormField>

          <UFormField label="Join headline">
            <UInput
              :model-value="coachJoinPage.headline ?? undefined"
              placeholder="Join Coach Jane inside Coach Watts"
              class="w-full"
              @update:model-value="coachJoinPage.headline = $event ?? null"
            />
          </UFormField>

          <UFormField label="Join intro">
            <UTextarea
              :model-value="coachJoinPage.intro ?? undefined"
              :rows="3"
              class="w-full"
              placeholder="Explain what athletes are about to do and why this is the right next step."
              @update:model-value="coachJoinPage.intro = $event ?? null"
            />
          </UFormField>

          <UFormField label="CTA label">
            <UInput
              :model-value="coachJoinPage.ctaLabel ?? undefined"
              placeholder="Join this coach"
              class="w-full"
              @update:model-value="coachJoinPage.ctaLabel = $event ?? null"
            />
          </UFormField>

          <UFormField label="Welcome title">
            <UInput
              :model-value="coachJoinPage.welcomeTitle ?? undefined"
              placeholder="What joining means"
              class="w-full"
              @update:model-value="coachJoinPage.welcomeTitle = $event ?? null"
            />
          </UFormField>

          <UFormField label="Welcome copy">
            <PublicRichTextEditor
              v-model="coachJoinPage.welcomeBody"
              placeholder="Explain how athletes will work with you after they join."
            />
          </UFormField>

          <div class="grid gap-4 lg:grid-cols-2">
            <UFormField label="Trust section title">
              <UInput
                :model-value="coachJoinPage.trustTitle ?? undefined"
                placeholder="Why join with confidence"
                class="w-full"
                @update:model-value="coachJoinPage.trustTitle = $event ?? null"
              />
            </UFormField>
            <UFormField label="Trust note">
              <UTextarea
                :model-value="coachJoinPage.trustNote ?? undefined"
                :rows="3"
                class="w-full"
                placeholder="Clarify what joining under this coach means inside Coach Watts."
                @update:model-value="coachJoinPage.trustNote = $event ?? null"
              />
            </UFormField>
          </div>

          <UFormField label="No active invite fallback note">
            <UTextarea
              :model-value="coachJoinPage.unavailableMessage ?? undefined"
              :rows="3"
              class="w-full"
              placeholder="Shown when you preview the page without an active public invite."
              @update:model-value="coachJoinPage.unavailableMessage = $event ?? null"
            />
          </UFormField>

          <div class="space-y-3">
            <div class="text-sm font-semibold text-highlighted">Join steps</div>
            <div
              v-for="(step, index) in coachJoinPage.steps"
              :key="step.id"
              class="rounded-2xl border border-default/70 p-4"
            >
              <div class="text-xs font-black uppercase tracking-[0.18em] text-primary">
                Step {{ index + 1 }}
              </div>
              <div class="mt-3 grid gap-3">
                <UInput v-model="step.title" placeholder="Step title" class="w-full" />
                <UTextarea
                  v-model="step.description"
                  :rows="2"
                  placeholder="Step description"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-highlighted">Join FAQ</div>
                <div class="text-xs text-muted">
                  Reassure athletes before they create an account or connect under you.
                </div>
              </div>
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                @click="
                  () => {
                    void addJoinFaqItem()
                  }
                "
              >
                Add question
              </UButton>
            </div>
            <div
              v-for="item in coachJoinPage.faq"
              :key="item.id"
              class="space-y-3 rounded-2xl border border-default/70 p-4"
            >
              <UInput v-model="item.question" placeholder="Question" class="w-full" />
              <PublicRichTextEditor
                v-model="item.answer"
                placeholder="Answer this question clearly and directly."
              />
              <div class="flex justify-end">
                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  @click="
                    () => {
                      void removeJoinFaqItem(item.id)
                    }
                  "
                >
                  Remove
                </UButton>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div class="text-xs text-muted">
              {{ coachJoinPreviewUrl || 'Set a coach slug to generate the public join URL.' }}
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <UButton
                :to="coachJoinPreviewUrl"
                variant="outline"
                color="neutral"
                class="w-full sm:w-auto justify-center"
                :disabled="!coachJoinPreviewUrl"
                target="_blank"
              >
                Preview Join Page
              </UButton>
              <UButton
                color="primary"
                class="w-full sm:w-auto justify-center"
                :loading="savingCoachJoin"
                @click="
                  () => {
                    void saveCoachJoinPage()
                  }
                "
              >
                Save Join Page
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">Athlete Profile</h3>
              <p class="mt-1 text-sm text-muted">
                Create a separate athlete page focused on story, highlights, and achievements.
              </p>
            </div>
            <UBadge :color="athleteProfile.settings.enabled ? 'success' : 'neutral'" variant="soft">
              {{ athleteProfile.settings.enabled ? 'Enabled' : 'Disabled' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Enable athlete page">
            <USwitch v-model="athleteProfile.settings.enabled" />
          </UFormField>

          <UFormField label="Athlete slug">
            <UInput
              :model-value="athleteProfile.settings.slug ?? undefined"
              placeholder="athlete-jane"
              class="w-full"
              @update:model-value="athleteProfile.settings.slug = $event ?? null"
            />
          </UFormField>

          <UFormField label="Display name">
            <UInput
              :model-value="athleteProfile.settings.displayName ?? undefined"
              placeholder="Jane Doe"
              class="w-full"
              @update:model-value="athleteProfile.settings.displayName = $event ?? null"
            />
          </UFormField>

          <UFormField label="Headline">
            <UInput
              :model-value="athleteProfile.settings.headline ?? undefined"
              placeholder="Marathoner, mountain lover, and consistency nerd."
              class="w-full"
              @update:model-value="athleteProfile.settings.headline = $event ?? null"
            />
          </UFormField>

          <UFormField label="SEO title">
            <UInput
              :model-value="athleteProfile.settings.seoTitle ?? undefined"
              placeholder="Jane Doe | Athlete"
              class="w-full"
              @update:model-value="athleteProfile.settings.seoTitle = $event ?? null"
            />
          </UFormField>

          <UFormField label="SEO description">
            <UTextarea
              :model-value="athleteProfile.settings.seoDescription ?? undefined"
              :rows="3"
              class="w-full"
              @update:model-value="athleteProfile.settings.seoDescription = $event ?? null"
            />
          </UFormField>

          <div class="flex flex-col gap-3">
            <div class="text-xs text-muted">
              {{ athletePreviewUrl || 'Set a slug to generate the public URL.' }}
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <UButton
                :to="athletePreviewUrl"
                variant="outline"
                color="neutral"
                class="w-full sm:w-auto justify-center"
                :disabled="!athletePreviewUrl"
                target="_blank"
              >
                Preview
              </UButton>
              <UButton
                :to="athleteEditUrl"
                color="primary"
                class="w-full sm:w-auto justify-center"
                :disabled="!athletePreviewUrl"
              >
                Edit Page
              </UButton>
              <UButton
                color="primary"
                class="w-full sm:w-auto justify-center"
                :loading="savingAthlete"
                @click="
                  () => {
                    void saveAthlete()
                  }
                "
              >
                Save Athlete Settings
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <UCard>
      <template #header>
        <div>
          <h3 class="text-lg font-semibold text-highlighted">How it works</h3>
          <p class="mt-1 text-sm text-muted">
            Settings decide whether each page is live. Edit mode lets you reorder sections, hide
            blocks, manage media, and shape the page visually.
          </p>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-default/70 bg-muted/10 p-4">
          <div class="text-xs font-black uppercase tracking-[0.2em] text-primary">1. Enable</div>
          <p class="mt-2 text-sm text-muted">
            Turn on the coach and/or athlete presence you actually want to publish.
          </p>
        </div>
        <div class="rounded-2xl border border-default/70 bg-muted/10 p-4">
          <div class="text-xs font-black uppercase tracking-[0.2em] text-primary">2. Edit</div>
          <p class="mt-2 text-sm text-muted">
            Open the public page in edit mode to rearrange sections and update content.
          </p>
        </div>
        <div class="rounded-2xl border border-default/70 bg-muted/10 p-4">
          <div class="text-xs font-black uppercase tracking-[0.2em] text-primary">3. Share</div>
          <p class="mt-2 text-sm text-muted">
            Use the public route directly once the page is ready to go live.
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  import {
    buildDefaultAthletePublicProfile,
    buildDefaultCoachPublicProfile,
    buildPublicAthletePath,
    buildPublicCoachHomePath,
    buildPublicCoachStartPath,
    buildPublicCoachPath
  } from '#shared/public-presence'
  import {
    formatPublicPresenceApiError,
    getFirstValidationMessage,
    validatePublicPresenceSettings
  } from '~/utils/publicPresenceValidation'
  import PublicRichTextEditor from '~/components/public/PublicRichTextEditor.vue'

  const toast = useToast()

  const coachProfile = ref(buildDefaultCoachPublicProfile())
  const athleteProfile = ref(buildDefaultAthletePublicProfile())
  const savingCoach = ref(false)
  const savingCoachStart = ref(false)
  const savingCoachJoin = ref(false)
  const savingAthlete = ref(false)
  const attemptedCoachSave = ref(false)
  const attemptedAthleteSave = ref(false)
  const coachJoinPage = ref(structuredClone(buildDefaultCoachPublicProfile().joinPage))
  const coachStartPage = ref(structuredClone(buildDefaultCoachPublicProfile().startPage))

  const { data: coachData, refresh: refreshCoach } = await useFetch('/api/profile/public/coach', {
    key: 'public-presence-coach'
  })
  const { data: coachJoinData, refresh: refreshCoachJoin } = await useFetch(
    '/api/profile/public/coach/join',
    {
      key: 'public-presence-coach-join'
    }
  )
  const { data: coachStartData, refresh: refreshCoachStart } = await useFetch(
    '/api/profile/public/coach/start',
    {
      key: 'public-presence-coach-start'
    }
  )
  const { data: athleteData, refresh: refreshAthlete } = await useFetch(
    '/api/profile/public/athlete',
    {
      key: 'public-presence-athlete'
    }
  )

  const coachHydrated = ref(false)
  const coachJoinHydrated = ref(false)
  const coachStartHydrated = ref(false)
  const athleteHydrated = ref(false)

  function applyCoachProfileFromServer() {
    if ((coachData.value as any)?.profile) {
      coachProfile.value = structuredClone((coachData.value as any).profile)
      attemptedCoachSave.value = false
    }
  }

  function applyCoachJoinFromServer() {
    if ((coachJoinData.value as any)?.joinPage) {
      coachJoinPage.value = structuredClone((coachJoinData.value as any).joinPage)
    }
  }

  function applyCoachStartFromServer() {
    if ((coachStartData.value as any)?.startPage) {
      coachStartPage.value = structuredClone((coachStartData.value as any).startPage)
    }
  }

  function applyAthleteProfileFromServer() {
    if ((athleteData.value as any)?.profile) {
      athleteProfile.value = structuredClone((athleteData.value as any).profile)
      attemptedAthleteSave.value = false
    }
  }

  watch(
    coachData,
    () => {
      if (!coachHydrated.value && (coachData.value as any)?.profile) {
        applyCoachProfileFromServer()
        coachHydrated.value = true
      }
    },
    { immediate: true }
  )

  watch(
    coachJoinData,
    () => {
      if (!coachJoinHydrated.value && (coachJoinData.value as any)?.joinPage) {
        applyCoachJoinFromServer()
        coachJoinHydrated.value = true
      }
    },
    { immediate: true }
  )

  watch(
    coachStartData,
    () => {
      if (!coachStartHydrated.value && (coachStartData.value as any)?.startPage) {
        applyCoachStartFromServer()
        coachStartHydrated.value = true
      }
    },
    { immediate: true }
  )

  watch(
    athleteData,
    () => {
      if (!athleteHydrated.value && (athleteData.value as any)?.profile) {
        applyAthleteProfileFromServer()
        athleteHydrated.value = true
      }
    },
    { immediate: true }
  )

  const coachErrors = computed(() =>
    attemptedCoachSave.value ? validatePublicPresenceSettings(coachProfile.value, 'coach') : {}
  )
  const athleteErrors = computed(() =>
    attemptedAthleteSave.value
      ? validatePublicPresenceSettings(athleteProfile.value, 'athlete')
      : {}
  )

  const coachPreviewUrl = computed(() => buildPublicCoachPath(coachProfile.value.settings.slug))
  const athletePreviewUrl = computed(() =>
    buildPublicAthletePath(athleteProfile.value.settings.slug)
  )
  const coachEditUrl = computed(() =>
    coachPreviewUrl.value ? `${coachPreviewUrl.value}?edit=1` : undefined
  )
  const coachJoinPreviewUrl = computed(() =>
    buildPublicCoachHomePath(coachProfile.value.settings.slug)
  )
  const coachStartPreviewUrl = computed(() =>
    buildPublicCoachStartPath(coachProfile.value.settings.slug)
  )
  const coachStartEditUrl = computed(() =>
    coachStartPreviewUrl.value ? `${coachStartPreviewUrl.value}?edit=1` : undefined
  )
  const athleteEditUrl = computed(() =>
    athletePreviewUrl.value ? `${athletePreviewUrl.value}?edit=1` : undefined
  )

  function makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  }

  function addJoinFaqItem() {
    coachJoinPage.value.faq.push({
      id: makeId('coach-join-faq'),
      question: '',
      answer: ''
    })
  }

  function removeJoinFaqItem(id: string) {
    coachJoinPage.value.faq = coachJoinPage.value.faq.filter((item: any) => item.id !== id)
  }

  async function saveCoach() {
    attemptedCoachSave.value = true
    if (Object.keys(coachErrors.value).length) {
      toast.add({
        title: 'Check the form',
        description: getFirstValidationMessage(coachErrors.value),
        color: 'warning'
      })
      return
    }

    savingCoach.value = true
    try {
      await $fetch('/api/profile/public/coach', {
        method: 'PATCH',
        body: coachProfile.value
      })
      await refreshCoach()
      applyCoachProfileFromServer()
      attemptedCoachSave.value = false
      toast.add({
        title: 'Coach profile saved',
        description: 'Coach public presence settings are updated.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: formatPublicPresenceApiError(error, 'Could not save the coach profile.'),
        color: 'error'
      })
    } finally {
      savingCoach.value = false
    }
  }

  async function saveAthlete() {
    attemptedAthleteSave.value = true
    if (Object.keys(athleteErrors.value).length) {
      toast.add({
        title: 'Check the form',
        description: getFirstValidationMessage(athleteErrors.value),
        color: 'warning'
      })
      return
    }

    savingAthlete.value = true
    try {
      await $fetch('/api/profile/public/athlete', {
        method: 'PATCH',
        body: athleteProfile.value
      })
      await refreshAthlete()
      applyAthleteProfileFromServer()
      attemptedAthleteSave.value = false
      toast.add({
        title: 'Athlete profile saved',
        description: 'Athlete public presence settings are updated.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: formatPublicPresenceApiError(error, 'Could not save the athlete profile.'),
        color: 'error'
      })
    } finally {
      savingAthlete.value = false
    }
  }

  async function saveCoachJoinPage() {
    savingCoachJoin.value = true
    try {
      await $fetch('/api/profile/public/coach/join', {
        method: 'PATCH',
        body: coachJoinPage.value
      })
      await Promise.all([refreshCoachJoin(), refreshCoach()])
      applyCoachJoinFromServer()
      applyCoachProfileFromServer()
      toast.add({
        title: 'Coach join page saved',
        description: 'Your branded coach join flow is updated.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: formatPublicPresenceApiError(error, 'Could not save the coach join page.'),
        color: 'error'
      })
    } finally {
      savingCoachJoin.value = false
    }
  }

  async function saveCoachStartPage() {
    savingCoachStart.value = true
    try {
      await $fetch('/api/profile/public/coach/start', {
        method: 'PATCH',
        body: coachStartPage.value
      })
      await Promise.all([refreshCoachStart(), refreshCoach()])
      applyCoachStartFromServer()
      applyCoachProfileFromServer()
      toast.add({
        title: 'Coach start page saved',
        description: 'Your request-based coach start page is updated.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: formatPublicPresenceApiError(error, 'Could not save the coach start page.'),
        color: 'error'
      })
    } finally {
      savingCoachStart.value = false
    }
  }
</script>
