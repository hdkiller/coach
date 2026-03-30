<template>
  <div class="space-y-8">
    <section class="space-y-4">
      <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Publishing</div>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Visibility" help="Public plans appear in browse and search.">
          <USelect v-model="plan.visibility" :items="visibilityOptions" class="w-full" />
        </UFormField>
        <UFormField
          label="Access"
          help="Restricted plans show selected sample weeks publicly, but private links unlock the full plan."
        >
          <USelect v-model="plan.accessState" :items="accessStateOptions" class="w-full" />
        </UFormField>
      </div>

      <div class="space-y-3">
        <UFormField label="Slug" help="Canonical public URL slug for SEO and direct linking.">
          <UInput v-model="plan.slug" placeholder="8-week-marathon-base" class="w-full" />
        </UFormField>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <UButton color="neutral" variant="soft" class="w-full sm:w-auto" @click="generateSlug">
            Generate from name
          </UButton>
          <UButton
            :to="publicPageUrl"
            color="primary"
            variant="outline"
            class="w-full sm:w-auto"
            icon="i-heroicons-arrow-top-right-on-square"
            :disabled="!publicPageUrl"
            target="_blank"
          >
            Visit public page
          </UButton>
        </div>
      </div>
    </section>

    <section class="space-y-4 pt-4 border-t border-default/60">
      <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Discovery</div>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Primary sport">
          <USelect v-model="plan.primarySport" :items="sportOptions" class="w-full" />
        </UFormField>
        <UFormField label="Sport subtype">
          <USelect v-model="plan.sportSubtype" :items="subtypeOptions" class="w-full" />
        </UFormField>
        <UFormField label="Skill level">
          <USelect v-model="plan.skillLevel" :items="skillLevelOptions" class="w-full" />
        </UFormField>
        <UFormField label="Plan language">
          <USelect v-model="plan.planLanguage" :items="languageOptions" class="w-full" />
        </UFormField>
        <UFormField label="Days per week">
          <UInput v-model.number="plan.daysPerWeek" type="number" min="1" max="14" class="w-full" />
        </UFormField>
        <UFormField label="Weekly volume band">
          <USelect v-model="plan.weeklyVolumeBand" :items="volumeBandOptions" class="w-full" />
        </UFormField>
        <UFormField label="Goal label">
          <UInput v-model="plan.goalLabel" placeholder="First marathon" class="w-full" />
        </UFormField>
        <UFormField label="Equipment tags" help="Comma-separated, e.g. treadmill, HR strap">
          <UInput
            v-model="plan.equipmentTags"
            placeholder="trainer, treadmill, heart-rate strap"
            class="w-full"
          />
        </UFormField>
      </div>
    </section>

    <section class="space-y-4 pt-4 border-t border-default/60">
      <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Public Story</div>
      <UFormField label="Headline" help="Short hook shown in catalog cards and page header.">
        <UInput
          v-model="plan.publicHeadline"
          placeholder="Build your first confident 10K block"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Public description" help="Required for public plans.">
        <UTextarea v-model="plan.publicDescription" :rows="5" class="w-full" />
      </UFormField>
      <UFormField label="Methodology">
        <UTextarea v-model="plan.methodology" :rows="4" class="w-full" />
      </UFormField>
      <UFormField label="Who it's for">
        <UTextarea v-model="plan.whoItsFor" :rows="3" class="w-full" />
      </UFormField>
      <UFormField label="FAQ">
        <UTextarea v-model="plan.faq" :rows="4" class="w-full" />
      </UFormField>
      <UFormField label="Extra content">
        <UTextarea v-model="plan.extraContent" :rows="4" class="w-full" />
      </UFormField>
    </section>

    <section class="space-y-4 pt-4 border-t border-default/60">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Restricted Preview
          </div>
          <p class="text-xs text-muted mt-1">
            Choose exactly which weeks anonymous visitors can inspect when this plan is public and
            restricted.
          </p>
        </div>
        <UBadge color="neutral" variant="soft">{{ selectedCount }} selected</UBadge>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label
          v-for="week in weekOptions"
          :key="week.id"
          class="flex items-start gap-3 rounded-2xl border border-default/70 bg-muted/10 p-3"
        >
          <UCheckbox
            :model-value="selectedWeekIdSet.has(week.id)"
            @update:model-value="toggleWeek(week.id)"
          />
          <div class="min-w-0">
            <div class="text-sm font-semibold text-highlighted">
              {{ week.label }}
            </div>
            <div class="text-xs text-muted mt-1">
              {{ week.blockName }}
            </div>
          </div>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import {
    PLAN_LANGUAGE_OPTIONS,
    PLAN_ACCESS_STATE_OPTIONS,
    PLAN_SKILL_LEVEL_OPTIONS,
    PLAN_VISIBILITY_OPTIONS,
    PLAN_VOLUME_BAND_OPTIONS,
    PUBLIC_PLAN_SPORTS,
    buildPublicPlanPath,
    getSportSubtypeOptions,
    slugifyPublicName
  } from '#shared/public-plans'

  const { weekOptions } = defineProps<{
    weekOptions: Array<{ id: string; label: string; blockName: string }>
  }>()
  const plan = defineModel<any>('plan', { required: true })

  const visibilityOptions = [...PLAN_VISIBILITY_OPTIONS]
  const accessStateOptions = [...PLAN_ACCESS_STATE_OPTIONS]
  const languageOptions = [...PLAN_LANGUAGE_OPTIONS]
  const skillLevelOptions = [...PLAN_SKILL_LEVEL_OPTIONS]
  const volumeBandOptions = [...PLAN_VOLUME_BAND_OPTIONS]
  const sportOptions = PUBLIC_PLAN_SPORTS.map((sport) => ({
    label: sport.label,
    value: sport.value
  }))
  const subtypeOptions = computed(() => getSportSubtypeOptions(plan.value.primarySport))
  const selectedWeekIdSet = computed(() => new Set(plan.value.sampleWeekIds || []))
  const selectedCount = computed(() => selectedWeekIdSet.value.size)
  const publicPageUrl = computed(() => {
    const slug = plan.value.slug || slugifyPublicName(plan.value.name || '')
    if (!slug) return undefined
    return buildPublicPlanPath({
      slug,
      name: plan.value.name,
      primarySport: plan.value.primarySport,
      sportSubtype: plan.value.sportSubtype
    })
  })

  function generateSlug() {
    if (!plan.value.slug && plan.value.name) {
      plan.value.slug = slugifyPublicName(plan.value.name)
      return
    }

    plan.value.slug = slugifyPublicName(plan.value.slug || plan.value.name || '')
  }

  function toggleWeek(weekId: string) {
    const current = new Set(plan.value.sampleWeekIds || [])
    if (current.has(weekId)) {
      current.delete(weekId)
    } else {
      current.add(weekId)
    }
    plan.value.sampleWeekIds = [...current]
  }
</script>
