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
              <h3 class="text-lg font-semibold text-highlighted">
                Edit {{ role === 'coach' ? 'Coach' : 'Athlete' }} Page
              </h3>
              <p class="mt-1 text-sm text-muted">
                Pick a section, refine the content, and shape the minisite one block at a time.
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
                      Hero stays fixed. Everything else can be reordered and hidden.
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
                      <UFormField label="Display name">
                        <UInput v-model="profile.settings.displayName" class="w-full" />
                      </UFormField>
                      <UFormField label="Headline">
                        <UInput v-model="profile.settings.headline" class="w-full" />
                      </UFormField>
                      <UFormField label="Location">
                        <UInput v-model="profile.settings.location" class="w-full" />
                      </UFormField>
                      <UFormField label="Website" :error="fieldError('settings.websiteUrl')">
                        <UInput v-model="profile.settings.websiteUrl" class="w-full" />
                      </UFormField>
                      <UFormField v-if="role === 'coach'" label="Brand">
                        <UInput v-model="profile.settings.coachingBrand" class="w-full" />
                      </UFormField>
                      <UFormField
                        v-if="role === 'coach'"
                        label="Primary CTA URL"
                        :error="fieldError('settings.ctaUrl')"
                      >
                        <UInput
                          v-model="profile.settings.ctaUrl"
                          class="w-full"
                          placeholder="Leave empty to hide the button"
                        />
                      </UFormField>
                      <UFormField v-if="role === 'athlete'" label="Focus sports">
                        <UTextarea
                          v-model="focusSportsText"
                          :rows="3"
                          class="w-full"
                          placeholder="Marathon, trail, alpine adventure racing..."
                        />
                      </UFormField>
                    </div>

                    <UFormField label="Cover image" :error="coverUrlInputError">
                      <div class="space-y-4">
                        <div
                          v-if="coverImage"
                          class="overflow-hidden rounded-3xl border border-default/70"
                        >
                          <img
                            :src="coverImage.url"
                            :alt="coverImage.alt || 'Cover image'"
                            class="h-48 w-full object-cover"
                          />
                        </div>
                        <div
                          v-else
                          class="rounded-3xl border border-dashed border-default/70 bg-muted/15 px-5 py-8 text-sm text-muted"
                        >
                          Add a cover image to make the hero feel like a real minisite header.
                        </div>
                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <UInput
                            v-model="coverUrlInput"
                            placeholder="https://example.com/cover.jpg"
                            class="w-full"
                          />
                          <div class="flex flex-wrap gap-2">
                            <UButton color="neutral" variant="soft" @click="setCoverFromUrl"
                              >Use URL</UButton
                            >
                            <label class="inline-flex">
                              <input
                                class="hidden"
                                type="file"
                                accept="image/*"
                                @change="onCoverUpload"
                              />
                              <span class="inline-flex">
                                <UButton color="neutral" variant="outline" :loading="uploading"
                                  >Upload cover</UButton
                                >
                              </span>
                            </label>
                            <UButton
                              v-if="coverImage"
                              color="error"
                              variant="ghost"
                              @click="removeCover"
                            >
                              Remove
                            </UButton>
                          </div>
                        </div>
                        <UFormField v-if="coverImage" label="Cover alt text">
                          <UInput v-model="coverImage.alt" class="w-full" />
                        </UFormField>
                      </div>
                    </UFormField>
                  </template>

                  <template
                    v-else-if="
                      selectedSection?.type === 'about' || selectedSection?.type === 'story'
                    "
                  >
                    <UFormField :label="role === 'coach' ? 'About / philosophy' : 'Story'">
                      <PublicRichTextEditor
                        v-model="profile.settings.bio"
                        :placeholder="
                          role === 'coach'
                            ? 'Explain how you coach, who you help, and what athletes can expect.'
                            : 'Tell your story, what drives you, and what this page should say about you.'
                        "
                      />
                    </UFormField>
                  </template>

                  <template v-else-if="selectedSection?.type === 'credibility'">
                    <div class="grid gap-4 lg:grid-cols-2">
                      <UFormField label="Section label">
                        <UInput
                          v-model="credibilityContent.eyebrow"
                          class="w-full"
                          placeholder="Proof points"
                        />
                      </UFormField>
                      <UFormField label="Spotlight title">
                        <UInput
                          v-model="credibilityContent.spotlightTitle"
                          class="w-full"
                          placeholder="Why this coach stands out"
                        />
                      </UFormField>
                    </div>
                    <UFormField label="Spotlight note">
                      <PublicRichTextEditor
                        v-model="credibilityContent.spotlightBody"
                        placeholder="Use this space to frame your coaching philosophy, athlete fit, or what makes your offer feel credible."
                      />
                    </UFormField>
                    <div class="grid gap-4 lg:grid-cols-2">
                      <UFormField label="Specialties">
                        <UTextarea
                          v-model="specialtiesText"
                          :rows="4"
                          class="w-full"
                          placeholder="Use the sports, goals, and coaching problems athletes actually search for."
                        />
                      </UFormField>
                      <UFormField label="Credentials">
                        <UTextarea
                          v-model="credentialsText"
                          :rows="4"
                          class="w-full"
                          placeholder="Certifications, education, years of experience, or notable background."
                        />
                      </UFormField>
                    </div>
                    <UFormField label="Trust bullets">
                      <UTextarea
                        v-model="credibilityTrustBulletsText"
                        :rows="4"
                        class="w-full"
                        placeholder="One line per proof point or reassurance, like response style, athlete fit, or coaching approach."
                      />
                    </UFormField>
                    <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                      <label
                        class="flex items-center justify-between gap-3 rounded-2xl border border-default/70 px-4 py-3 text-sm"
                      >
                        <span class="font-medium text-highlighted">Show spotlight</span>
                        <USwitch v-model="credibilityContent.showSpotlight" />
                      </label>
                      <label
                        class="flex items-center justify-between gap-3 rounded-2xl border border-default/70 px-4 py-3 text-sm"
                      >
                        <span class="font-medium text-highlighted">Show specialties</span>
                        <USwitch v-model="credibilityContent.showSpecialties" />
                      </label>
                      <label
                        class="flex items-center justify-between gap-3 rounded-2xl border border-default/70 px-4 py-3 text-sm"
                      >
                        <span class="font-medium text-highlighted">Show credentials</span>
                        <USwitch v-model="credibilityContent.showCredentials" />
                      </label>
                      <label
                        class="flex items-center justify-between gap-3 rounded-2xl border border-default/70 px-4 py-3 text-sm"
                      >
                        <span class="font-medium text-highlighted">Show social proof</span>
                        <USwitch v-model="credibilityContent.showSocialProof" />
                      </label>
                    </div>
                    <div
                      class="rounded-2xl border border-default/70 bg-muted/15 px-4 py-3 text-sm text-muted"
                    >
                      Keep this section focused on trust signals. A few strong specialties, real
                      credentials, a positioning note, and 1-3 short testimonials work best.
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'specialties'">
                    <UFormField label="Specialties">
                      <UTextarea
                        v-model="specialtiesText"
                        :rows="4"
                        class="w-full"
                        placeholder="Marathon build, trail racing, hybrid strength, first-time 70.3..."
                      />
                    </UFormField>
                  </template>

                  <template v-else-if="selectedSection?.type === 'credentials'">
                    <UFormField label="Credentials">
                      <UTextarea
                        v-model="credentialsText"
                        :rows="4"
                        class="w-full"
                        placeholder="USAT Level 2, MSc Exercise Physiology, 10+ years coaching..."
                      />
                    </UFormField>
                  </template>

                  <template v-else-if="selectedSection?.type === 'faq'">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm text-muted">
                        Answer the questions athletes ask before they reach out.
                      </div>
                      <UButton color="neutral" variant="soft" size="sm" @click="addFaqItem">
                        Add question
                      </UButton>
                    </div>
                    <div class="space-y-3">
                      <div
                        v-for="item in faqContent.items"
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
                            @click="removeFaqItem(item.id)"
                          >
                            Remove
                          </UButton>
                        </div>
                      </div>
                      <div
                        v-if="!faqContent.items.length"
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                      >
                        Add common questions about pricing, communication, athlete fit, or how
                        coaching works.
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'testimonials'">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm text-muted">1-3 short athlete quotes work best.</div>
                      <UButton color="neutral" variant="soft" size="sm" @click="addTestimonial">
                        Add testimonial
                      </UButton>
                    </div>
                    <div class="space-y-3">
                      <div
                        v-for="testimonial in profile.testimonials"
                        :key="testimonial.id"
                        class="space-y-3 rounded-2xl border border-default/70 p-4"
                      >
                        <div class="grid gap-3 lg:grid-cols-2">
                          <UInput
                            v-model="testimonial.authorName"
                            placeholder="Author name"
                            class="w-full"
                          />
                          <UInput
                            v-model="testimonial.authorRole"
                            placeholder="Author role"
                            class="w-full"
                          />
                        </div>
                        <UTextarea
                          v-model="testimonial.quote"
                          :rows="3"
                          class="w-full"
                          placeholder="What this person says about your coaching"
                        />
                        <div class="flex justify-end">
                          <UButton
                            color="error"
                            variant="ghost"
                            size="sm"
                            @click="removeTestimonial(testimonial.id)"
                          >
                            Remove
                          </UButton>
                        </div>
                      </div>
                      <div
                        v-if="!profile.testimonials.length"
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                      >
                        Add your first testimonial to strengthen trust.
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'gallery'">
                    <div class="space-y-4">
                      <UFormField label="Gallery image URL" :error="galleryUrlInputError">
                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <UInput
                            v-model="galleryUrlInput"
                            placeholder="https://example.com/gallery.jpg"
                            class="w-full"
                          />
                          <div class="flex flex-wrap gap-2">
                            <UButton color="neutral" variant="soft" @click="addGalleryFromUrl"
                              >Add image</UButton
                            >
                            <label class="inline-flex">
                              <input
                                class="hidden"
                                type="file"
                                accept="image/*"
                                @change="onGalleryUpload"
                              />
                              <span class="inline-flex">
                                <UButton color="neutral" variant="outline" :loading="uploading"
                                  >Upload image</UButton
                                >
                              </span>
                            </label>
                          </div>
                        </div>
                      </UFormField>

                      <draggable
                        v-model="galleryMediaModel"
                        item-key="id"
                        handle=".drag-handle"
                        class="space-y-3"
                      >
                        <template #item="{ element, index }">
                          <div class="rounded-2xl border border-default/70 p-3">
                            <div class="flex items-start gap-3">
                              <UIcon
                                name="i-heroicons-bars-3"
                                class="drag-handle mt-1 h-5 w-5 cursor-move text-muted"
                              />
                              <img
                                :src="element.url"
                                :alt="element.alt || 'Gallery image'"
                                class="h-20 w-20 rounded-2xl object-cover"
                              />
                              <div class="min-w-0 flex-1 space-y-3">
                                <div class="grid gap-3 lg:grid-cols-2">
                                  <UInput
                                    v-model="element.alt"
                                    placeholder="Alt text"
                                    class="w-full"
                                  />
                                  <UInput
                                    v-model="element.caption"
                                    placeholder="Caption"
                                    class="w-full"
                                  />
                                </div>
                                <div class="text-xs text-muted">
                                  Image {{ index + 1 }} in the gallery order.
                                </div>
                              </div>
                              <UButton
                                color="error"
                                variant="ghost"
                                icon="i-heroicons-trash"
                                @click="removeMedia(element.id)"
                              />
                            </div>
                          </div>
                        </template>
                      </draggable>

                      <div
                        v-if="!galleryImages.length"
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                      >
                        Add a few polished images that make the page feel alive.
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'videoIntro'">
                    <div class="space-y-4">
                      <UFormField label="YouTube URL" :error="fieldError(videoIntroFieldPath)">
                        <UInput
                          v-model="videoIntroContent.videoUrl"
                          class="w-full"
                          placeholder="https://www.youtube.com/watch?v=..."
                          @blur="normalizeVideoIntroUrl"
                        />
                      </UFormField>
                      <UFormField label="Caption">
                        <UTextarea
                          v-model="videoIntroContent.caption"
                          :rows="3"
                          class="w-full"
                          placeholder="Add a short note about what viewers should take away from this introduction."
                        />
                      </UFormField>
                      <div
                        v-if="videoIntroEmbedUrl"
                        class="overflow-hidden rounded-3xl border border-default/70 bg-black"
                      >
                        <div class="aspect-video w-full">
                          <iframe
                            :src="videoIntroEmbedUrl"
                            title="Video introduction preview"
                            class="h-full w-full"
                            allow="
                              accelerometer;
                              autoplay;
                              clipboard-write;
                              encrypted-media;
                              gyroscope;
                              picture-in-picture;
                              web-share;
                            "
                            allowfullscreen
                          />
                        </div>
                      </div>
                      <div
                        v-else
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                      >
                        Paste a YouTube link to embed a polished video introduction on the public
                        page.
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'featuredPlans'">
                    <div class="space-y-4">
                      <div
                        class="rounded-2xl border border-default/70 bg-muted/15 px-4 py-3 text-sm text-muted"
                      >
                        Choose the plans that best represent how you coach, then add a short note or
                        set the sample week you want visitors to see first.
                      </div>

                      <UFormField label="Search plans">
                        <UInput
                          v-model="planSearchQuery"
                          class="w-full"
                          placeholder="Search by plan name, sport, level, or description"
                        />
                      </UFormField>

                      <div class="space-y-3">
                        <div class="text-xs font-black uppercase tracking-[0.18em] text-muted">
                          Featured on the coach page
                        </div>
                        <draggable
                          v-model="featuredPlanConfigsModel"
                          item-key="planId"
                          handle=".drag-handle"
                          class="space-y-3"
                        >
                          <template #item="{ element }">
                            <div class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                              <div class="flex items-start gap-3">
                                <UIcon
                                  name="i-heroicons-bars-3"
                                  class="drag-handle mt-1 h-5 w-5 cursor-move text-muted"
                                />
                                <div class="min-w-0 flex-1 space-y-4">
                                  <div
                                    class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                                  >
                                    <div class="min-w-0 space-y-2">
                                      <div class="flex flex-wrap gap-2">
                                        <UBadge color="primary" variant="soft" size="sm"
                                          >Featured</UBadge
                                        >
                                        <UBadge color="neutral" variant="soft" size="sm">
                                          {{
                                            formatEnumLabel(
                                              planById(element.planId)?.primarySport
                                            ) || 'Plan'
                                          }}
                                        </UBadge>
                                      </div>
                                      <div class="text-base font-semibold text-highlighted">
                                        {{ planById(element.planId)?.name || 'Selected plan' }}
                                      </div>
                                      <div class="text-sm text-muted">
                                        {{
                                          planById(element.planId)?.publicHeadline ||
                                          planById(element.planId)?.publicDescription ||
                                          'No public summary yet.'
                                        }}
                                      </div>
                                    </div>
                                    <div class="flex gap-2">
                                      <UButton
                                        color="neutral"
                                        variant="outline"
                                        size="sm"
                                        @click="peekPlan(planById(element.planId))"
                                      >
                                        Peek
                                      </UButton>
                                      <UButton
                                        color="error"
                                        variant="ghost"
                                        size="sm"
                                        @click="removeFeaturedPlan(element.planId)"
                                      >
                                        Remove
                                      </UButton>
                                    </div>
                                  </div>

                                  <div class="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                                    <UFormField label="Highlighted sample week">
                                      <USelect
                                        v-model="element.highlightWeekId"
                                        :items="sampleWeekOptions(planById(element.planId))"
                                        class="w-full"
                                      />
                                    </UFormField>
                                    <div class="space-y-2">
                                      <div class="text-sm font-medium text-highlighted">
                                        Coach note
                                      </div>
                                      <PublicRichTextEditor
                                        v-model="element.coachNote"
                                        placeholder="Why is this plan worth featuring? Who is it best for?"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </template>
                        </draggable>

                        <div
                          v-if="!featuredPlanConfigs.length"
                          class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                        >
                          Choose 1-3 featured plans so visitors can quickly understand what you
                          offer.
                        </div>
                      </div>

                      <div class="space-y-3">
                        <div class="text-xs font-black uppercase tracking-[0.18em] text-muted">
                          Browse public plans
                        </div>
                        <div v-if="filteredAvailablePlans.length" class="space-y-3">
                          <div
                            v-for="plan in filteredAvailablePlans"
                            :key="plan.id"
                            class="rounded-2xl border border-default/70 bg-default p-4"
                          >
                            <div
                              class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <div class="min-w-0 space-y-2">
                                <div class="flex flex-wrap gap-2">
                                  <UBadge
                                    :color="isPlanFeatured(plan.id) ? 'primary' : 'neutral'"
                                    variant="soft"
                                    size="sm"
                                  >
                                    {{ isPlanFeatured(plan.id) ? 'Selected' : 'Available' }}
                                  </UBadge>
                                  <UBadge color="neutral" variant="soft" size="sm">
                                    {{ formatEnumLabel(plan.primarySport) || 'Plan' }}
                                  </UBadge>
                                </div>
                                <div class="text-base font-semibold text-highlighted">
                                  {{ plan.name }}
                                </div>
                                <div class="text-sm text-muted">
                                  {{
                                    plan.publicHeadline ||
                                    plan.publicDescription ||
                                    'No public summary yet.'
                                  }}
                                </div>
                                <div class="flex flex-wrap gap-3 text-xs text-muted">
                                  <span>{{ plan.lengthWeeks || 'Flexible' }} weeks</span>
                                  <span>{{
                                    plan.daysPerWeek
                                      ? `${plan.daysPerWeek} days/wk`
                                      : 'Flexible rhythm'
                                  }}</span>
                                  <span>{{
                                    formatEnumLabel(plan.skillLevel) || 'All levels'
                                  }}</span>
                                </div>
                              </div>
                              <div class="flex gap-2">
                                <UButton
                                  color="neutral"
                                  variant="outline"
                                  size="sm"
                                  @click="peekPlan(plan)"
                                >
                                  Peek
                                </UButton>
                                <UButton
                                  :color="isPlanFeatured(plan.id) ? 'neutral' : 'primary'"
                                  :variant="isPlanFeatured(plan.id) ? 'soft' : 'solid'"
                                  size="sm"
                                  @click="toggleFeaturedPlan(plan)"
                                >
                                  {{ isPlanFeatured(plan.id) ? 'Selected' : 'Feature' }}
                                </UButton>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          v-else
                          class="rounded-2xl border border-dashed border-default/70 bg-default px-4 py-8 text-center text-sm text-muted"
                        >
                          No plans match that search yet.
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'allPlans'">
                    <div
                      class="rounded-2xl border border-default/70 bg-muted/15 px-4 py-4 text-sm leading-6 text-muted"
                    >
                      This section is intentionally simple. Toggle it on if you want the rest of
                      your catalog listed below the featured plans.
                    </div>
                  </template>

                  <template
                    v-else-if="
                      selectedSection?.type === 'socials' || selectedSection?.type === 'links'
                    "
                  >
                    <div class="space-y-3">
                      <UFormField label="Website label">
                        <UInput
                          v-model="socialSectionContent.websiteLabel"
                          class="w-full"
                          placeholder="Website"
                        />
                      </UFormField>
                      <UFormField label="Website" :error="fieldError('settings.websiteUrl')">
                        <UInput v-model="profile.settings.websiteUrl" class="w-full" />
                      </UFormField>
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm text-muted">
                          Add the websites and social accounts visitors should actually use.
                        </div>
                        <UButton color="neutral" variant="soft" size="sm" @click="addSocialLink"
                          >Add link</UButton
                        >
                      </div>
                      <div
                        v-for="(link, index) in profile.settings.socialLinks"
                        :key="index"
                        class="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]"
                      >
                        <UInput v-model="link.label" placeholder="Instagram" class="w-full" />
                        <UFormField :error="fieldError(`settings.socialLinks.${index}.url`)">
                          <UInput
                            v-model="link.url"
                            placeholder="https://instagram.com/..."
                            class="w-full"
                          />
                        </UFormField>
                        <UButton
                          color="error"
                          variant="ghost"
                          icon="i-heroicons-trash"
                          @click="removeSocialLink(index)"
                        />
                      </div>
                      <div
                        v-if="!profile.settings.socialLinks.length && !profile.settings.websiteUrl"
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                      >
                        Add your website, booking page, or social profiles so visitors can keep
                        exploring you.
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'footerCta'">
                    <div class="space-y-3">
                      <UFormField label="Primary CTA URL" :error="fieldError('settings.ctaUrl')">
                        <UInput
                          v-model="profile.settings.ctaUrl"
                          class="w-full"
                          placeholder="Leave empty to hide the button"
                        />
                      </UFormField>
                      <UFormField label="Button label">
                        <UInput
                          v-model="footerCtaContent.buttonLabel"
                          class="w-full"
                          placeholder="Open link"
                        />
                      </UFormField>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'contact'">
                    <div class="space-y-4">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm text-muted">
                          Mix direct contact methods with an optional email form.
                        </div>
                        <UButton color="neutral" variant="soft" size="sm" @click="addContactMethod">
                          Add method
                        </UButton>
                      </div>

                      <div class="space-y-3">
                        <div
                          v-for="method in contactContent.methods"
                          :key="method.id"
                          class="rounded-2xl border border-default/70 p-4"
                        >
                          <div
                            class="grid gap-3 lg:grid-cols-[140px_minmax(0,180px)_minmax(0,1fr)_auto]"
                          >
                            <USelect
                              v-model="method.type"
                              :items="[
                                { label: 'Link', value: 'link' },
                                { label: 'Email', value: 'email' },
                                { label: 'Phone', value: 'phone' }
                              ]"
                              class="w-full"
                            />
                            <UInput v-model="method.label" placeholder="Label" class="w-full" />
                            <UFormField :error="fieldError(contactMethodFieldPath(method.id))">
                              <UInput
                                v-model="method.value"
                                :placeholder="
                                  method.type === 'phone'
                                    ? '+36 20 123 4567'
                                    : method.type === 'email'
                                      ? 'coach@example.com'
                                      : 'https://cal.com/coach'
                                "
                                class="w-full"
                              />
                            </UFormField>
                            <UButton
                              color="error"
                              variant="ghost"
                              icon="i-heroicons-trash"
                              @click="removeContactMethod(method.id)"
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="!contactContent.methods.length"
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted"
                      >
                        Add a booking link, direct email, or phone number so visitors have an
                        immediate next step.
                      </div>

                      <div class="rounded-2xl border border-default/70 bg-muted/15 p-4">
                        <div class="flex items-center justify-between gap-3">
                          <div>
                            <div class="text-sm font-semibold text-highlighted">Contact form</div>
                            <div class="text-xs text-muted">
                              If enabled, visitors must provide their email and the message will be
                              emailed to the page owner.
                            </div>
                          </div>
                          <USwitch v-model="contactContent.formEnabled" />
                        </div>

                        <div
                          v-if="contactContent.formEnabled"
                          class="mt-4 grid gap-4 lg:grid-cols-2"
                        >
                          <UFormField label="Form title">
                            <UInput
                              v-model="contactContent.formTitle"
                              class="w-full"
                              placeholder="Send a message"
                            />
                          </UFormField>
                          <UFormField label="Submit label">
                            <UInput
                              v-model="contactContent.submitLabel"
                              class="w-full"
                              placeholder="Send message"
                            />
                          </UFormField>
                          <UFormField label="Form intro" class="lg:col-span-2">
                            <UTextarea
                              v-model="contactContent.formIntro"
                              :rows="3"
                              class="w-full"
                              placeholder="Invite visitors to share their goals, timeline, or what they need help with."
                            />
                          </UFormField>
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'highlights'">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm text-muted">
                        Selected milestones, focus areas, or identity anchors.
                      </div>
                      <UButton color="neutral" variant="soft" size="sm" @click="addHighlight"
                        >Add highlight</UButton
                      >
                    </div>
                    <div class="space-y-3">
                      <div
                        v-for="highlight in profile.highlights"
                        :key="highlight.id"
                        class="space-y-3 rounded-2xl border border-default/70 p-4"
                      >
                        <div class="grid gap-3 lg:grid-cols-2">
                          <UInput v-model="highlight.title" placeholder="Title" class="w-full" />
                          <UInput v-model="highlight.value" placeholder="Value" class="w-full" />
                        </div>
                        <UTextarea
                          v-model="highlight.description"
                          :rows="2"
                          placeholder="Short context"
                          class="w-full"
                        />
                        <div class="flex justify-end">
                          <UButton
                            color="error"
                            variant="ghost"
                            size="sm"
                            @click="removeHighlight(highlight.id)"
                            >Remove</UButton
                          >
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection?.type === 'achievements'">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm text-muted">
                        Race results, milestones, and standout efforts.
                      </div>
                      <UButton color="neutral" variant="soft" size="sm" @click="addAchievement"
                        >Add achievement</UButton
                      >
                    </div>
                    <div class="space-y-3">
                      <div
                        v-for="achievement in profile.achievements"
                        :key="achievement.id"
                        class="space-y-3 rounded-2xl border border-default/70 p-4"
                      >
                        <div class="grid gap-3 lg:grid-cols-2">
                          <UInput v-model="achievement.title" placeholder="Title" class="w-full" />
                          <UInput v-model="achievement.year" placeholder="Year" class="w-full" />
                        </div>
                        <UTextarea
                          v-model="achievement.description"
                          :rows="2"
                          placeholder="Short context"
                          class="w-full"
                        />
                        <div class="flex justify-end">
                          <UButton
                            color="error"
                            variant="ghost"
                            size="sm"
                            @click="removeAchievement(achievement.id)"
                            >Remove</UButton
                          >
                        </div>
                      </div>
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

  <PlanOverviewModal v-model:open="showPlanPreview" :plan="previewPlan" :loading="previewLoading">
    <template #footer-actions>
      <div class="flex w-full justify-between gap-2">
        <UButton
          v-if="previewPlanPath"
          :to="previewPlanPath"
          color="primary"
          target="_blank"
          trailing-icon="i-heroicons-arrow-top-right-on-square"
        >
          Open public plan
        </UButton>
        <UButton label="Close" color="neutral" variant="ghost" @click="showPlanPreview = false" />
      </div>
    </template>
  </PlanOverviewModal>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'
  import { buildPublicPlanPath } from '#shared/public-plans'
  import { getYouTubeEmbedUrl, normalizeYouTubeUrl } from '~/utils/strengthExerciseLibrary'
  import PlanOverviewModal from '~/components/plans/PlanOverviewModal.vue'
  import PublicRichTextEditor from './PublicRichTextEditor.vue'

  const props = defineProps<{
    open: boolean
    role: 'coach' | 'athlete'
    availablePlans?: any[]
    validationErrors?: Record<string, string>
    saving?: boolean
    uploading?: boolean
  }>()

  const emit = defineEmits<{
    close: []
    save: []
    upload: [kind: 'cover' | 'gallery', file: File]
  }>()

  const profile = defineModel<any>('profile', { required: true })
  const coverUrlInput = ref('')
  const galleryUrlInput = ref('')
  const planSearchQuery = ref('')
  const showPlanPreview = ref(false)
  const previewLoading = ref(false)
  const previewPlan = ref<any>(null)
  const selectedSectionId = ref<string | null>(null)
  const coverUrlInputError = ref('')
  const galleryUrlInputError = ref('')

  const heroSection = computed(
    () => profile.value?.sections?.find((section: any) => section.type === 'hero') || null
  )

  const reorderableSections = computed({
    get: () =>
      [...(profile.value?.sections || [])]
        .filter((section: any) => section.type !== 'hero')
        .sort((a: any, b: any) => a.order - b.order),
    set: (value) => {
      const hero = profile.value.sections.find((section: any) => section.type === 'hero')
      profile.value.sections = [
        { ...hero, order: 0, enabled: true },
        ...value.map((section: any, index: number) => ({ ...section, order: index + 1 }))
      ]
    }
  })

  const selectedSection = computed(() => {
    const fallbackId = heroSection.value?.id || profile.value?.sections?.[0]?.id || null
    const sectionId = selectedSectionId.value || fallbackId
    return (
      profile.value?.sections?.find((section: any) => section.id === sectionId) || heroSection.value
    )
  })

  const selectedSectionTitle = computed(() => {
    if (!selectedSection.value) return 'Section'
    const headline = selectedSection.value.headline?.trim()
    return headline || formatSectionLabel(selectedSection.value.type)
  })

  const selectedSectionHelp = computed(() => sectionHelpText(selectedSection.value?.type))

  const enabledSectionCount = computed(
    () => (profile.value?.sections || []).filter((section: any) => section.enabled).length
  )

  const coverImage = computed(
    () => profile.value?.media?.find((image: any) => image.kind === 'cover') || null
  )

  const galleryImages = computed(() =>
    [...(profile.value?.media || [])]
      .filter((image: any) => image.kind === 'gallery')
      .sort((a: any, b: any) => a.order - b.order)
  )

  const galleryMediaModel = computed({
    get: () => galleryImages.value,
    set: (value) => {
      const cover = (profile.value.media || []).filter((image: any) => image.kind === 'cover')
      profile.value.media = [
        ...cover,
        ...value.map((image: any, index: number) => ({ ...image, order: index }))
      ]
    }
  })

  const specialtiesText = computed({
    get: () => (profile.value?.settings?.specialties || []).join(', '),
    set: (value: string) => {
      profile.value.settings.specialties = tokenizeList(value)
    }
  })

  const credentialsText = computed({
    get: () => (profile.value?.settings?.credentials || []).join(', '),
    set: (value: string) => {
      profile.value.settings.credentials = tokenizeList(value)
    }
  })

  const focusSportsText = computed({
    get: () => (profile.value?.settings?.focusSports || []).join(', '),
    set: (value: string) => {
      profile.value.settings.focusSports = tokenizeList(value)
    }
  })

  const featuredPlanConfigs = computed(() =>
    [...(profile.value?.settings?.featuredPlanMeta || [])].sort(
      (a: any, b: any) => a.order - b.order
    )
  )

  const featuredPlanConfigsModel = computed({
    get: () => featuredPlanConfigs.value,
    set: (value) => {
      profile.value.settings.featuredPlanMeta = value.map((item: any, index: number) => ({
        ...item,
        order: index
      }))
    }
  })

  const filteredAvailablePlans = computed(() => {
    const query = planSearchQuery.value.trim().toLowerCase()
    const plans = props.availablePlans || []
    if (!query) return plans
    return plans.filter((plan: any) => {
      const haystack = [
        plan.name,
        plan.publicHeadline,
        plan.publicDescription,
        plan.primarySport,
        plan.sportSubtype,
        plan.skillLevel
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  })

  const previewPlanPath = computed(() =>
    previewPlan.value ? buildPublicPlanPath(previewPlan.value) : null
  )
  const videoIntroFieldPath = computed(() => {
    const sectionIndex = (profile.value?.sections || []).findIndex(
      (section: any) => section.id === selectedSection.value?.id
    )
    return sectionIndex >= 0 ? `sections.${sectionIndex}.content.videoUrl` : 'videoIntro'
  })

  watch(
    () => [props.open, profile.value?.sections?.length],
    () => {
      if (!selectedSectionId.value) {
        selectedSectionId.value = heroSection.value?.id || null
      }
      if (
        selectedSectionId.value &&
        !profile.value?.sections?.some((section: any) => section.id === selectedSectionId.value)
      ) {
        selectedSectionId.value = heroSection.value?.id || null
      }
    },
    { immediate: true }
  )

  function selectSection(sectionId?: string | null) {
    if (!sectionId) return
    selectedSectionId.value = sectionId
  }

  function sectionButtonClass(sectionId?: string | null) {
    return sectionId === selectedSectionId.value
      ? 'border-primary/40 bg-primary/5'
      : 'border-default/70 bg-default hover:border-primary/20 hover:bg-primary/3'
  }

  function sectionHelpText(type?: string) {
    const help: Record<string, string> = {
      hero: 'This is the first impression. Keep the identity, headline, and cover image sharp and specific.',
      credibility:
        'Shape this like a trust section, not a stats dump: add a positioning note, specialties, credentials, and a few strong proof markers.',
      about: 'Explain how you coach, what you believe in, and who you do your best work with.',
      story: 'Tell the story visitors should understand about your athletic identity and journey.',
      specialties:
        'Keep these practical and searchable so athletes immediately understand your focus.',
      credentials: 'A few real trust markers are better than a long generic list.',
      faq: 'Answer the questions visitors usually have before they contact or buy from you.',
      testimonials: 'Short, vivid quotes work best. One strong quote beats a wall of text.',
      gallery:
        'Use a small set of images that reinforce quality and credibility rather than filling space.',
      videoIntro:
        'Use a short YouTube introduction to make the page feel more personal and immediate.',
      socials:
        'Give visitors a dedicated place to find your website, booking page, or social accounts.',
      featuredPlans:
        'Lead with the plans that best capture your methodology and commercial positioning.',
      allPlans: 'This section supports the featured offer stack. Keep it secondary.',
      footerCta: 'Repeat the clearest next step for visitors who are ready to act.',
      contact:
        'Offer a direct way to reach you, whether that is a booking link, phone number, or email form.',
      highlights: 'Use highlights to summarize identity, achievements, or current focus quickly.',
      achievements: 'Feature meaningful milestones with just enough context to matter.',
      links: 'Only include links that help visitors continue the relationship.'
    }
    return help[type || 'hero'] || 'Edit this section and shape how it appears on the public page.'
  }

  function tokenizeList(value: string) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function formatSectionLabel(type: string) {
    const labelMap: Record<string, string> = {
      hero: 'Hero',
      credibility: 'Credibility',
      about: 'About',
      specialties: 'Specialties',
      credentials: 'Credentials',
      faq: 'FAQ',
      testimonials: 'Testimonials',
      gallery: 'Gallery',
      videoIntro: 'Video Introduction',
      socials: 'Socials',
      featuredPlans: 'Featured Plans',
      allPlans: 'All Plans',
      footerCta: 'Footer CTA',
      contact: 'Contact',
      story: 'Story',
      highlights: 'Highlights',
      achievements: 'Achievements',
      links: 'Links'
    }
    return labelMap[type] || type
  }

  function formatEnumLabel(value?: string | null) {
    if (!value) return null
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  }

  function isValidHttpUrl(value: string) {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  function fieldError(path: string) {
    return props.validationErrors?.[path] || ''
  }

  function setCoverFromUrl() {
    if (!coverUrlInput.value.trim()) return
    if (!isValidHttpUrl(coverUrlInput.value.trim())) {
      coverUrlInputError.value = 'Enter a valid http or https URL.'
      return
    }
    coverUrlInputError.value = ''
    const otherMedia = (profile.value.media || []).filter((image: any) => image.kind !== 'cover')
    profile.value.media = [
      ...otherMedia,
      {
        id: makeId('cover'),
        type: 'external',
        url: coverUrlInput.value.trim(),
        alt: profile.value.settings.displayName || '',
        caption: null,
        kind: 'cover',
        order: 0
      }
    ]
    coverUrlInput.value = ''
  }

  function addGalleryFromUrl() {
    if (!galleryUrlInput.value.trim()) return
    if (!isValidHttpUrl(galleryUrlInput.value.trim())) {
      galleryUrlInputError.value = 'Enter a valid http or https URL.'
      return
    }
    galleryUrlInputError.value = ''
    profile.value.media.push({
      id: makeId('gallery'),
      type: 'external',
      url: galleryUrlInput.value.trim(),
      alt: profile.value.settings.displayName || '',
      caption: null,
      kind: 'gallery',
      order: galleryImages.value.length
    })
    galleryUrlInput.value = ''
  }

  function removeCover() {
    profile.value.media = (profile.value.media || []).filter((image: any) => image.kind !== 'cover')
  }

  function removeMedia(id: string) {
    const nextGallery = galleryImages.value
      .filter((image: any) => image.id !== id)
      .map((image: any, index: number) => ({ ...image, order: index }))
    const cover = (profile.value.media || []).filter((image: any) => image.kind === 'cover')
    profile.value.media = [...cover, ...nextGallery]
  }

  function addTestimonial() {
    profile.value.testimonials.push({
      id: makeId('testimonial'),
      authorName: '',
      authorRole: '',
      quote: ''
    })
  }

  function removeTestimonial(id: string) {
    profile.value.testimonials = profile.value.testimonials.filter((item: any) => item.id !== id)
  }

  function addHighlight() {
    profile.value.highlights.push({
      id: makeId('highlight'),
      title: '',
      value: '',
      description: ''
    })
  }

  function removeHighlight(id: string) {
    profile.value.highlights = profile.value.highlights.filter((item: any) => item.id !== id)
  }

  function addAchievement() {
    profile.value.achievements.push({
      id: makeId('achievement'),
      title: '',
      year: '',
      description: ''
    })
  }

  function removeAchievement(id: string) {
    profile.value.achievements = profile.value.achievements.filter((item: any) => item.id !== id)
  }

  function addSocialLink() {
    profile.value.settings.socialLinks.push({ label: '', url: '' })
  }

  function removeSocialLink(index: number) {
    profile.value.settings.socialLinks = profile.value.settings.socialLinks.filter(
      (_: any, currentIndex: number) => currentIndex !== index
    )
  }

  function isPlanFeatured(planId: string) {
    return featuredPlanConfigs.value.some((item: any) => item.planId === planId)
  }

  function planById(planId?: string | null) {
    return (props.availablePlans || []).find((plan: any) => plan.id === planId) || null
  }

  function ensureSectionContent(section: any) {
    if (!section.content || typeof section.content !== 'object') {
      section.content = {}
    }
    return section.content
  }

  const contactContent = computed(() => {
    const content = ensureSectionContent(selectedSection.value || {})
    if (!Array.isArray(content.methods)) content.methods = []
    if (typeof content.formEnabled !== 'boolean') content.formEnabled = false
    if (typeof content.formTitle !== 'string') content.formTitle = ''
    if (typeof content.formIntro !== 'string') content.formIntro = ''
    if (typeof content.submitLabel !== 'string') content.submitLabel = ''
    return content
  })

  const faqContent = computed(() => {
    const content = ensureSectionContent(selectedSection.value || {})
    if (!Array.isArray(content.items)) content.items = []
    return content as { items: Array<{ id: string; question: string; answer: string }> }
  })

  const socialSectionContent = computed(() => {
    const content = ensureSectionContent(selectedSection.value || {})
    if (typeof content.websiteLabel !== 'string') content.websiteLabel = ''
    return content as { websiteLabel: string }
  })

  const credibilityContent = computed(() => {
    const content = ensureSectionContent(selectedSection.value || {})
    if (typeof content.eyebrow !== 'string') content.eyebrow = ''
    if (typeof content.spotlightTitle !== 'string') content.spotlightTitle = ''
    if (typeof content.spotlightBody !== 'string') content.spotlightBody = ''
    if (!Array.isArray(content.trustBullets)) content.trustBullets = []
    if (typeof content.showSpotlight !== 'boolean') content.showSpotlight = true
    if (typeof content.showSpecialties !== 'boolean') content.showSpecialties = true
    if (typeof content.showCredentials !== 'boolean') content.showCredentials = true
    if (typeof content.showSocialProof !== 'boolean') content.showSocialProof = true
    return content as {
      eyebrow: string
      spotlightTitle: string
      spotlightBody: string
      trustBullets: string[]
      showSpotlight: boolean
      showSpecialties: boolean
      showCredentials: boolean
      showSocialProof: boolean
    }
  })

  const credibilityTrustBulletsText = computed({
    get: () => credibilityContent.value.trustBullets.join('\n'),
    set: (value: string) => {
      credibilityContent.value.trustBullets = value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  })

  const footerCtaContent = computed(() => {
    const content = ensureSectionContent(selectedSection.value || {})
    if (typeof content.buttonLabel !== 'string') content.buttonLabel = ''
    return content as { buttonLabel: string }
  })

  const videoIntroContent = computed(() => {
    const content = ensureSectionContent(selectedSection.value || {})
    if (typeof content.videoUrl !== 'string') content.videoUrl = ''
    if (typeof content.caption !== 'string') content.caption = ''
    return content
  })

  const videoIntroEmbedUrl = computed(() => getYouTubeEmbedUrl(videoIntroContent.value.videoUrl))

  function contactMethodFieldPath(methodId: string) {
    const sectionIndex = (profile.value?.sections || []).findIndex(
      (section: any) => section.id === selectedSection.value?.id
    )
    const methodIndex = contactContent.value.methods.findIndex(
      (method: any) => method.id === methodId
    )
    if (sectionIndex < 0 || methodIndex < 0) return methodId
    return `sections.${sectionIndex}.content.methods.${methodIndex}.value`
  }

  function normalizeVideoIntroUrl() {
    if (!videoIntroContent.value.videoUrl?.trim()) return
    videoIntroContent.value.videoUrl =
      normalizeYouTubeUrl(videoIntroContent.value.videoUrl) || videoIntroContent.value.videoUrl
  }

  function addContactMethod() {
    contactContent.value.methods.push({
      id: makeId('contact-method'),
      type: 'link',
      label: '',
      value: ''
    })
  }

  function removeContactMethod(id: string) {
    contactContent.value.methods = contactContent.value.methods.filter(
      (item: any) => item.id !== id
    )
  }

  function addFaqItem() {
    faqContent.value.items.push({
      id: makeId('faq'),
      question: '',
      answer: ''
    })
  }

  function removeFaqItem(id: string) {
    faqContent.value.items = faqContent.value.items.filter((item: any) => item.id !== id)
  }

  function sampleWeekOptions(plan: any) {
    const weeks = plan?.sampleWeeks || []
    if (!weeks.length) {
      return [{ label: 'Default sample week', value: null }]
    }
    return weeks.map((week: any) => ({
      label: `Week ${week.weekNumber}${week.focus ? ` • ${week.focus}` : ''}`,
      value: week.id
    }))
  }

  function toggleFeaturedPlan(plan: any) {
    if (!plan?.id) return
    if (isPlanFeatured(plan.id)) {
      removeFeaturedPlan(plan.id)
      return
    }
    profile.value.settings.featuredPlanMeta = [
      ...featuredPlanConfigs.value,
      {
        planId: plan.id,
        order: featuredPlanConfigs.value.length,
        highlightWeekId: plan.sampleWeeks?.[0]?.id || null,
        coachNote: null
      }
    ]
  }

  function removeFeaturedPlan(planId: string) {
    profile.value.settings.featuredPlanMeta = featuredPlanConfigs.value
      .filter((item: any) => item.planId !== planId)
      .map((item: any, index: number) => ({ ...item, order: index }))
  }

  async function peekPlan(plan: any) {
    if (!plan?.slug) return
    previewLoading.value = true
    showPlanPreview.value = true
    try {
      const response = await $fetch(`/api/public/plans/${plan.slug}`)
      previewPlan.value = (response as any).plan
    } finally {
      previewLoading.value = false
    }
  }

  function emitUpload(kind: 'cover' | 'gallery', event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    emit('upload', kind, file)
    input.value = ''
  }

  function onCoverUpload(event: Event) {
    emitUpload('cover', event)
  }

  function onGalleryUpload(event: Event) {
    emitUpload('gallery', event)
  }
</script>
