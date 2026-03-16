<template>
  <div class="space-y-6 animate-fade-in">
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              {{ t('sports_header') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('sports_description') }}
            </p>
          </div>
          <div class="flex gap-2 shrink-0">
            <UButton
              icon="i-heroicons-arrow-path"
              size="sm"
              variant="soft"
              color="primary"
              :loading="autodetecting"
              :label="t('sports_autodetect')"
              class="flex-1 sm:flex-none justify-center"
              @click="autodetectProfile"
            />
            <UButton
              icon="i-lucide-plus"
              size="sm"
              variant="soft"
              color="primary"
              :label="t('sports_add_sport')"
              class="flex-1 sm:flex-none justify-center"
              @click="openAddModal"
            />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div
        v-if="!settings || settings.length === 0"
        class="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg border-t border-gray-200 dark:border-gray-800"
      >
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4"
        >
          <UIcon name="i-lucide-award" class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {{ t('sports_empty_title') }}
        </h3>
        <p class="text-gray-500 mt-2 max-w-sm mx-auto mb-6">
          {{ t('sports_empty_desc') }}
        </p>
        <UButton icon="i-lucide-plus" size="md" color="primary" @click="openAddModal">
          {{ t('sports_empty_button') }}
        </UButton>
      </div>

      <!-- Sport List -->
      <div v-else>
        <UAccordion
          v-model="openItems"
          :items="accordionItems"
          multiple
          :ui="{ trigger: 'px-4 sm:px-6' }"
        >
          <template #sport-item="{ item, index }">
            <div class="p-4 space-y-8">
              <!-- Header Actions -->
              <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
              >
                <div v-if="editingIndex === index" class="w-full sm:flex-1">
                  <UFormField :label="t('sports_form_profile_name')" name="name">
                    <UInput
                      v-model="editForm.name"
                      :placeholder="t('sports_form_profile_name_placeholder')"
                      size="xs"
                      class="w-full"
                      :disabled="item.content.isDefault"
                    />
                  </UFormField>
                </div>
                <div v-else class="flex-1">
                  <h4
                    v-if="item.content.name"
                    class="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    {{ item.content.name }}
                    <UBadge
                      v-if="item.content.isDefault"
                      color="primary"
                      variant="subtle"
                      size="xs"
                      >{{ t('sports_badge_default') }}</UBadge
                    >
                  </h4>
                </div>
                <div class="flex gap-2 shrink-0 self-end sm:self-auto">
                  <template v-if="editingIndex !== index">
                    <UButton
                      v-if="!item.content.isDefault"
                      icon="i-lucide-trash-2"
                      size="xs"
                      variant="ghost"
                      color="error"
                      @click="deleteSport(index)"
                    >
                      {{ t('sports_button_delete') }}
                    </UButton>

                    <UDropdownMenu
                      v-if="settings.length > 1"
                      :items="getCopyOptions(index)"
                      :content="{ align: 'end' }"
                    >
                      <UButton icon="i-lucide-copy" size="xs" variant="ghost" color="neutral">
                        {{ t('sports_button_copy') }}
                      </UButton>
                    </UDropdownMenu>

                    <UButton
                      v-if="item.content.id"
                      icon="i-lucide-activity"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :loading="detectingSportId === item.content.id"
                      @click="detectFromWorkouts(item.content)"
                    >
                      Detect from Workouts
                    </UButton>

                    <UButton
                      icon="i-lucide-pencil"
                      size="xs"
                      variant="ghost"
                      color="primary"
                      @click="startEdit(index, item.content)"
                    >
                      {{ t('sports_button_edit') }}
                    </UButton>
                  </template>
                  <div v-else class="flex gap-2">
                    <UButton
                      icon="i-lucide-x"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      @click="cancelEdit"
                    >
                      Cancel
                    </UButton>
                    <UButton
                      icon="i-lucide-check"
                      size="xs"
                      variant="solid"
                      color="primary"
                      @click="saveEdit(index)"
                    >
                      {{ t('sports_button_save') }}
                    </UButton>
                  </div>
                </div>
              </div>

              <!-- Activity Types (Edit mode only) -->
              <section v-if="editingIndex === index && !item.content.isDefault" class="space-y-4">
                <UFormField :label="t('sports_form_assign_types')" name="types" required>
                  <USelectMenu
                    v-model="editForm.types"
                    :items="availableSports"
                    multiple
                    :placeholder="t('sports_form_assign_types_placeholder')"
                    class="w-full"
                    :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
                  />
                </UFormField>
              </section>

              <!-- General Settings -->
              <section class="space-y-4">
                <h4
                  class="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-2 dark:border-gray-800"
                >
                  {{ t('sports_section_general') }}
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <!-- Warmup -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_warmup')"
                        :help="t('sports_form_warmup_help')"
                      >
                        <UInput
                          v-model.number="editForm.warmupTime"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_warmup') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.warmupTime || '-' }}
                        <span v-if="item.content.warmupTime" class="text-xs text-gray-400"
                          >min</span
                        >
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_warmup_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Cooldown -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_cooldown')"
                        :help="t('sports_form_cooldown_help')"
                      >
                        <UInput
                          v-model.number="editForm.cooldownTime"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_cooldown') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.cooldownTime || '-' }}
                        <span v-if="item.content.cooldownTime" class="text-xs text-gray-400"
                          >min</span
                        >
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_cooldown_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Load Priority -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_load_priority')"
                        :help="t('sports_form_load_priority_help')"
                      >
                        <USelectMenu
                          v-model="editForm.loadPreference"
                          :items="LOAD_PREFERENCES"
                          size="xs"
                          class="w-full"
                          @update:model-value="syncTargetingPolicy(editForm, 'loadPreference')"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_load_priority') }}
                      </div>
                      <div class="text-sm font-medium h-7 flex items-center">
                        {{ item.content.loadPreference || '-' }}
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_load_priority_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Target Policy -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg md:col-span-3">
                    <template v-if="editingIndex === index">
                      <div class="space-y-3">
                        <UFormField
                          label="Targeting Policy"
                          help="Controls how workout steps choose HR/Power/Pace targets."
                        >
                          <USelectMenu
                            v-model="editForm.targetPolicy.primaryMetric"
                            :items="TARGET_METRICS"
                            size="xs"
                            class="w-full"
                            @update:model-value="syncTargetingPolicy(editForm, 'primaryMetric')"
                          />
                        </UFormField>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <UFormField
                            label="Default Target Style"
                            help="Choose how targets are written by default. 'range' creates a min-max zone (recommended for steady work); 'value' creates a single fixed target."
                          >
                            <USelectMenu
                              v-model="editForm.targetPolicy.defaultTargetStyle"
                              :items="TARGET_STYLES"
                              size="xs"
                              class="w-full"
                            />
                          </UFormField>
                          <UFormField
                            label="Prefer Ranges for Steady Work"
                            help="For endurance/steady blocks, prefer ranges (for example 70-80%) instead of single-point targets."
                          >
                            <div class="h-8 flex items-center">
                              <USwitch v-model="editForm.targetPolicy.preferRangesForSteady" />
                            </div>
                          </UFormField>
                          <UFormField
                            label="Strict Primary Metric"
                            help="Force generation to use only the primary metric when possible, instead of falling back to other metrics."
                          >
                            <div class="h-8 flex items-center">
                              <USwitch v-model="editForm.targetPolicy.strictPrimary" />
                            </div>
                          </UFormField>
                          <UFormField
                            label="Allow Mixed Targets Per Step"
                            help="Allow a single step to include multiple metrics (for example HR + Pace). Disable to keep one metric per step."
                          >
                            <div class="h-8 flex items-center">
                              <USwitch v-model="editForm.targetPolicy.allowMixedTargetsPerStep" />
                            </div>
                          </UFormField>
                          <UFormField
                            label="HR Target Format"
                            help="How HR targets are represented in steps."
                          >
                            <USelectMenu
                              v-model="editForm.targetFormatPolicy.heartRate.mode"
                              :items="HR_TARGET_FORMATS"
                              size="xs"
                              class="w-full"
                            />
                          </UFormField>
                          <UFormField
                            label="Power Target Format"
                            help="How power targets are represented in steps."
                          >
                            <USelectMenu
                              v-model="editForm.targetFormatPolicy.power.mode"
                              :items="POWER_TARGET_FORMATS"
                              size="xs"
                              class="w-full"
                            />
                          </UFormField>
                          <UFormField
                            label="Pace Target Format"
                            help="How pace targets are represented in steps."
                          >
                            <USelectMenu
                              v-model="editForm.targetFormatPolicy.pace.mode"
                              :items="PACE_TARGET_FORMATS"
                              size="xs"
                              class="w-full"
                            />
                          </UFormField>
                          <UFormField
                            label="Cadence Target Format"
                            help="Choose if cadence is omitted, single RPM, or RPM range."
                          >
                            <USelectMenu
                              v-model="editForm.targetFormatPolicy.cadence.mode"
                              :items="CADENCE_TARGET_FORMATS"
                              size="xs"
                              class="w-full"
                            />
                          </UFormField>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        Targeting Policy
                      </div>
                      <div class="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                        <div class="grid grid-cols-[120px_1fr] gap-x-2 items-center">
                          <div class="text-gray-500">Primary</div>
                          <div class="font-semibold">
                            {{ formatMetricTarget(item.content.targetPolicy?.primaryMetric) }}
                          </div>
                        </div>
                        <div class="grid grid-cols-[120px_1fr] gap-x-2 items-center">
                          <div class="text-gray-500">Style</div>
                          <div class="font-semibold">
                            {{ formatTargetStyle(item.content.targetPolicy?.defaultTargetStyle) }}
                          </div>
                        </div>
                        <div class="grid grid-cols-[120px_1fr] gap-x-2 items-center">
                          <div class="text-gray-500">Strict Primary</div>
                          <div class="font-semibold">
                            {{ item.content.targetPolicy?.strictPrimary ? 'Yes' : 'No' }}
                          </div>
                        </div>
                        <div class="grid grid-cols-[120px_1fr] gap-x-2 items-center">
                          <div class="text-gray-500">Mixed Targets</div>
                          <div class="font-semibold">
                            {{
                              item.content.targetPolicy?.allowMixedTargetsPerStep
                                ? 'Allowed'
                                : 'Single Metric'
                            }}
                          </div>
                        </div>
                        <div class="grid grid-cols-[120px_1fr] gap-x-2 items-start">
                          <div class="text-gray-500 pt-0.5">Formats</div>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <div
                              class="rounded bg-white dark:bg-gray-900 px-2 py-1 border border-gray-200 dark:border-gray-700"
                            >
                              <span class="text-gray-500">HR:</span>
                              <span class="font-semibold ml-1">{{
                                formatTargetFormat(
                                  'hr',
                                  item.content.targetFormatPolicy?.heartRate?.mode || 'percentLthr'
                                )
                              }}</span>
                            </div>
                            <div
                              class="rounded bg-white dark:bg-gray-900 px-2 py-1 border border-gray-200 dark:border-gray-700"
                            >
                              <span class="text-gray-500">Power:</span>
                              <span class="font-semibold ml-1">{{
                                formatTargetFormat(
                                  'power',
                                  item.content.targetFormatPolicy?.power?.mode || 'percentFtp'
                                )
                              }}</span>
                            </div>
                            <div
                              class="rounded bg-white dark:bg-gray-900 px-2 py-1 border border-gray-200 dark:border-gray-700"
                            >
                              <span class="text-gray-500">Pace:</span>
                              <span class="font-semibold ml-1">{{
                                formatTargetFormat(
                                  'pace',
                                  item.content.targetFormatPolicy?.pace?.mode || 'percentPace'
                                )
                              }}</span>
                            </div>
                            <div
                              class="rounded bg-white dark:bg-gray-900 px-2 py-1 border border-gray-200 dark:border-gray-700"
                            >
                              <span class="text-gray-500">Cadence:</span>
                              <span class="font-semibold ml-1">{{
                                formatTargetFormat(
                                  'cadence',
                                  item.content.targetFormatPolicy?.cadence?.mode || 'rpm'
                                )
                              }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </section>

              <!-- Power Settings -->
              <section class="space-y-4">
                <h4
                  class="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-2 dark:border-gray-800 flex items-center gap-2"
                >
                  <UIcon name="i-lucide-zap" class="w-4 h-4 text-yellow-500" />
                  {{ t('sports_section_power') }}
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <!-- FTP -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField :label="t('sports_form_ftp')" :help="t('sports_form_ftp_help')">
                        <UInput
                          v-model.number="editForm.ftp"
                          type="number"
                          size="xs"
                          class="w-full"
                          @update:model-value="handleThresholdChange('power', 'edit')"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_ftp') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.ftp || '-' }}
                        <span v-if="item.content.ftp" class="text-xs text-gray-400">W</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_ftp_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- eFTP -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField :label="t('sports_form_eftp')" :help="t('sports_form_eftp_help')">
                        <UInput
                          v-model.number="editForm.eFtp"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_eftp') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.eFtp || '-' }}
                        <span v-if="item.content.eFtp" class="text-xs text-gray-400">W</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_eftp_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Indoor FTP -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_indoor_ftp')"
                        :help="t('sports_form_indoor_ftp_help')"
                      >
                        <UInput
                          v-model.number="editForm.indoorFtp"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_indoor_ftp') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.indoorFtp || '-' }}
                        <span v-if="item.content.indoorFtp" class="text-xs text-gray-400">W</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_indoor_ftp_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- W' -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_wprime')"
                        :help="t('sports_form_wprime_help')"
                      >
                        <UInput
                          v-model.number="editForm.wPrime"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">W'</div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.wPrime ? (item.content.wPrime / 1000).toFixed(1) : '-' }}
                        <span v-if="item.content.wPrime" class="text-xs text-gray-400">kJ</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_wprime_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Pmax -->
                  <div
                    v-if="editingIndex === index || item.content.pMax"
                    class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <template v-if="editingIndex === index">
                      <UFormField :label="t('sports_form_pmax')" :help="t('sports_form_pmax_help')">
                        <UInput
                          v-model.number="editForm.pMax"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_pmax') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.pMax || '-' }}
                        <span v-if="item.content.pMax" class="text-xs text-gray-400">W</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_pmax_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Power Spikes -->
                  <div
                    v-if="editingIndex === index || item.content.powerSpikeThreshold"
                    class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_spikes')"
                        :help="t('sports_form_spikes_help')"
                      >
                        <UInput
                          v-model.number="editForm.powerSpikeThreshold"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_spikes') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.powerSpikeThreshold || '-' }}
                        <span v-if="item.content.powerSpikeThreshold" class="text-xs text-gray-400"
                          >%</span
                        >
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_spikes_help') }}
                      </div>
                    </template>
                  </div>
                </div>

                <!-- Power Zones Editor -->
                <div v-if="editingIndex === index" class="mt-4">
                  <ProfileZoneEditor
                    v-model="editForm.powerZones"
                    title="Power Zones"
                    units="W"
                    icon="i-lucide-zap"
                    icon-color="text-yellow-500"
                  >
                    <template #actions>
                      <UButton size="xs" variant="soft" @click="recalculateZones('power', 'edit')"
                        >Calculate Default</UButton
                      >
                    </template>
                  </ProfileZoneEditor>
                </div>
                <div
                  v-else-if="item.content.powerZones?.length"
                  class="p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl"
                >
                  <div class="text-xs font-bold uppercase text-gray-400 mb-3">
                    {{ t('zones_title_power') }}
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(zone, zIdx) in item.content.powerZones"
                      :key="zIdx"
                      class="p-2 border dark:border-gray-800 rounded text-xs flex justify-between bg-white dark:bg-gray-900"
                    >
                      <span class="text-muted truncate mr-1">{{ zone.name }}</span>
                      <span class="font-mono font-bold"
                        >{{ zone.min }}-{{ zone.max
                        }}<span class="text-[10px] ml-0.5 text-gray-400">W</span></span
                      >
                    </div>
                  </div>
                </div>
              </section>

              <!-- Heart Rate Settings -->
              <section class="space-y-4">
                <h4
                  class="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-2 dark:border-gray-800 flex items-center gap-2"
                >
                  <UIcon name="i-lucide-heart" class="w-4 h-4 text-red-500" />
                  {{ t('sports_section_hr') }}
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <!-- LTHR -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField :label="t('sports_form_lthr')" :help="t('sports_form_lthr_help')">
                        <UInput
                          v-model.number="editForm.lthr"
                          type="number"
                          size="xs"
                          class="w-full"
                          @update:model-value="handleThresholdChange('hr', 'edit')"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_lthr') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.lthr || '-' }}
                        <span v-if="item.content.lthr" class="text-xs text-gray-400">bpm</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_lthr_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Max HR -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_max_hr')"
                        :help="t('sports_form_max_hr_help')"
                      >
                        <UInput
                          v-model.number="editForm.maxHr"
                          type="number"
                          size="xs"
                          class="w-full"
                          @update:model-value="handleThresholdChange('hr', 'edit')"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_max_hr') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.maxHr || '-' }}
                        <span v-if="item.content.maxHr" class="text-xs text-gray-400">bpm</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_max_hr_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- Resting HR -->
                  <div
                    v-if="editingIndex === index || item.content.restingHr"
                    class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_resting_hr')"
                        :help="t('sports_form_resting_hr_help')"
                      >
                        <UInput
                          v-model.number="editForm.restingHr"
                          type="number"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_resting_hr') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ item.content.restingHr || '-' }}
                        <span v-if="item.content.restingHr" class="text-xs text-gray-400">bpm</span>
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_resting_hr_help') }}
                      </div>
                    </template>
                  </div>

                  <!-- HR Load Type -->
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_hr_load_type')"
                        :help="t('sports_form_hr_load_type_help')"
                      >
                        <USelectMenu
                          v-model="editForm.hrLoadType"
                          :items="['HRSS', 'AVG_HR', 'HR_ZONES']"
                          size="xs"
                          class="w-full"
                        />
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_hr_load_type') }}
                      </div>
                      <div class="text-sm font-medium h-7 flex items-center">
                        {{ item.content.hrLoadType || '-' }}
                      </div>
                      <div class="text-[10px] text-gray-400 mt-1">
                        {{ t('sports_form_hr_load_type_help') }}
                      </div>
                    </template>
                  </div>
                </div>

                <!-- HR Zones Editor -->
                <div v-if="editingIndex === index" class="mt-4">
                  <ProfileZoneEditor
                    v-model="editForm.hrZones"
                    :title="t('zones_title_hr')"
                    units="bpm"
                    icon="i-lucide-heart"
                    icon-color="text-red-500"
                  >
                    <template #actions>
                      <UButton size="xs" variant="soft" @click="recalculateZones('hr', 'edit')">{{
                        t('sports_button_recalculate')
                      }}</UButton>
                    </template>
                  </ProfileZoneEditor>
                </div>
                <div
                  v-else-if="item.content.hrZones?.length"
                  class="p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl"
                >
                  <div class="text-xs font-bold uppercase text-gray-400 mb-3">
                    {{ t('zones_title_hr') }}
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(zone, zIdx) in item.content.hrZones"
                      :key="zIdx"
                      class="p-2 border dark:border-gray-800 rounded text-xs flex justify-between bg-white dark:bg-gray-900"
                    >
                      <span class="text-muted truncate mr-1">{{ zone.name }}</span>
                      <span class="font-mono font-bold"
                        >{{ zone.min }}-{{ zone.max
                        }}<span class="text-[10px] ml-0.5 text-gray-400">bpm</span></span
                      >
                    </div>
                  </div>
                </div>
              </section>

              <!-- Pace Settings -->
              <section class="space-y-4">
                <h4
                  class="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-2 dark:border-gray-800"
                >
                  {{ t('sports_form_threshold_pace') }}
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <template v-if="editingIndex === index">
                      <UFormField
                        :label="t('sports_form_threshold_pace')"
                        :help="t('sports_form_threshold_pace_help_hint')"
                      >
                        <div class="flex gap-2">
                          <UInput
                            :model-value="editThresholdPaceInput"
                            placeholder="e.g. 4:10"
                            size="xs"
                            class="w-full"
                            @update:model-value="
                              onThresholdPaceInputChange('edit', $event as string)
                            "
                          />
                          <USelectMenu
                            :model-value="getPaceUnitForForm(editForm)"
                            :items="PACE_DISPLAY_UNITS"
                            value-key="value"
                            label-key="label"
                            size="xs"
                            class="w-28"
                            @update:model-value="
                              (val) => onThresholdPaceUnitChange('edit', val as PaceDisplayUnit)
                            "
                          />
                        </div>
                      </UFormField>
                    </template>
                    <template v-else>
                      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {{ t('sports_form_threshold_pace') }}
                      </div>
                      <div class="text-xl font-semibold h-7">
                        {{ formatThresholdPaceDisplay(item.content) }}
                      </div>
                    </template>
                  </div>
                </div>
                <div v-if="editingIndex === index" class="mt-4">
                  <ProfileZoneEditor
                    v-model="editForm.paceZones"
                    title="Pace Zones"
                    units="m/s"
                    icon="i-lucide-gauge"
                    icon-color="text-emerald-500"
                  >
                    <template #actions>
                      <UButton size="xs" variant="soft" @click="recalculateZones('pace', 'edit')">
                        {{ t('sports_button_recalculate') }}
                      </UButton>
                    </template>
                  </ProfileZoneEditor>
                </div>
                <div
                  v-else-if="item.content.paceZones?.length"
                  class="p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl"
                >
                  <div class="text-xs font-bold uppercase text-gray-400 mb-3">Pace Zones</div>
                  <div class="space-y-2">
                    <div
                      v-for="(zone, zIdx) in item.content.paceZones"
                      :key="zIdx"
                      class="p-2 border dark:border-gray-800 rounded text-xs flex justify-between bg-white dark:bg-gray-900"
                    >
                      <span class="text-muted truncate mr-1">{{ zone.name }}</span>
                      <span class="font-mono font-bold"
                        >{{ zone.min }}-{{ zone.max
                        }}<span class="text-[10px] ml-0.5 text-gray-400">m/s</span></span
                      >
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </template>
        </UAccordion>
      </div>
    </UCard>

    <!-- Autodetect Confirmation Modal -->
    <UModal
      v-model:open="showConfirmModal"
      :title="t('sports_modal_autodetect_title')"
      :description="t('sports_modal_autodetect_desc')"
    >
      <template #body>
        <div class="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <ul class="divide-y divide-gray-200 dark:divide-gray-700">
            <li
              v-for="(sport, idx) in pendingDiffs.sportSettings"
              :key="idx"
              class="p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div class="flex items-center gap-2 mb-2">
                <UIcon :name="getIconForTypes(sport.types)" class="w-4 h-4 text-primary" />
                <span class="font-semibold text-gray-900 dark:text-white">{{
                  sport.name || sport.types.join(', ')
                }}</span>
                <UBadge v-if="!sport.id" color="success" variant="subtle" size="xs" class="ml-auto">
                  {{ t('sports_badge_new_profile') }}
                </UBadge>
                <UBadge v-else color="warning" variant="subtle" size="xs" class="ml-auto">
                  {{ t('sports_badge_updated') }}
                </UBadge>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 pl-6">
                <div v-if="sport.ftp" class="flex justify-between">
                  <span>FTP:</span>
                  <span class="font-mono font-medium text-gray-900 dark:text-gray-200"
                    >{{ sport.ftp }}W</span
                  >
                </div>
                <div v-if="sport.lthr" class="flex justify-between">
                  <span>LTHR:</span>
                  <span class="font-mono font-medium text-gray-900 dark:text-gray-200"
                    >{{ sport.lthr }}bpm</span
                  >
                </div>
                <div v-if="sport.maxHr" class="flex justify-between">
                  <span>Max HR:</span>
                  <span class="font-mono font-medium text-gray-900 dark:text-gray-200"
                    >{{ sport.maxHr }}bpm</span
                  >
                </div>
                <div v-if="sport.powerZones" class="flex justify-between col-span-2">
                  <span>Power Zones:</span>
                  <span class="font-medium text-primary"
                    >{{ sport.powerZones.length }} zones detected</span
                  >
                </div>
                <div v-if="sport.hrZones" class="flex justify-between col-span-2">
                  <span>HR Zones:</span>
                  <span class="font-medium text-primary"
                    >{{ sport.hrZones.length }} zones detected</span
                  >
                </div>
              </div>
            </li>
          </ul>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showConfirmModal = false"
            >Cancel</UButton
          >
          <UButton color="primary" @click="confirmAutodetect">Apply Changes</UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="showWorkoutDetectModal"
      title="Detect from Workouts"
      description="Review detected threshold updates from recent workouts before applying."
    >
      <template #body>
        <div v-if="workoutDetectionResult" class="space-y-4">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Analyzed {{ workoutDetectionResult.workoutsAnalyzed }} workouts in last
            {{ workoutDetectionResult.lookbackDays }} days.
          </div>

          <div class="space-y-3">
            <div class="border rounded-lg p-3 border-gray-200 dark:border-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">FTP</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDetectedDelta('ftp') }}
                  </div>
                </div>
                <UCheckbox v-model="workoutDetectApply.ftp" :disabled="!canApplyDetection('ftp')" />
              </div>
            </div>

            <div class="border rounded-lg p-3 border-gray-200 dark:border-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">LTHR</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDetectedDelta('lthr') }}
                  </div>
                </div>
                <UCheckbox
                  v-model="workoutDetectApply.lthr"
                  :disabled="!canApplyDetection('lthr')"
                />
              </div>
            </div>

            <div class="border rounded-lg p-3 border-gray-200 dark:border-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">Max HR</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDetectedDelta('maxHr') }}
                  </div>
                </div>
                <UCheckbox
                  v-model="workoutDetectApply.maxHr"
                  :disabled="!canApplyDetection('maxHr')"
                />
              </div>
            </div>

            <div class="border rounded-lg p-3 border-gray-200 dark:border-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">Threshold Pace</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDetectedDelta('thresholdPace') }}
                  </div>
                </div>
                <UCheckbox
                  v-model="workoutDetectApply.thresholdPace"
                  :disabled="!canApplyDetection('thresholdPace')"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3 dark:border-gray-800">
            <UCheckbox
              v-model="workoutDetectApply.recalculatePowerZones"
              label="Recalculate Power Zones from FTP"
            />
            <UCheckbox
              v-model="workoutDetectApply.recalculateHrZones"
              label="Recalculate HR Zones from LTHR/Max HR"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showWorkoutDetectModal = false">
            Cancel
          </UButton>
          <UButton color="primary" @click="applyWorkoutDetection">Apply Selected</UButton>
        </div>
      </template>
    </UModal>

    <!-- Add Sport Slideover -->
    <USlideover
      v-model:open="showAddModal"
      :title="t('sports_button_create')"
      :description="t('sports_description')"
    >
      <template #content>
        <div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
          <UForm :state="addForm" class="space-y-8" @submit="addSport">
            <!-- Activity Types -->
            <section class="space-y-4">
              <h4
                class="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-2 dark:border-gray-800"
              >
                {{ t('sports_section_general') }}
              </h4>
              <UFormField
                :label="t('sports_form_profile_name')"
                name="name"
                :help="t('sports_form_profile_name_placeholder')"
              >
                <UInput
                  v-model="addForm.name"
                  :placeholder="t('sports_form_profile_name_placeholder')"
                />
              </UFormField>
              <UFormField
                :label="t('sports_form_assign_types')"
                name="types"
                required
                :help="t('sports_form_assign_types')"
              >
                <USelectMenu
                  v-model="addForm.types"
                  :items="availableSports"
                  multiple
                  :placeholder="t('sports_form_assign_types_placeholder')"
                  class="w-full"
                  :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
                />
              </UFormField>
            </section>

            <!-- Power Settings -->
            <section class="space-y-4">
              <div class="flex items-center justify-between border-b pb-2 dark:border-gray-800">
                <h4
                  class="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2"
                >
                  <UIcon name="i-lucide-zap" class="w-4 h-4 text-yellow-500" />
                  {{ t('sports_section_power') }}
                </h4>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <UFormField
                  :label="t('sports_form_ftp')"
                  name="ftp"
                  :help="t('sports_form_ftp_help')"
                >
                  <UInput
                    v-model.number="addForm.ftp"
                    type="number"
                    placeholder="e.g. 229"
                    @update:model-value="handleThresholdChange('power', 'add')"
                  />
                </UFormField>
                <UFormField
                  :label="t('sports_form_indoor_ftp')"
                  name="indoorFtp"
                  :help="t('sports_form_indoor_ftp_help')"
                >
                  <UInput v-model.number="addForm.indoorFtp" type="number" />
                </UFormField>
              </div>

              <!-- Power Zones (Calculated) -->
              <div class="mt-4">
                <ProfileZoneEditor
                  v-model="addForm.powerZones"
                  title="Power Zones"
                  units="W"
                  icon="i-lucide-zap"
                  icon-color="text-yellow-500"
                >
                  <template #actions>
                    <UButton size="xs" variant="soft" @click="recalculateZones('power', 'add')">{{
                      t('sports_button_recalculate')
                    }}</UButton>
                  </template>
                </ProfileZoneEditor>
              </div>
            </section>

            <!-- Heart Rate Settings -->
            <section class="space-y-4">
              <div class="flex items-center justify-between border-b pb-2 dark:border-gray-800">
                <h4
                  class="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2"
                >
                  <UIcon name="i-lucide-heart" class="w-4 h-4 text-red-500" />
                  {{ t('sports_section_hr') }}
                </h4>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <UFormField
                  :label="t('sports_form_lthr')"
                  name="lthr"
                  :help="t('sports_form_lthr_help')"
                >
                  <UInput
                    v-model.number="addForm.lthr"
                    type="number"
                    placeholder="e.g. 168"
                    @update:model-value="handleThresholdChange('hr', 'add')"
                  />
                </UFormField>
                <UFormField
                  :label="t('sports_form_max_hr')"
                  name="maxHr"
                  :help="t('sports_form_max_hr_help')"
                >
                  <UInput
                    v-model.number="addForm.maxHr"
                    type="number"
                    placeholder="e.g. 185"
                    @update:model-value="handleThresholdChange('hr', 'add')"
                  />
                </UFormField>
              </div>

              <!-- HR Zones (Calculated) -->
              <div class="mt-4">
                <ProfileZoneEditor
                  v-model="addForm.hrZones"
                  :title="t('zones_title_hr')"
                  units="bpm"
                  icon="i-lucide-heart"
                  icon-color="text-red-500"
                >
                  <template #actions>
                    <UButton size="xs" variant="soft" @click="recalculateZones('hr', 'add')">{{
                      t('sports_button_recalculate')
                    }}</UButton>
                  </template>
                </ProfileZoneEditor>
              </div>
            </section>

            <!-- Advanced Metrics (Collapsible) -->
            <UAccordion
              :items="[
                {
                  label: t('sports_section_advanced'),
                  slot: 'advanced',
                  icon: 'i-lucide-settings-2'
                }
              ]"
              size="sm"
            >
              <template #advanced>
                <div class="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-xs">
                  <UFormField
                    :label="t('sports_form_eftp')"
                    name="eFtp"
                    :help="t('sports_form_eftp_help')"
                  >
                    <UInput v-model.number="addForm.eFtp" type="number" />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_pmax')"
                    name="pMax"
                    :help="t('sports_form_pmax_help')"
                  >
                    <UInput v-model.number="addForm.pMax" type="number" />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_wprime')"
                    name="wPrime"
                    :help="t('sports_form_wprime_help')"
                  >
                    <UInput v-model.number="addForm.wPrime" type="number" />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_spikes')"
                    name="powerSpikeThreshold"
                    :help="t('sports_form_spikes_help')"
                  >
                    <UInput
                      v-model.number="addForm.powerSpikeThreshold"
                      type="number"
                      placeholder="30"
                    />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_resting_hr')"
                    name="restingHr"
                    :help="t('sports_form_resting_hr_help')"
                  >
                    <UInput v-model.number="addForm.restingHr" type="number" />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_hr_load_type')"
                    name="hrLoadType"
                    :help="t('sports_form_hr_load_type_help')"
                  >
                    <USelectMenu
                      v-model="addForm.hrLoadType"
                      :items="['HRSS', 'AVG_HR', 'HR_ZONES']"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_threshold_pace')"
                    name="thresholdPace"
                    :help="t('sports_form_threshold_pace_help')"
                  >
                    <div class="flex gap-2">
                      <UInput
                        :model-value="addThresholdPaceInput"
                        placeholder="e.g. 4:10"
                        @update:model-value="onThresholdPaceInputChange('add', $event as string)"
                      />
                      <USelectMenu
                        :model-value="getPaceUnitForForm(addForm)"
                        :items="PACE_DISPLAY_UNITS"
                        value-key="value"
                        label-key="label"
                        class="w-28"
                        @update:model-value="
                          (val) => onThresholdPaceUnitChange('add', val as PaceDisplayUnit)
                        "
                      />
                    </div>
                  </UFormField>
                  <UFormField
                    label="Primary Target Metric"
                    name="targetPolicy.primaryMetric"
                    help="Preferred metric for step targeting."
                  >
                    <USelectMenu
                      v-model="addForm.targetPolicy.primaryMetric"
                      :items="TARGET_METRICS"
                      class="w-full"
                      @update:model-value="syncTargetingPolicy(addForm, 'primaryMetric')"
                    />
                  </UFormField>
                  <UFormField
                    label="Default Target Style"
                    name="targetPolicy.defaultTargetStyle"
                    help="Choose how targets are written by default. 'range' creates a min-max zone (recommended for steady work); 'value' creates a single fixed target."
                  >
                    <USelectMenu
                      v-model="addForm.targetPolicy.defaultTargetStyle"
                      :items="TARGET_STYLES"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="Strict Primary Metric"
                    name="targetPolicy.strictPrimary"
                    help="Force generation to use only the primary metric when possible, instead of falling back to other metrics."
                  >
                    <div class="h-10 flex items-center">
                      <USwitch v-model="addForm.targetPolicy.strictPrimary" />
                    </div>
                  </UFormField>
                  <UFormField
                    label="Allow Mixed Targets Per Step"
                    name="targetPolicy.allowMixedTargetsPerStep"
                    help="Allow a single step to include multiple metrics (for example HR + Pace). Disable to keep one metric per step."
                  >
                    <div class="h-10 flex items-center">
                      <USwitch v-model="addForm.targetPolicy.allowMixedTargetsPerStep" />
                    </div>
                  </UFormField>
                  <UFormField
                    label="Prefer Ranges for Steady Work"
                    name="targetPolicy.preferRangesForSteady"
                    help="For endurance/steady blocks, prefer ranges (for example 70-80%) instead of single-point targets."
                  >
                    <div class="h-10 flex items-center">
                      <USwitch v-model="addForm.targetPolicy.preferRangesForSteady" />
                    </div>
                  </UFormField>
                  <UFormField
                    label="HR Target Format"
                    name="targetFormatPolicy.heartRate.mode"
                    help="How HR targets are represented in steps."
                  >
                    <USelectMenu
                      v-model="addForm.targetFormatPolicy.heartRate.mode"
                      :items="HR_TARGET_FORMATS"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="Power Target Format"
                    name="targetFormatPolicy.power.mode"
                    help="How power targets are represented in steps."
                  >
                    <USelectMenu
                      v-model="addForm.targetFormatPolicy.power.mode"
                      :items="POWER_TARGET_FORMATS"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="Pace Target Format"
                    name="targetFormatPolicy.pace.mode"
                    help="How pace targets are represented in steps."
                  >
                    <USelectMenu
                      v-model="addForm.targetFormatPolicy.pace.mode"
                      :items="PACE_TARGET_FORMATS"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="Cadence Target Format"
                    name="targetFormatPolicy.cadence.mode"
                    help="Choose if cadence is omitted, single RPM, or RPM range."
                  >
                    <USelectMenu
                      v-model="addForm.targetFormatPolicy.cadence.mode"
                      :items="CADENCE_TARGET_FORMATS"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_load_priority')"
                    name="loadPreference"
                    :help="t('sports_form_load_priority_help')"
                  >
                    <USelectMenu
                      v-model="addForm.loadPreference"
                      :items="LOAD_PREFERENCES"
                      class="w-full"
                      @update:model-value="syncTargetingPolicy(addForm, 'loadPreference')"
                    />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_warmup')"
                    name="warmupTime"
                    :help="t('sports_form_warmup_help')"
                  >
                    <UInput v-model.number="addForm.warmupTime" type="number" />
                  </UFormField>
                  <UFormField
                    :label="t('sports_form_cooldown')"
                    name="cooldownTime"
                    :help="t('sports_form_cooldown_help')"
                  >
                    <UInput v-model.number="addForm.cooldownTime" type="number" />
                  </UFormField>
                </div>
                <div class="pt-4">
                  <ProfileZoneEditor
                    v-model="addForm.paceZones"
                    title="Pace Zones"
                    units="m/s"
                    icon="i-lucide-gauge"
                    icon-color="text-emerald-500"
                  >
                    <template #actions>
                      <UButton size="xs" variant="soft" @click="recalculateZones('pace', 'add')">
                        {{ t('sports_button_recalculate') }}
                      </UButton>
                    </template>
                  </ProfileZoneEditor>
                </div>
              </template>
            </UAccordion>

            <div
              class="pt-6 flex justify-end gap-3 border-t dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900 pb-2 z-10"
            >
              <UButton color="neutral" variant="ghost" @click="showAddModal = false"
                >Cancel</UButton
              >
              <UButton type="submit" color="primary">{{ t('sports_button_create') }}</UButton>
            </div>
          </UForm>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { WORKOUT_ICONS } from '~/utils/activity-types'

  const { t } = useTranslate('profile')

  const props = defineProps<{
    settings: any[]
    profile?: any
  }>()

  const emit = defineEmits(['update:settings', 'autodetect'])

  const toast = useToast()
  const editingIndex = ref<number | null>(null)
  const editForm = ref<any>({})
  const editThresholdPaceInput = ref('')

  const showAddModal = ref(false)
  const openItems = ref<string[]>(['0']) // Open the first item (Default) by default
  const addThresholdPaceInput = ref('')
  const addForm = ref<any>({
    name: '',
    types: [],
    ftp: null,
    eFtp: null,
    indoorFtp: null,
    wPrime: null,
    eWPrime: null,
    pMax: null,
    ePMax: null,
    powerSpikeThreshold: 30,
    eftpMinDuration: 300,
    lthr: null,
    maxHr: null,
    restingHr: null,
    hrLoadType: 'HRSS',
    thresholdPace: null,
    paceZones: [],
    zoneConfiguration: {
      paceDisplayUnit: 'PER_KM'
    },
    warmupTime: 10,
    cooldownTime: 10,
    loadPreference: 'POWER_HR_PACE',
    targetPolicy: {
      primaryMetric: 'power',
      strictPrimary: true,
      allowMixedTargetsPerStep: false,
      defaultTargetStyle: 'range',
      preferRangesForSteady: true
    },
    targetFormatPolicy: {
      heartRate: { mode: 'percentLthr', preferRange: true },
      power: { mode: 'percentFtp', preferRange: true },
      pace: { mode: 'percentPace', preferRange: true },
      cadence: { mode: 'rpm' }
    },
    powerZones: [],
    hrZones: []
  })

  // Auto-detect State
  const autodetecting = ref(false)
  const showConfirmModal = ref(false)
  const pendingDiffs = ref<any>({})
  const pendingDetectedProfile = ref<any>({})
  const detectingSportId = ref<string | null>(null)
  const showWorkoutDetectModal = ref(false)
  const workoutDetectionResult = ref<any | null>(null)
  const workoutDetectApply = ref({
    ftp: false,
    lthr: false,
    maxHr: false,
    thresholdPace: false,
    recalculatePowerZones: true,
    recalculateHrZones: true
  })

  const availableSports = Object.keys(WORKOUT_ICONS).sort()

  const accordionItems = computed(() => {
    // Sort: Default first, then others
    const sorted = [...props.settings].sort((a, b) => {
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      return 0
    })

    return sorted.map((s, i) => ({
      label: s.name || (s.isDefault ? 'Default Profile' : s.types.join(', ')),
      icon: s.isDefault ? 'i-lucide-globe' : getIconForTypes(s.types),
      content: s,
      value: String(i),
      slot: 'sport-item'
    }))
  })

  // Methodology Constants from user request
  const POWER_PCT = [0.55, 0.75, 0.9, 1.05, 1.2, 1.5, 9.99]
  const POWER_NAMES = [
    'Z1 Active Recovery',
    'Z2 Endurance',
    'Z3 Tempo',
    'Z4 Threshold',
    'Z5 VO2 Max',
    'Z6 Anaerobic',
    'Z7 Neuromuscular'
  ]
  const SS_PCT = [0.84, 0.97]

  const HR_PCT = [0.8, 0.89, 0.93, 0.99, 1.02, 1.05, 1.1]
  const HR_NAMES = [
    'Z1 Recovery',
    'Z2 Aerobic',
    'Z3 Tempo',
    'Z4 SubThreshold',
    'Z5 SuperThreshold',
    'Z6 Aerobic Capacity',
    'Z7 Anaerobic'
  ]

  const LOAD_PREFERENCES = [
    'POWER_HR_PACE',
    'POWER_PACE_HR',
    'HR_POWER_PACE',
    'HR_PACE_POWER',
    'PACE_POWER_HR',
    'PACE_HR_POWER'
  ]
  const TARGET_METRICS = ['heartRate', 'power', 'pace', 'rpe']
  const TARGET_STYLES = ['range', 'value']
  const HR_TARGET_FORMATS = ['percentLthr', 'percentMaxHr', 'zone', 'bpm']
  const POWER_TARGET_FORMATS = ['percentFtp', 'zone', 'watts']
  const PACE_TARGET_FORMATS = ['percentPace', 'zone', 'absolutePace']
  const CADENCE_TARGET_FORMATS = ['none', 'rpm', 'rpmRange']
  const PACE_ZONE_PCT = [0.78, 0.88, 0.95, 1.02, 1.08, 1.15]
  const PACE_ZONE_NAMES = [
    'Z1 Easy',
    'Z2 Endurance',
    'Z3 Tempo',
    'Z4 Threshold',
    'Z5 VO2',
    'Z6 Fast'
  ]
  const PACE_DISPLAY_UNITS = [
    { label: 'min/km', value: 'PER_KM' },
    { label: 'min/mi', value: 'PER_MILE' },
    { label: 'min/500m', value: 'PER_500M' },
    { label: 'min/250m', value: 'PER_250M' }
  ] as const

  type PaceDisplayUnit = 'PER_KM' | 'PER_MILE' | 'PER_500M' | 'PER_250M'

  function openAddModal() {
    showAddModal.value = true

    // Pre-fill with user profile defaults if available
    if (props.profile) {
      if (props.profile.ftp) addForm.value.ftp = props.profile.ftp
      if (props.profile.lthr) addForm.value.lthr = props.profile.lthr
      if (props.profile.maxHr) addForm.value.maxHr = props.profile.maxHr
      if (props.profile.restingHr) addForm.value.restingHr = props.profile.restingHr

      // Auto-calculate zones if we have the base metrics
      if (addForm.value.ftp) {
        recalculateZones('power', 'add')
      }
      if (addForm.value.lthr || addForm.value.maxHr) {
        recalculateZones('hr', 'add')
      }
    }
    ensurePaceConfig(addForm.value)
    addThresholdPaceInput.value = formatThresholdPaceForInput(
      addForm.value.thresholdPace,
      getPaceUnitForForm(addForm.value)
    )
  }

  function startEdit(index: number, content: any) {
    editingIndex.value = index
    // Clone content to editForm to avoid direct mutation
    editForm.value = JSON.parse(JSON.stringify(content))

    // Ensure zones exist
    if (!editForm.value.powerZones) editForm.value.powerZones = []
    if (!editForm.value.hrZones) editForm.value.hrZones = []
    if (!editForm.value.paceZones) editForm.value.paceZones = []
    ensurePaceConfig(editForm.value)
    if (!editForm.value.targetPolicy || typeof editForm.value.targetPolicy !== 'object') {
      editForm.value.targetPolicy = {}
    }
    if (
      !editForm.value.targetFormatPolicy ||
      typeof editForm.value.targetFormatPolicy !== 'object'
    ) {
      editForm.value.targetFormatPolicy = {}
    }
    if (!editForm.value.targetPolicy.primaryMetric) {
      editForm.value.targetPolicy.primaryMetric = derivePrimaryMetric(editForm.value.loadPreference)
    }
    if (!editForm.value.targetPolicy.defaultTargetStyle) {
      editForm.value.targetPolicy.defaultTargetStyle = 'range'
    }
    if (typeof editForm.value.targetPolicy.strictPrimary !== 'boolean') {
      editForm.value.targetPolicy.strictPrimary = true
    }
    if (typeof editForm.value.targetPolicy.allowMixedTargetsPerStep !== 'boolean') {
      editForm.value.targetPolicy.allowMixedTargetsPerStep = false
    }
    if (typeof editForm.value.targetPolicy.preferRangesForSteady !== 'boolean') {
      editForm.value.targetPolicy.preferRangesForSteady = true
    }
    if (
      !editForm.value.targetFormatPolicy.heartRate ||
      typeof editForm.value.targetFormatPolicy.heartRate !== 'object'
    ) {
      editForm.value.targetFormatPolicy.heartRate = {}
    }
    if (
      !editForm.value.targetFormatPolicy.power ||
      typeof editForm.value.targetFormatPolicy.power !== 'object'
    ) {
      editForm.value.targetFormatPolicy.power = {}
    }
    if (
      !editForm.value.targetFormatPolicy.pace ||
      typeof editForm.value.targetFormatPolicy.pace !== 'object'
    ) {
      editForm.value.targetFormatPolicy.pace = {}
    }
    if (
      !editForm.value.targetFormatPolicy.cadence ||
      typeof editForm.value.targetFormatPolicy.cadence !== 'object'
    ) {
      editForm.value.targetFormatPolicy.cadence = {}
    }
    if (!editForm.value.targetFormatPolicy.heartRate.mode)
      editForm.value.targetFormatPolicy.heartRate.mode = 'percentLthr'
    if (typeof editForm.value.targetFormatPolicy.heartRate.preferRange !== 'boolean')
      editForm.value.targetFormatPolicy.heartRate.preferRange = true
    if (!editForm.value.targetFormatPolicy.power.mode)
      editForm.value.targetFormatPolicy.power.mode = 'percentFtp'
    if (typeof editForm.value.targetFormatPolicy.power.preferRange !== 'boolean')
      editForm.value.targetFormatPolicy.power.preferRange = true
    if (!editForm.value.targetFormatPolicy.pace.mode)
      editForm.value.targetFormatPolicy.pace.mode = 'percentPace'
    if (typeof editForm.value.targetFormatPolicy.pace.preferRange !== 'boolean')
      editForm.value.targetFormatPolicy.pace.preferRange = true
    if (!editForm.value.targetFormatPolicy.cadence.mode)
      editForm.value.targetFormatPolicy.cadence.mode = 'rpm'
    // Ensure name exists
    if (!editForm.value.name)
      editForm.value.name = content.isDefault
        ? 'Default Profile'
        : content.types?.join(', ') || 'Sport Profile'

    editThresholdPaceInput.value = formatThresholdPaceForInput(
      editForm.value.thresholdPace,
      getPaceUnitForForm(editForm.value)
    )
  }

  function cancelEdit() {
    editingIndex.value = null
    editForm.value = {}
  }

  function saveEdit(index: number) {
    const item = accordionItems.value[index]
    if (!item) return

    // Find the original item in props.settings to update
    const modifiedItem = item.content
    // Map back to original array
    const newSettings = props.settings.map((s) => {
      // Match by ID if exists, or reference equality if simple object
      if (
        s === modifiedItem ||
        (s.id && s.id === modifiedItem.id) ||
        (s.externalId && s.externalId === modifiedItem.externalId)
      ) {
        return { ...s, ...editForm.value }
      }
      return s
    })

    emit('update:settings', newSettings)
    cancelEdit()
  }

  function deleteSport(index: number) {
    const item = accordionItems.value[index]
    if (!item) return

    const itemToDelete = item.content
    if (itemToDelete.isDefault) {
      alert('Cannot delete the default profile.')
      return
    }

    if (confirm('Are you sure you want to remove this sport profile?')) {
      const newSettings = props.settings.filter(
        (s) =>
          s !== itemToDelete &&
          (!s.id || s.id !== itemToDelete.id) &&
          (!s.externalId || s.externalId !== itemToDelete.externalId)
      )
      emit('update:settings', newSettings)
    }
  }

  function handleThresholdChange(type: 'power' | 'hr' | 'pace', mode: 'add' | 'edit') {
    recalculateZones(type, mode)
  }

  function copySettings(targetIndex: number, sourceProfile: any) {
    const item = accordionItems.value[targetIndex]
    if (!item) return

    const targetProfile = item.content

    // Start editing
    editingIndex.value = targetIndex

    // Clone target to editForm first to keep its identity (name/types)
    editForm.value = JSON.parse(JSON.stringify(targetProfile))

    // List of fields to copy (everything except identity and ID)
    const fieldsToCopy = [
      'ftp',
      'eFtp',
      'indoorFtp',
      'wPrime',
      'eWPrime',
      'pMax',
      'ePMax',
      'powerSpikeThreshold',
      'eftpMinDuration',
      'lthr',
      'maxHr',
      'restingHr',
      'hrLoadType',
      'thresholdPace',
      'paceZones',
      'warmupTime',
      'cooldownTime',
      'loadPreference',
      'targetPolicy',
      'targetFormatPolicy',
      'powerZones',
      'hrZones'
    ]

    fieldsToCopy.forEach((field) => {
      if (sourceProfile[field] !== undefined) {
        editForm.value[field] = JSON.parse(JSON.stringify(sourceProfile[field]))
      }
    })

    toast.add({
      title: 'Settings Copied',
      description: `Copied settings from ${
        sourceProfile.name || sourceProfile.types?.join(', ') || 'another profile'
      }. Review and save changes.`,
      color: 'primary'
    })
  }

  const getCopyOptions = (index: number) => {
    const item = accordionItems.value[index]
    if (!item) return []
    const currentItem = item.content
    const otherSports = props.settings.filter(
      (s) => s !== currentItem && (s.id !== currentItem.id || !s.id)
    )

    if (otherSports.length === 0) return []

    return [
      otherSports.map((s) => ({
        label: s.name || (s.isDefault ? 'Default Profile' : s.types.join(', ')),
        icon: s.isDefault ? 'i-lucide-globe' : getIconForTypes(s.types),
        onSelect: () => copySettings(index, s)
      }))
    ]
  }

  function paceUnitDistanceMeters(unit: PaceDisplayUnit) {
    if (unit === 'PER_MILE') return 1609.344
    if (unit === 'PER_500M') return 500
    if (unit === 'PER_250M') return 250
    return 1000
  }

  function ensurePaceConfig(form: any) {
    if (!form.zoneConfiguration || typeof form.zoneConfiguration !== 'object') {
      form.zoneConfiguration = {}
    }
    if (!form.zoneConfiguration.paceDisplayUnit) {
      form.zoneConfiguration.paceDisplayUnit = 'PER_KM'
    }
  }

  function getPaceUnitForForm(form: any): PaceDisplayUnit {
    ensurePaceConfig(form)
    return form.zoneConfiguration.paceDisplayUnit
  }

  function parsePaceTextToMps(value: string, unit: PaceDisplayUnit): number | null {
    const raw = value.trim()
    if (!raw) return null

    let totalSeconds = NaN
    if (raw.includes(':')) {
      const [mRaw, sRaw] = raw.split(':')
      const minutes = Number(mRaw)
      const seconds = Number(sRaw)
      if (Number.isFinite(minutes) && Number.isFinite(seconds) && minutes >= 0 && seconds >= 0) {
        totalSeconds = minutes * 60 + seconds
      }
    } else {
      totalSeconds = Number(raw)
    }

    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null

    const meters = paceUnitDistanceMeters(unit)
    return meters / totalSeconds
  }

  function formatSecondsAsPace(totalSeconds: number) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '-'
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.round(totalSeconds % 60)
    const normalizedMins = secs === 60 ? mins + 1 : mins
    const normalizedSecs = secs === 60 ? 0 : secs
    return `${normalizedMins}:${String(normalizedSecs).padStart(2, '0')}`
  }

  function formatThresholdPaceForInput(
    metersPerSecond: number | null | undefined,
    unit: PaceDisplayUnit
  ) {
    if (!metersPerSecond || metersPerSecond <= 0) return ''
    const totalSeconds = paceUnitDistanceMeters(unit) / metersPerSecond
    return formatSecondsAsPace(totalSeconds)
  }

  function formatThresholdPaceDisplay(sport: any) {
    const mps = Number(sport?.thresholdPace || 0)
    if (!mps) return '-'

    const unit = (sport?.zoneConfiguration?.paceDisplayUnit || 'PER_KM') as PaceDisplayUnit
    const suffixMap: Record<PaceDisplayUnit, string> = {
      PER_KM: '/km',
      PER_MILE: '/mi',
      PER_500M: '/500m',
      PER_250M: '/250m'
    }

    return `${formatThresholdPaceForInput(mps, unit)}${suffixMap[unit] || '/km'}`
  }

  function onThresholdPaceInputChange(mode: 'add' | 'edit', value: string) {
    const form = mode === 'add' ? addForm.value : editForm.value
    const unit = getPaceUnitForForm(form)
    const parsed = parsePaceTextToMps(value || '', unit)

    if (mode === 'add') addThresholdPaceInput.value = value || ''
    else editThresholdPaceInput.value = value || ''

    form.thresholdPace = parsed ? Number(parsed.toFixed(3)) : null
  }

  function onThresholdPaceUnitChange(mode: 'add' | 'edit', unit: PaceDisplayUnit) {
    const form = mode === 'add' ? addForm.value : editForm.value
    ensurePaceConfig(form)
    form.zoneConfiguration.paceDisplayUnit = unit

    const formatted = formatThresholdPaceForInput(form.thresholdPace, unit)
    if (mode === 'add') addThresholdPaceInput.value = formatted
    else editThresholdPaceInput.value = formatted
  }

  function buildPowerZonesFromFtp(ftp: number) {
    const zones = POWER_PCT.map((pct, i) => {
      const prevPct = i === 0 ? 0 : (POWER_PCT[i - 1] ?? 0)
      return {
        name: POWER_NAMES[i],
        min: Math.round(ftp * prevPct) + (i === 0 ? 0 : 1),
        max: pct > 5 ? 2000 : Math.round(ftp * pct)
      }
    })

    if (SS_PCT.length >= 2) {
      zones.push({
        name: 'SS Sweet Spot',
        min: Math.round(ftp * (SS_PCT[0] ?? 0)),
        max: Math.round(ftp * (SS_PCT[1] ?? 0))
      })
    }

    return zones
  }

  function buildHrZonesFromThreshold(lthr?: number | null, maxHrInput?: number | null) {
    const threshold = lthr || (maxHrInput ? Math.round(maxHrInput * 0.85) : 160)
    const maxHr = maxHrInput || Math.round(threshold * 1.1)

    return HR_PCT.map((pct, i) => {
      const prevPct = i === 0 ? 0 : (HR_PCT[i - 1] ?? 0)
      return {
        name: HR_NAMES[i],
        min: Math.round(threshold * prevPct) + (i === 0 ? 0 : 1),
        max: i === HR_PCT.length - 1 ? maxHr : Math.round(threshold * pct)
      }
    })
  }

  function buildPaceZonesFromThreshold(thresholdPace: number) {
    return PACE_ZONE_PCT.map((pct, i) => {
      const prevPct = i === 0 ? 0.6 : (PACE_ZONE_PCT[i - 1] ?? 0.6)
      return {
        name: PACE_ZONE_NAMES[i],
        min: Number((thresholdPace * prevPct).toFixed(2)),
        max: Number((thresholdPace * pct).toFixed(2))
      }
    })
  }

  function recalculateZones(type: 'power' | 'hr' | 'pace', mode: 'add' | 'edit') {
    const form = mode === 'add' ? addForm.value : editForm.value

    if (type === 'power' && form.ftp) {
      form.powerZones = buildPowerZonesFromFtp(form.ftp)
    }

    if (type === 'hr' && (form.lthr || form.maxHr)) {
      form.hrZones = buildHrZonesFromThreshold(form.lthr, form.maxHr)
    }

    if (type === 'pace' && form.thresholdPace) {
      form.paceZones = buildPaceZonesFromThreshold(form.thresholdPace)
    }
  }

  function addSport() {
    if (!addForm.value.types.length) return

    const newSport = {
      ...addForm.value,
      name: addForm.value.name || addForm.value.types.join(', '),
      externalId: `manual_${Date.now()}`,
      source: 'manual'
    }

    const newSettings = [...props.settings, newSport]
    emit('update:settings', newSettings)

    // Reset
    showAddModal.value = false
    addForm.value = {
      name: '',
      types: [],
      ftp: null,
      eFtp: null,
      indoorFtp: null,
      wPrime: null,
      eWPrime: null,
      pMax: null,
      ePMax: null,
      powerSpikeThreshold: 30,
      eftpMinDuration: 300,
      lthr: null,
      maxHr: null,
      restingHr: null,
      hrLoadType: 'HRSS',
      thresholdPace: null,
      paceZones: [],
      zoneConfiguration: {
        paceDisplayUnit: 'PER_KM'
      },
      warmupTime: 10,
      cooldownTime: 10,
      loadPreference: 'POWER_HR_PACE',
      targetPolicy: {
        primaryMetric: 'power',
        strictPrimary: true,
        allowMixedTargetsPerStep: false,
        defaultTargetStyle: 'range',
        preferRangesForSteady: true
      },
      targetFormatPolicy: {
        heartRate: { mode: 'percentLthr', preferRange: true },
        power: { mode: 'percentFtp', preferRange: true },
        pace: { mode: 'percentPace', preferRange: true },
        cadence: { mode: 'rpm' }
      },
      powerZones: [],
      hrZones: []
    }
  }

  function getIconForTypes(types: string[]) {
    if (types.includes('Run') || types.includes('VirtualRun')) return 'i-lucide-footprints'
    if (types.includes('Ride') || types.includes('VirtualRide')) return 'i-lucide-bike'
    if (types.includes('Swim')) return 'i-lucide-waves'

    if (types.some((t) => t.toLowerCase().includes('run'))) return 'i-lucide-footprints'
    if (types.some((t) => t.toLowerCase().includes('ride'))) return 'i-lucide-bike'
    if (types.some((t) => t.toLowerCase().includes('swim'))) return 'i-lucide-waves'
    return 'i-lucide-settings-2'
  }

  function derivePrimaryMetric(loadPreference?: string): string {
    if (!loadPreference) return 'power'
    const first = loadPreference.split('_')[0]?.toUpperCase()
    if (first === 'HR') return 'heartRate'
    if (first === 'PACE') return 'pace'
    if (first === 'RPE') return 'rpe'
    return 'power'
  }

  function metricToLoadPreferenceToken(metric?: string): string {
    if (metric === 'heartRate') return 'HR'
    if (metric === 'pace') return 'PACE'
    if (metric === 'rpe') return 'RPE'
    return 'POWER'
  }

  function movePrimaryMetricToFront(
    loadPreference: string | undefined,
    primaryMetric?: string
  ): string {
    const preferred = metricToLoadPreferenceToken(primaryMetric)
    const tokens = String(loadPreference || 'POWER_HR_PACE')
      .split('_')
      .map((token) => token.trim().toUpperCase())
      .filter((token) => ['POWER', 'HR', 'PACE', 'RPE'].includes(token))

    const ordered: string[] = [preferred]
    for (const token of tokens) {
      if (!ordered.includes(token)) ordered.push(token)
    }
    for (const token of ['POWER', 'HR', 'PACE']) {
      if (!ordered.includes(token)) ordered.push(token)
    }

    return ordered.join('_')
  }

  function syncTargetingPolicy(form: any, changed: 'loadPreference' | 'primaryMetric') {
    if (!form) return
    if (!form.targetPolicy || typeof form.targetPolicy !== 'object') {
      form.targetPolicy = {}
    }

    if (changed === 'loadPreference') {
      form.targetPolicy.primaryMetric = derivePrimaryMetric(form.loadPreference)
      return
    }

    form.loadPreference = movePrimaryMetricToFront(
      form.loadPreference,
      form.targetPolicy.primaryMetric
    )
  }

  function formatMetricTarget(metric?: string): string {
    if (metric === 'heartRate') return 'Heart Rate'
    if (metric === 'power') return 'Power'
    if (metric === 'pace') return 'Pace'
    if (metric === 'rpe') return 'RPE'
    return 'Power'
  }

  function formatTargetStyle(style?: string): string {
    return style === 'value' ? 'Single Value' : 'Range'
  }

  function formatTargetFormat(kind: 'hr' | 'power' | 'pace' | 'cadence', mode?: string): string {
    if (kind === 'hr') {
      if (mode === 'percentMaxHr') return '% Max HR'
      if (mode === 'zone') return 'Zone'
      if (mode === 'bpm') return 'BPM'
      return '% LTHR'
    }
    if (kind === 'power') {
      if (mode === 'zone') return 'Zone'
      if (mode === 'watts') return 'Watts'
      return '% FTP'
    }
    if (kind === 'pace') {
      if (mode === 'zone') return 'Zone'
      if (mode === 'absolutePace') return 'Absolute Pace'
      return '% Pace'
    }
    if (mode === 'none') return 'None'
    if (mode === 'rpmRange') return 'RPM Range'
    return 'RPM'
  }

  function formatDetectedMetricValue(metric: string, value: number | null | undefined) {
    if (value === null || value === undefined) return '-'
    if (metric === 'ftp') return `${Math.round(value)}W`
    if (metric === 'lthr' || metric === 'maxHr') return `${Math.round(value)} bpm`
    if (metric === 'thresholdPace') {
      const detectUnit =
        (workoutDetectionResult.value?.sportSetting?.paceDisplayUnit as PaceDisplayUnit) || 'PER_KM'
      const suffixMap: Record<PaceDisplayUnit, string> = {
        PER_KM: '/km',
        PER_MILE: '/mi',
        PER_500M: '/500m',
        PER_250M: '/250m'
      }
      return `${formatThresholdPaceForInput(value, detectUnit)}${suffixMap[detectUnit] || '/km'}`
    }
    return String(value)
  }

  function canApplyDetection(metric: 'ftp' | 'lthr' | 'maxHr' | 'thresholdPace') {
    return Boolean(workoutDetectionResult.value?.detections?.[metric]?.detected)
  }

  function formatDetectedDelta(metric: 'ftp' | 'lthr' | 'maxHr' | 'thresholdPace') {
    const d = workoutDetectionResult.value?.detections?.[metric]
    if (!d) return 'No data'

    if (!d.available) return d.reason || 'No suitable data found.'

    const oldText = formatDetectedMetricValue(metric, d.oldValue)
    const newText = formatDetectedMetricValue(metric, d.newValue)
    const confidence =
      typeof d.confidence === 'number' ? ` (${Math.round(d.confidence * 100)}% confidence)` : ''

    if (!d.detected) {
      if (d.reason) return d.reason
      return `No improvement detected: ${oldText} -> ${newText}${confidence}`
    }

    return `${oldText} -> ${newText}${confidence}`
  }

  async function detectFromWorkouts(sport: any) {
    if (!sport?.id) {
      toast.add({
        title: 'Save Profile First',
        description: 'Save this sport profile before running workout-based detection.',
        color: 'warning'
      })
      return
    }

    detectingSportId.value = sport.id
    try {
      const result: any = await $fetch(
        `/api/profile/sport-settings/${sport.id}/detect-from-workouts`,
        {
          method: 'POST'
        }
      )

      workoutDetectionResult.value = result
      workoutDetectApply.value = {
        ftp: Boolean(result?.detections?.ftp?.detected),
        lthr: Boolean(result?.detections?.lthr?.detected),
        maxHr: Boolean(result?.detections?.maxHr?.detected),
        thresholdPace: Boolean(result?.detections?.thresholdPace?.detected),
        recalculatePowerZones: true,
        recalculateHrZones: true
      }
      showWorkoutDetectModal.value = true

      if (!result?.detectedAny) {
        toast.add({
          title: 'No Updates Found',
          description:
            'No stronger workout-derived thresholds were detected in the lookback window.',
          color: 'neutral'
        })
      }
    } catch (error: any) {
      toast.add({
        title: 'Detection Failed',
        description: error.message || 'Could not detect thresholds from workouts.',
        color: 'error'
      })
    } finally {
      detectingSportId.value = null
    }
  }

  function applyWorkoutDetection() {
    const result = workoutDetectionResult.value
    if (!result?.sportSetting?.id) return

    const detections = result.detections || {}
    let appliedAny = false

    const newSettings = props.settings.map((setting) => {
      if (setting.id !== result.sportSetting.id) return setting

      const updated = { ...setting }

      if (workoutDetectApply.value.ftp && detections.ftp?.detected && detections.ftp?.newValue) {
        updated.ftp = detections.ftp.newValue
        appliedAny = true
      }
      if (workoutDetectApply.value.lthr && detections.lthr?.detected && detections.lthr?.newValue) {
        updated.lthr = detections.lthr.newValue
        appliedAny = true
      }
      if (
        workoutDetectApply.value.maxHr &&
        detections.maxHr?.detected &&
        detections.maxHr?.newValue
      ) {
        updated.maxHr = detections.maxHr.newValue
        appliedAny = true
      }
      if (
        workoutDetectApply.value.thresholdPace &&
        detections.thresholdPace?.detected &&
        detections.thresholdPace?.newValue
      ) {
        updated.thresholdPace = detections.thresholdPace.newValue
        appliedAny = true
      }

      if (workoutDetectApply.value.recalculatePowerZones && updated.ftp) {
        updated.powerZones = buildPowerZonesFromFtp(updated.ftp)
      }
      if (workoutDetectApply.value.recalculateHrZones && (updated.lthr || updated.maxHr)) {
        updated.hrZones = buildHrZonesFromThreshold(updated.lthr, updated.maxHr)
      }

      return updated
    })

    if (!appliedAny) {
      toast.add({
        title: 'Nothing Applied',
        description: 'No detected updates were selected.',
        color: 'warning'
      })
      return
    }

    emit('update:settings', newSettings)
    showWorkoutDetectModal.value = false
    toast.add({
      title: 'Detected Updates Applied',
      description: 'Sport profile thresholds were updated from workout-derived detections.',
      color: 'success'
    })
  }

  async function autodetectProfile() {
    autodetecting.value = true
    try {
      const response: any = await $fetch('/api/profile/autodetect', {
        method: 'POST'
      })

      if (
        response.success &&
        response.diff &&
        response.diff.sportSettings &&
        response.diff.sportSettings.length > 0
      ) {
        pendingDiffs.value = response.diff
        pendingDetectedProfile.value = response.detected
        showConfirmModal.value = true
      } else if (response.success && Object.keys(response.diff).length > 0) {
        // Detected changes in basic settings but not sport settings
        // Notify user to check Basic Settings tab
        toast.add({
          title: 'Basic Settings Found',
          description:
            'Updates found for basic profile stats. Switch to the Basic Settings tab to review.',
          color: 'primary',
          actions: [
            {
              label: 'Switch Tab',
              onClick: () => emit('autodetect', null) // Signal parent to maybe switch tab? Or just let user do it
            }
          ]
        })
      } else {
        toast.add({
          title: 'No Updates Found',
          description: response.message || 'Your sport profiles are already in sync.',
          color: 'neutral'
        })
      }
    } catch (error: any) {
      toast.add({
        title: 'Autodetect Failed',
        description: error.message || 'Failed to sync with apps.',
        color: 'error'
      })
    } finally {
      autodetecting.value = false
    }
  }

  function confirmAutodetect() {
    if (pendingDetectedProfile.value.sportSettings) {
      // Merge detected sport settings into current settings
      // We need to be careful: are we replacing or merging?
      // The logic in autodetect.post.ts returns the *changes*.
      // But typically we might just want to replace the list or update specific items.

      // Actually, autodetect logic on parent 'handleAutodetect' does:
      // if (updatedProfile.sportSettings) sportSettings.value = updatedProfile.sportSettings
      // So we should emit the FULL detected profile if possible, OR just the changes.
      // Parent handleAutodetect expects 'updatedProfile' object.

      // We emit 'autodetect' event which parent listens to
      emit('autodetect', pendingDetectedProfile.value)
    }

    showConfirmModal.value = false
  }
</script>

<style scoped>
  .animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
