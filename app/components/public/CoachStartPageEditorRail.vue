<template>
  <USlideover
    :open="open"
    side="right"
    :ui="{ content: 'w-full max-w-[88rem]' }"
    @update:open="emit('close')"
  >
    <template #content>
      <div class="flex h-full flex-col">
        <div class="border-b border-default/70 px-5 py-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-highlighted">Edit Coach Start Page</h3>
              <p class="mt-1 text-sm text-muted">
                Shape the intake flow athletes see before they request to work with you.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="emit('close')"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-5">
          <div class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside class="space-y-4">
              <section class="rounded-3xl border border-default/70 bg-default p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      Sections
                    </div>
                    <p class="mt-1 text-sm text-muted">
                      Hero stays fixed. The rest can be reordered and hidden.
                    </p>
                  </div>
                  <UBadge color="neutral" variant="soft">{{ enabledSectionCount }} visible</UBadge>
                </div>

                <div class="mt-4 space-y-2">
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition"
                    :class="sectionButtonClass(heroSection?.id)"
                    @click="selectSection(heroSection?.id)"
                  >
                    <UIcon name="i-heroicons-sparkles" class="h-5 w-5 shrink-0 text-primary" />
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-semibold text-highlighted">Hero</div>
                      <div class="text-xs text-muted">Required section</div>
                    </div>
                    <UBadge color="primary" variant="soft">Locked</UBadge>
                  </button>
                </div>

                <draggable
                  v-model="reorderableSections"
                  item-key="id"
                  handle=".drag-handle"
                  class="mt-3 space-y-2"
                >
                  <template #item="{ element }">
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition"
                      :class="sectionButtonClass(element.id)"
                      @click="selectSection(element.id)"
                    >
                      <UIcon
                        name="i-heroicons-bars-3"
                        class="drag-handle h-5 w-5 shrink-0 cursor-move text-muted"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-semibold text-highlighted">
                          {{ formatSectionLabel(element.type) }}
                        </div>
                        <div class="text-xs text-muted">
                          {{ element.enabled ? 'Visible on page' : 'Hidden on page' }}
                        </div>
                      </div>
                      <USwitch v-model="element.enabled" @click.stop />
                    </button>
                  </template>
                </draggable>
              </section>
            </aside>

            <section class="space-y-4">
              <div class="rounded-3xl border border-default/70 bg-default p-5">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {{ formatSectionLabel(selectedSection?.type || 'hero') }}
                    </div>
                    <h4 class="mt-1 text-xl font-semibold text-highlighted">
                      {{ selectedSectionTitle }}
                    </h4>
                    <p class="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      {{ selectedSectionHelp }}
                    </p>
                  </div>
                  <UBadge
                    :color="selectedSection?.enabled === false ? 'warning' : 'primary'"
                    variant="soft"
                  >
                    {{ selectedSection?.enabled === false ? 'Hidden' : 'Visible' }}
                  </UBadge>
                </div>

                <div
                  v-if="selectedSection && selectedSection.type !== 'hero'"
                  class="mt-5 grid gap-4 lg:grid-cols-2"
                >
                  <UFormField label="Section headline">
                    <UInput
                      v-model="selectedSection.headline"
                      class="w-full"
                      placeholder="Optional section-specific headline"
                    />
                  </UFormField>
                  <UFormField label="Intro copy">
                    <UInput
                      v-model="selectedSection.intro"
                      class="w-full"
                      placeholder="Optional intro line for this block"
                    />
                  </UFormField>
                </div>

                <div class="mt-6 space-y-6">
                  <template v-if="selectedSection?.type === 'hero'">
                    <div class="grid gap-4 lg:grid-cols-2">
                      <UFormField label="Enable start page">
                        <USwitch v-model="startPage.enabled" />
                      </UFormField>
                      <div />
                      <UFormField label="Start-page headline">
                        <UInput v-model="startPage.settings.headline" class="w-full" />
                      </UFormField>
                      <UFormField label="Hero intro">
                        <UTextarea v-model="startPage.settings.intro" :rows="3" class="w-full" />
                      </UFormField>
                    </div>
                    <UFormField label="Hero image" :error="fieldError('settings.heroImageUrl')">
                      <div class="space-y-4">
                        <div
                          v-if="startHeroImageUrl"
                          class="overflow-hidden rounded-3xl border border-default/70"
                        >
                          <img
                            :src="startHeroImageUrl"
                            :alt="startPage.settings.heroImageAlt || 'Start page hero image'"
                            class="h-48 w-full object-cover"
                          />
                        </div>
                        <div
                          v-else
                          class="rounded-3xl border border-dashed border-default/70 bg-muted/15 px-5 py-8 text-sm text-muted"
                        >
                          Upload a dedicated hero image for the start page, or leave this empty to
                          inherit the main coach cover.
                        </div>
                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <UInput
                            v-model="startHeroImageUrlInput"
                            placeholder="https://example.com/start-hero.jpg"
                            class="w-full"
                          />
                          <div class="flex flex-wrap gap-2">
                            <UButton color="neutral" variant="soft" @click="setStartHeroFromUrl"
                              >Use URL</UButton
                            >
                            <label class="inline-flex">
                              <input
                                class="hidden"
                                type="file"
                                accept="image/*"
                                @change="onStartHeroUpload"
                              />
                              <span class="inline-flex">
                                <UButton color="neutral" variant="outline" :loading="uploading"
                                  >Upload hero</UButton
                                >
                              </span>
                            </label>
                            <UButton
                              v-if="startHeroImageUrl"
                              color="error"
                              variant="ghost"
                              @click="removeStartHeroImage"
                            >
                              Remove
                            </UButton>
                          </div>
                        </div>
                        <UFormField v-if="startHeroImageUrl" label="Hero alt text">
                          <UInput v-model="startPage.settings.heroImageAlt" class="w-full" />
                        </UFormField>
                      </div>
                    </UFormField>
                  </template>

                  <template v-else-if="selectedSection?.type === 'intro'">
                    <UFormField label="Welcome / intro copy">
                      <PublicRichTextEditor
                        v-model="startPage.introBody"
                        placeholder="Explain how you coach, who this is for, and what athletes should know before requesting to work with you."
                      />
                    </UFormField>
                  </template>

                  <template v-else-if="selectedSection?.type === 'expectations'">
                    <div class="space-y-3">
                      <UFormField label="Section label">
                        <UInput
                          v-model="expectationsContent.eyebrow"
                          class="w-full"
                          placeholder="What happens next"
                        />
                      </UFormField>
                      <div class="text-sm text-muted">
                        Keep these three steps simple and confidence-building.
                      </div>
                      <div
                        v-for="(step, index) in startPage.steps"
                        :key="step.id"
                        class="space-y-3 rounded-2xl border border-default/70 p-4"
                      >
                        <div class="text-xs font-black uppercase tracking-[0.18em] text-primary">
                          Step {{ index + 1 }}
                        </div>
                        <UInput v-model="step.title" placeholder="Step title" class="w-full" />
                        <UTextarea
                          v-model="step.description"
                          :rows="2"
                          placeholder="Step description"
                          class="w-full"
                        />
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'proof'">
                    <div class="grid gap-4 lg:grid-cols-2">
                      <UFormField label="Section label">
                        <UInput
                          v-model="proofContent.eyebrow"
                          class="w-full"
                          placeholder="Trust / proof"
                        />
                      </UFormField>
                    </div>
                    <UFormField label="Trust message">
                      <PublicRichTextEditor
                        v-model="proofContent.body"
                        placeholder="Clarify how you work, what happens after approval, and why this request is worth submitting."
                      />
                    </UFormField>
                  </template>

                  <template v-else-if="selectedSection?.type === 'pricing'">
                    <div class="space-y-4">
                      <UFormField label="Top note">
                        <UTextarea
                          v-model="pricingContent.note"
                          :rows="3"
                          class="w-full"
                          placeholder="Optional note above the offers, for example how pricing works or when custom quotes apply."
                        />
                      </UFormField>

                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm text-muted">
                          Show a few clear offers so athletes understand what you sell before they
                          request coaching.
                        </div>
                        <UButton color="neutral" variant="soft" size="sm" @click="addPricingOffer">
                          Add offer
                        </UButton>
                      </div>

                      <div class="space-y-3">
                        <div
                          v-for="offer in pricingContent.offers"
                          :key="offer.id"
                          class="space-y-3 rounded-2xl border border-default/70 p-4"
                        >
                          <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
                            <UInput v-model="offer.name" placeholder="Offer name" class="w-full" />
                            <UInput v-model="offer.priceLabel" placeholder="$180" class="w-full" />
                            <UInput
                              v-model="offer.billingLabel"
                              placeholder="/month"
                              class="w-full"
                            />
                            <label class="flex items-center gap-2 text-sm text-muted">
                              <USwitch
                                :model-value="Boolean(offer.highlighted)"
                                @update:model-value="setHighlightedOffer(offer.id, $event)"
                              />
                              Featured
                            </label>
                          </div>
                          <UTextarea
                            v-model="offer.summary"
                            :rows="2"
                            class="w-full"
                            placeholder="Who this is for and what makes this offer valuable."
                          />
                          <UFormField label="Offer features">
                            <UTextarea
                              v-model="offer.featuresText"
                              :rows="3"
                              class="w-full"
                              placeholder="Monthly plan updates, async feedback, race strategy..."
                              @update:model-value="syncOfferFeatures(offer)"
                            />
                          </UFormField>
                          <div class="grid gap-3 lg:grid-cols-2">
                            <UInput
                              v-model="offer.ctaLabel"
                              placeholder="Optional CTA label"
                              class="w-full"
                            />
                            <UFormField
                              :error="
                                fieldError(
                                  `sections.${startPage.sections.findIndex((section: any) => section.id === selectedSection?.id)}.content.offers.${pricingContent.offers.findIndex((item: any) => item.id === offer.id)}.ctaUrl`
                                )
                              "
                            >
                              <UInput
                                v-model="offer.ctaUrl"
                                placeholder="Optional external CTA URL"
                                class="w-full"
                              />
                            </UFormField>
                          </div>
                          <div class="flex justify-end">
                            <UButton
                              color="error"
                              variant="ghost"
                              size="sm"
                              @click="removePricingOffer(offer.id)"
                            >
                              Remove offer
                            </UButton>
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="!pricingContent.offers.length"
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                      >
                        Add 1-3 offers so serious athletes understand your pricing before they
                        request coaching.
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'noCommitment'">
                    <div class="space-y-4">
                      <UFormField label="Reassurance copy">
                        <PublicRichTextEditor
                          v-model="noCommitmentContent.body"
                          placeholder="Make it clear that submitting a request is free, non-binding, and simply the first conversation."
                        />
                      </UFormField>
                      <UFormField label="Reassurance bullets">
                        <UTextarea
                          v-model="noCommitmentBulletsText"
                          :rows="4"
                          class="w-full"
                          placeholder="Submitting a request is free, No payment is taken upfront, No obligation to continue..."
                        />
                      </UFormField>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'faq'">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm text-muted">
                        Answer the practical objections athletes have before they commit.
                      </div>
                      <UButton color="neutral" variant="soft" size="sm" @click="addFaqItem"
                        >Add question</UButton
                      >
                    </div>
                    <div class="space-y-3">
                      <div
                        v-for="item in startPage.faq"
                        :key="item.id"
                        class="space-y-3 rounded-2xl border border-default/70 p-4"
                      >
                        <UInput v-model="item.question" placeholder="Question" class="w-full" />
                        <PublicRichTextEditor
                          v-model="item.answer"
                          placeholder="Answer this question directly."
                        />
                        <div class="flex justify-end">
                          <UButton
                            color="error"
                            variant="ghost"
                            size="sm"
                            @click="removeFaqItem(item.id)"
                            >Remove</UButton
                          >
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'intakeForm'">
                    <div class="grid gap-4 lg:grid-cols-2">
                      <UFormField label="Form title">
                        <UInput v-model="startPage.form.title" class="w-full" />
                      </UFormField>
                      <UFormField label="Submit label">
                        <UInput v-model="startPage.settings.submitLabel" class="w-full" />
                      </UFormField>
                      <UFormField label="Login / signup label">
                        <UInput v-model="startPage.settings.loginLabel" class="w-full" />
                      </UFormField>
                      <UFormField label="Success title">
                        <UInput v-model="startPage.settings.successTitle" class="w-full" />
                      </UFormField>
                      <UFormField label="Form intro" class="lg:col-span-2">
                        <UTextarea v-model="startPage.form.intro" :rows="3" class="w-full" />
                      </UFormField>
                      <UFormField label="Success message" class="lg:col-span-2">
                        <UTextarea
                          v-model="startPage.settings.successMessage"
                          :rows="3"
                          class="w-full"
                        />
                      </UFormField>
                    </div>

                    <div class="mt-4 flex items-center justify-between gap-3">
                      <div class="text-sm text-muted">
                        Keep the form short. A few strong questions work best.
                      </div>
                      <UButton color="neutral" variant="soft" size="sm" @click="addFormField"
                        >Add field</UButton
                      >
                    </div>

                    <div class="space-y-3">
                      <div
                        v-for="field in startPage.form.fields"
                        :key="field.id"
                        class="space-y-3 rounded-2xl border border-default/70 p-4"
                      >
                        <div class="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
                          <USelect v-model="field.type" :items="fieldTypeOptions" class="w-full" />
                          <UInput
                            v-model="field.label"
                            placeholder="Question label"
                            class="w-full"
                          />
                          <label class="flex items-center gap-2 text-sm text-muted">
                            <USwitch v-model="field.required" />
                            Required
                          </label>
                        </div>
                        <div class="grid gap-3 lg:grid-cols-2">
                          <UInput
                            v-model="field.placeholder"
                            placeholder="Placeholder (optional)"
                            class="w-full"
                          />
                          <UInput
                            v-model="field.helpText"
                            placeholder="Help text (optional)"
                            class="w-full"
                          />
                        </div>
                        <div v-if="field.type === 'singleSelect'" class="space-y-2">
                          <div class="flex items-center justify-between gap-3">
                            <div class="text-sm text-muted">Options</div>
                            <UButton
                              color="neutral"
                              variant="soft"
                              size="xs"
                              @click="addFieldOption(field)"
                              >Add option</UButton
                            >
                          </div>
                          <div
                            v-for="option in field.options"
                            :key="option.id"
                            class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <UInput v-model="option.label" placeholder="Label" class="w-full" />
                            <UInput v-model="option.value" placeholder="Value" class="w-full" />
                            <UButton
                              color="error"
                              variant="ghost"
                              icon="i-heroicons-trash"
                              @click="removeFieldOption(field, option.id)"
                            />
                          </div>
                        </div>
                        <div
                          v-else-if="field.type === 'yesNo'"
                          class="rounded-2xl border border-default/70 bg-muted/15 px-4 py-3 text-sm text-muted"
                        >
                          Yes / no options are shown automatically on the page.
                        </div>
                        <div class="flex justify-end">
                          <UButton
                            color="error"
                            variant="ghost"
                            size="sm"
                            @click="removeFormField(field.id)"
                            >Remove field</UButton
                          >
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'footerCta'">
                    <div class="space-y-3">
                      <UFormField label="Button label">
                        <UInput
                          v-model="footerCtaContent.buttonLabel"
                          class="w-full"
                          placeholder="Start here"
                        />
                      </UFormField>
                    </div>
                  </template>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="border-t border-default/70 px-5 py-4">
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="emit('close')">Close</UButton>
            <UButton color="primary" :loading="saving" @click="emit('save')">Save changes</UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'
  import PublicRichTextEditor from './PublicRichTextEditor.vue'

  const props = defineProps<{
    open: boolean
    saving?: boolean
    uploading?: boolean
    validationErrors?: Record<string, string>
  }>()

  const emit = defineEmits<{
    close: []
    save: []
    uploadHero: [file: File]
  }>()

  const startPage = defineModel<any>('startPage', { required: true })
  const selectedSectionId = ref<string | null>(null)

  const fieldTypeOptions = [
    { label: 'Short text', value: 'shortText' },
    { label: 'Long text', value: 'longText' },
    { label: 'Single select', value: 'singleSelect' },
    { label: 'Yes / no', value: 'yesNo' }
  ]

  const heroSection = computed(
    () => startPage.value?.sections?.find((section: any) => section.type === 'hero') || null
  )

  const reorderableSections = computed({
    get: () =>
      [...(startPage.value?.sections || [])]
        .filter((section: any) => section.type !== 'hero')
        .sort((a: any, b: any) => a.order - b.order),
    set: (value) => {
      const hero = startPage.value.sections.find((section: any) => section.type === 'hero')
      startPage.value.sections = [
        { ...hero, order: 0, enabled: true },
        ...value.map((section: any, index: number) => ({ ...section, order: index + 1 }))
      ]
    }
  })

  const selectedSection = computed(() => {
    const fallbackId = heroSection.value?.id || startPage.value?.sections?.[0]?.id || null
    const sectionId = selectedSectionId.value || fallbackId
    return (
      startPage.value?.sections?.find((section: any) => section.id === sectionId) ||
      heroSection.value
    )
  })

  watchEffect(() => {
    if (selectedSection.value && typeof selectedSection.value.content !== 'object') {
      selectedSection.value.content = {}
    }
  })

  watchEffect(() => {
    if (selectedSection.value?.type !== 'pricing') return
    const offers = Array.isArray(selectedSection.value.content?.offers)
      ? selectedSection.value.content.offers
      : []
    for (const offer of offers) {
      if (typeof offer.featuresText !== 'string') {
        offer.featuresText = Array.isArray(offer.features) ? offer.features.join(', ') : ''
      }
    }
  })

  const proofContent = computed({
    get: () =>
      selectedSection.value?.content && typeof selectedSection.value.content === 'object'
        ? selectedSection.value.content
        : { eyebrow: null, body: null },
    set: (value) => {
      if (!selectedSection.value) return
      selectedSection.value.content = value
    }
  })

  const expectationsContent = computed({
    get: () =>
      selectedSection.value?.content && typeof selectedSection.value.content === 'object'
        ? selectedSection.value.content
        : { eyebrow: null },
    set: (value) => {
      if (!selectedSection.value) return
      selectedSection.value.content = value
    }
  })

  const footerCtaContent = computed({
    get: () =>
      selectedSection.value?.content && typeof selectedSection.value.content === 'object'
        ? selectedSection.value.content
        : { buttonLabel: null },
    set: (value) => {
      if (!selectedSection.value) return
      selectedSection.value.content = value
    }
  })

  const pricingContent = computed({
    get: () =>
      selectedSection.value?.content && typeof selectedSection.value.content === 'object'
        ? selectedSection.value.content
        : { note: null, offers: [] },
    set: (value) => {
      if (!selectedSection.value) return
      selectedSection.value.content = value
    }
  })

  const noCommitmentContent = computed({
    get: () =>
      selectedSection.value?.content && typeof selectedSection.value.content === 'object'
        ? selectedSection.value.content
        : { body: null, bullets: [] },
    set: (value) => {
      if (!selectedSection.value) return
      selectedSection.value.content = value
    }
  })

  const noCommitmentBulletsText = computed({
    get: () =>
      (Array.isArray(noCommitmentContent.value.bullets)
        ? noCommitmentContent.value.bullets
        : []
      ).join(', '),
    set: (value: string) => {
      noCommitmentContent.value = {
        ...noCommitmentContent.value,
        bullets: tokenizeList(value)
      }
    }
  })

  const selectedSectionTitle = computed(() => {
    if (!selectedSection.value) return 'Section'
    return selectedSection.value.headline?.trim() || formatSectionLabel(selectedSection.value.type)
  })

  const selectedSectionHelp = computed(() => sectionHelpText(selectedSection.value?.type))
  const enabledSectionCount = computed(
    () => (startPage.value?.sections || []).filter((section: any) => section.enabled).length
  )
  const startHeroImageUrlInput = ref('')
  const startHeroImageUrl = computed(() => startPage.value?.settings?.heroImageUrl || '')

  function formatSectionLabel(type?: string | null) {
    return (
      (
        {
          hero: 'Hero',
          intro: 'Intro',
          expectations: 'What To Expect',
          proof: 'Proof',
          pricing: 'Pricing',
          noCommitment: 'No Commitment',
          faq: 'FAQ',
          intakeForm: 'Intake Form',
          footerCta: 'Final CTA'
        } as Record<string, string>
      )[type || ''] ||
      type ||
      'Section'
    )
  }

  function sectionHelpText(type?: string | null) {
    return (
      (
        {
          hero: 'Lead with the promise of what happens on this page. This is the first conversion moment.',
          intro: 'Explain your coaching philosophy and who should request to work with you.',
          expectations: 'Set the path clearly so athletes know what happens after they submit.',
          proof: 'Use concise trust signals, not filler. This section should reduce hesitation.',
          pricing:
            'Show the offers and price framing that help athletes understand what working with you might look like.',
          noCommitment:
            'Reduce submission anxiety by making it obvious this request is free and non-binding.',
          faq: 'Answer the practical questions athletes ask before they raise their hand.',
          intakeForm:
            'Keep the form short and high-signal. These answers should help you review fit quickly.',
          footerCta: 'Close with a clear nudge that reinforces the next step.'
        } as Record<string, string>
      )[type || ''] || 'Adjust this section to match how you want the flow to feel.'
    )
  }

  function sectionButtonClass(sectionId?: string | null) {
    return sectionId === selectedSection.value?.id
      ? 'border-primary/50 bg-primary/10'
      : 'border-default/70 bg-default hover:border-primary/30 hover:bg-primary/5'
  }

  function selectSection(sectionId?: string | null) {
    selectedSectionId.value = sectionId || null
  }

  function makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  }

  function setStartHeroFromUrl() {
    const value = startHeroImageUrlInput.value.trim()
    if (!value) return
    startPage.value.settings.heroImageUrl = value
    if (!startPage.value.settings.heroImageAlt) {
      startPage.value.settings.heroImageAlt = ''
    }
    startHeroImageUrlInput.value = ''
  }

  function removeStartHeroImage() {
    startPage.value.settings.heroImageUrl = null
    startPage.value.settings.heroImageAlt = null
    startHeroImageUrlInput.value = ''
  }

  function onStartHeroUpload(event: Event) {
    const input = event.target as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) return
    emit('uploadHero', file)
    if (input) input.value = ''
  }

  function addFaqItem() {
    startPage.value.faq.push({
      id: makeId('coach-start-faq'),
      question: '',
      answer: ''
    })
  }

  function removeFaqItem(id: string) {
    startPage.value.faq = startPage.value.faq.filter((item: any) => item.id !== id)
  }

  function addFormField() {
    startPage.value.form.fields.push({
      id: makeId('coach-start-field'),
      type: 'shortText',
      label: '',
      required: false,
      helpText: null,
      placeholder: null,
      options: []
    })
  }

  function removeFormField(id: string) {
    startPage.value.form.fields = startPage.value.form.fields.filter(
      (field: any) => field.id !== id
    )
  }

  function addFieldOption(field: any) {
    field.options ||= []
    field.options.push({
      id: makeId('coach-start-option'),
      label: '',
      value: ''
    })
  }

  function removeFieldOption(field: any, optionId: string) {
    field.options = (field.options || []).filter((option: any) => option.id !== optionId)
  }

  function tokenizeList(value: string) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function addPricingOffer() {
    pricingContent.value = {
      ...pricingContent.value,
      offers: [
        ...(pricingContent.value.offers || []),
        {
          id: makeId('coach-start-offer'),
          name: '',
          priceLabel: '',
          billingLabel: null,
          summary: null,
          features: [],
          featuresText: '',
          ctaLabel: null,
          ctaUrl: null,
          highlighted: !(pricingContent.value.offers || []).length
        }
      ]
    }
  }

  function removePricingOffer(id: string) {
    pricingContent.value = {
      ...pricingContent.value,
      offers: (pricingContent.value.offers || []).filter((offer: any) => offer.id !== id)
    }
  }

  function setHighlightedOffer(id: string, highlighted: boolean) {
    pricingContent.value = {
      ...pricingContent.value,
      offers: (pricingContent.value.offers || []).map((offer: any) => ({
        ...offer,
        highlighted: highlighted ? offer.id === id : false
      }))
    }
  }

  function syncOfferFeatures(offer: any) {
    offer.features = tokenizeList(offer.featuresText || '')
  }

  function fieldError(path: string) {
    return props.validationErrors?.[path]
  }
</script>
