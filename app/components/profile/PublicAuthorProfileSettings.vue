<template>
  <div class="space-y-6 animate-fade-in">
    <UCard>
      <template #header>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Public Profile
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Control how your coaching identity appears on public training plan pages.
            </p>
          </div>

          <UButton
            :to="publicProfileUrl"
            color="primary"
            variant="outline"
            class="w-full sm:w-auto justify-center"
            icon="i-heroicons-arrow-top-right-on-square"
            :disabled="!publicProfileUrl"
            target="_blank"
          >
            View public profile
          </UButton>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField
          label="Public display name"
          help="Shown on public plan pages and your author profile."
        >
          <UInput
            v-model="localProfile.publicDisplayName"
            placeholder="Coach Jane Doe"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Author slug" help="Used in your public author URL.">
          <UInput
            v-model="localProfile.publicAuthorSlug"
            placeholder="coach-jane-doe"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Coaching brand">
          <UInput
            v-model="localProfile.publicCoachingBrand"
            placeholder="Summit Endurance"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Location">
          <UInput
            v-model="localProfile.publicLocation"
            placeholder="Budapest, Hungary"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Website" class="md:col-span-2">
          <UInput
            v-model="localProfile.publicWebsiteUrl"
            placeholder="https://example.com"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">Privacy</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Keep your public profile settings aligned with your overall profile visibility.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UAlert
          color="neutral"
          variant="soft"
          icon="i-heroicons-shield-check"
          title="Public coach page visibility"
          description="If your profile visibility is set to Private, visitors may not be able to discover or access your public-facing presence as expected."
        />

        <UFormField
          label="Profile visibility"
          help="Same setting as Privacy & Location. Update it here if you want your public profile preferences in one place."
        >
          <USelectMenu
            v-model="localProfile.visibility"
            :items="['Private', 'Public', 'Followers Only']"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            Bio & positioning
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Introduce your background, coaching philosophy, and the athletes you help best.
          </p>
        </div>
      </template>

      <UFormField label="Bio">
        <UTextarea
          v-model="localProfile.publicBio"
          :rows="6"
          placeholder="Introduce your coaching background, philosophy, and who you help best."
          class="w-full"
        />
      </UFormField>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Social links
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add up to 6 links for your public author page.
            </p>
          </div>
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            class="w-full sm:w-auto justify-center"
            @click="addLink"
          >
            Add link
          </UButton>
        </div>
      </template>

      <div class="space-y-4">
        <div
          v-for="(link, index) in socialLinks"
          :key="index"
          class="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] gap-4"
        >
          <UFormField label="Label">
            <UInput v-model="link.label" placeholder="Instagram" class="w-full" />
          </UFormField>

          <UFormField label="URL">
            <UInput v-model="link.url" placeholder="https://instagram.com/..." class="w-full" />
          </UFormField>

          <div class="flex items-end">
            <UButton
              color="error"
              variant="ghost"
              icon="i-heroicons-trash"
              class="w-full md:w-auto justify-center"
              @click="removeLink(index)"
            />
          </div>
        </div>

        <div
          v-if="!socialLinks.length"
          class="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
        >
          No public links added yet.
        </div>
      </div>
    </UCard>

    <div class="flex justify-end">
      <UButton color="primary" :loading="loading" @click="save">Save Public Profile</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, watch } from 'vue'

  const props = defineProps<{
    modelValue: any
    loading?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const localProfile = reactive({
    visibility: 'Private',
    publicDisplayName: '',
    publicAuthorSlug: '',
    publicCoachingBrand: '',
    publicLocation: '',
    publicWebsiteUrl: '',
    publicBio: '',
    publicSocialLinks: [] as Array<{ label: string; url: string }>
  })

  watch(
    () => props.modelValue,
    (value) => {
      Object.assign(localProfile, {
        visibility: value?.visibility || 'Private',
        publicDisplayName: value?.publicDisplayName || '',
        publicAuthorSlug: value?.publicAuthorSlug || '',
        publicCoachingBrand: value?.publicCoachingBrand || '',
        publicLocation: value?.publicLocation || '',
        publicWebsiteUrl: value?.publicWebsiteUrl || '',
        publicBio: value?.publicBio || '',
        publicSocialLinks: Array.isArray(value?.publicSocialLinks) ? value.publicSocialLinks : []
      })
    },
    { immediate: true, deep: true }
  )

  const socialLinks = computed({
    get: () => localProfile.publicSocialLinks,
    set: (value) => {
      localProfile.publicSocialLinks = value
    }
  })

  const publicProfileUrl = computed(() => {
    const slug = props.modelValue?.publicAuthorSlug
    return slug ? `/coach/${slug}` : undefined
  })

  function addLink() {
    socialLinks.value = [...socialLinks.value, { label: '', url: '' }]
  }

  function removeLink(index: number) {
    socialLinks.value = socialLinks.value.filter((_, currentIndex) => currentIndex !== index)
  }

  function save() {
    emit('update:modelValue', {
      visibility: localProfile.visibility || 'Private',
      publicDisplayName: localProfile.publicDisplayName || null,
      publicAuthorSlug: localProfile.publicAuthorSlug || null,
      publicCoachingBrand: localProfile.publicCoachingBrand || null,
      publicLocation: localProfile.publicLocation || null,
      publicWebsiteUrl: localProfile.publicWebsiteUrl || null,
      publicBio: localProfile.publicBio || null,
      publicSocialLinks: socialLinks.value.filter((link) => link.label && link.url)
    })
  }
</script>
