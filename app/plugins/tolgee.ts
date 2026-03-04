import { Tolgee, DevTools, LanguageDetector, LanguageStorage } from '@tolgee/web'
import { FormatIcu } from '@tolgee/format-icu'
import { VueTolgee } from '@tolgee/vue'

import enCommon from '../i18n/en/common.json'
import enDashboard from '../i18n/en/dashboard.json'
import enActivities from '../i18n/en/activities.json'
import enWorkout from '../i18n/en/workout.json'
import enProfile from '../i18n/en/profile.json'
import enHero from '../i18n/en/hero.json'
import enNutrition from '../i18n/en/nutrition.json'
import enHowItWorks from '../i18n/en/how-it-works.json'
import enArchitecture from '../i18n/en/architecture.json'
import enBento from '../i18n/en/bento.json'
import enGoals from '../i18n/en/goals.json'
import enCommunity from '../i18n/en/community.json'
import enPricing from '../i18n/en/pricing.json'
import enAuth from '../i18n/en/auth.json'
import enSupport from '../i18n/en/support.json'
import enStories from '../i18n/en/stories.json'
import enWorksWith from '../i18n/en/works-with.json'
import enLegend from '../i18n/en/legend.json'
import enOnboarding from '../i18n/en/onboarding.json'
import enHuBento from '../i18n/en/hu-bento.json'
import enTestDynamic from '../i18n/en/test-dynamic.json'
import enWorkoutTooltips from '../i18n/en/workout-tooltips.json'
import enChat from '../i18n/en/chat.json'
import enPerformance from '../i18n/en/performance.json'
import enFitness from '../i18n/en/fitness.json'
import enSettings from '../i18n/en/settings.json'

import huCommon from '../i18n/hu/common.json'
import huDashboard from '../i18n/hu/dashboard.json'
import huActivities from '../i18n/hu/activities.json'
import huWorkout from '../i18n/hu/workout.json'
import huProfile from '../i18n/hu/profile.json'
import huHero from '../i18n/hu/hero.json'
import huNutrition from '../i18n/hu/nutrition.json'
import huHowItWorks from '../i18n/hu/how-it-works.json'
import huArchitecture from '../i18n/hu/architecture.json'
import huBento from '../i18n/hu/bento.json'
import huGoals from '../i18n/hu/goals.json'
import huCommunity from '../i18n/hu/community.json'
import huPricing from '../i18n/hu/pricing.json'
import huAuth from '../i18n/hu/auth.json'
import huSupport from '../i18n/hu/support.json'
import huStories from '../i18n/hu/stories.json'
import huLegend from '../i18n/hu/legend.json'
import huOnboarding from '../i18n/hu/onboarding.json'
import huWorksWith from '../i18n/hu/works-with.json'
import huHuBento from '../i18n/hu/hu-bento.json'
import huTestDynamic from '../i18n/hu/test-dynamic.json'
import huWorkoutTooltips from '../i18n/hu/workout-tooltips.json'
import huChat from '../i18n/hu/chat.json'
import huPerformance from '../i18n/hu/performance.json'
import huFitness from '../i18n/hu/fitness.json'
import huSettings from '../i18n/hu/settings.json'

import deCommon from '../i18n/de/common.json'
import deDashboard from '../i18n/de/dashboard.json'
import deActivities from '../i18n/de/activities.json'
import deWorkout from '../i18n/de/workout.json'
import deProfile from '../i18n/de/profile.json'
import deHero from '../i18n/de/hero.json'
import deNutrition from '../i18n/de/nutrition.json'
import deHowItWorks from '../i18n/de/how-it-works.json'
import deArchitecture from '../i18n/de/architecture.json'
import deBento from '../i18n/de/bento.json'
import deGoals from '../i18n/de/goals.json'
import deCommunity from '../i18n/de/community.json'
import dePricing from '../i18n/de/pricing.json'
import deAuth from '../i18n/de/auth.json'
import deSupport from '../i18n/de/support.json'
import deStories from '../i18n/de/stories.json'
import deChat from '../i18n/de/chat.json'
import deFitness from '../i18n/de/fitness.json'
import deLegend from '../i18n/de/legend.json'
import deOnboarding from '../i18n/de/onboarding.json'
import dePerformance from '../i18n/de/performance.json'
import deWorkoutTooltips from '../i18n/de/workout-tooltips.json'
import deHuBento from '../i18n/de/hu-bento.json'
import deTestDynamic from '../i18n/de/test-dynamic.json'
import deWorksWith from '../i18n/de/works-with.json'

import frCommon from '../i18n/fr/common.json'
import frDashboard from '../i18n/fr/dashboard.json'
import frActivities from '../i18n/fr/activities.json'
import frWorkout from '../i18n/fr/workout.json'
import frProfile from '../i18n/fr/profile.json'
import frHero from '../i18n/fr/hero.json'
import frNutrition from '../i18n/fr/nutrition.json'
import frHowItWorks from '../i18n/fr/how-it-works.json'
import frArchitecture from '../i18n/fr/architecture.json'
import frBento from '../i18n/fr/bento.json'
import frGoals from '../i18n/fr/goals.json'
import frCommunity from '../i18n/fr/community.json'
import frPricing from '../i18n/fr/pricing.json'
import frAuth from '../i18n/fr/auth.json'
import frChat from '../i18n/fr/chat.json'
import frFitness from '../i18n/fr/fitness.json'
import frLegend from '../i18n/fr/legend.json'
import frOnboarding from '../i18n/fr/onboarding.json'
import frPerformance from '../i18n/fr/performance.json'
import frWorkoutTooltips from '../i18n/fr/workout-tooltips.json'
import frHuBento from '../i18n/fr/hu-bento.json'
import frStories from '../i18n/fr/stories.json'
import frSupport from '../i18n/fr/support.json'
import frTestDynamic from '../i18n/fr/test-dynamic.json'
import frWorksWith from '../i18n/fr/works-with.json'

import itCommon from '../i18n/it/common.json'
import itDashboard from '../i18n/it/dashboard.json'
import itActivities from '../i18n/it/activities.json'
import itWorkout from '../i18n/it/workout.json'
import itProfile from '../i18n/it/profile.json'
import itHero from '../i18n/it/hero.json'
import itNutrition from '../i18n/it/nutrition.json'
import itHowItWorks from '../i18n/it/how-it-works.json'
import itArchitecture from '../i18n/it/architecture.json'
import itBento from '../i18n/it/bento.json'
import itGoals from '../i18n/it/goals.json'
import itCommunity from '../i18n/it/community.json'
import itPricing from '../i18n/it/pricing.json'
import itAuth from '../i18n/it/auth.json'
import itChat from '../i18n/it/chat.json'
import itFitness from '../i18n/it/fitness.json'
import itLegend from '../i18n/it/legend.json'
import itOnboarding from '../i18n/it/onboarding.json'
import itPerformance from '../i18n/it/performance.json'
import itHuBento from '../i18n/it/hu-bento.json'
import itStories from '../i18n/it/stories.json'
import itSupport from '../i18n/it/support.json'
import itTestDynamic from '../i18n/it/test-dynamic.json'
import itWorksWith from '../i18n/it/works-with.json'

import nlCommon from '../i18n/nl/common.json'
import nlDashboard from '../i18n/nl/dashboard.json'
import nlActivities from '../i18n/nl/activities.json'
import nlWorkout from '../i18n/nl/workout.json'
import nlProfile from '../i18n/nl/profile.json'
import nlHero from '../i18n/nl/hero.json'
import nlNutrition from '../i18n/nl/nutrition.json'
import nlHowItWorks from '../i18n/nl/how-it-works.json'
import nlArchitecture from '../i18n/nl/architecture.json'
import nlBento from '../i18n/nl/bento.json'
import nlGoals from '../i18n/nl/goals.json'
import nlCommunity from '../i18n/nl/community.json'
import nlPricing from '../i18n/nl/pricing.json'
import nlAuth from '../i18n/nl/auth.json'
import nlChat from '../i18n/nl/chat.json'
import nlFitness from '../i18n/nl/fitness.json'
import nlLegend from '../i18n/nl/legend.json'
import nlOnboarding from '../i18n/nl/onboarding.json'
import nlPerformance from '../i18n/nl/performance.json'
import nlHuBento from '../i18n/nl/hu-bento.json'
import nlStories from '../i18n/nl/stories.json'
import nlSupport from '../i18n/nl/support.json'
import nlTestDynamic from '../i18n/nl/test-dynamic.json'
import nlWorksWith from '../i18n/nl/works-with.json'

const LANGUAGE_MAP: Record<string, string> = {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Italian: 'it',
  Portuguese: 'pt',
  Dutch: 'nl',
  Danish: 'da',
  Norwegian: 'no',
  Swedish: 'sv',
  Finnish: 'fi',
  Polish: 'pl',
  Turkish: 'tr',
  Hungarian: 'hu',
  Romanian: 'ro',
  Slovak: 'sk',
  Czech: 'cs',
  Greek: 'el',
  Bulgarian: 'bg',
  Croatian: 'hr',
  Slovenian: 'sl',
  Estonian: 'et',
  Latvian: 'lv',
  Lithuanian: 'lt',
  Japanese: 'ja',
  Chinese: 'zh',
  Korean: 'ko'
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const { apiUrl, apiKey } = config.public.tolgee
  const canUseDevTools = import.meta.client && import.meta.dev && Boolean(apiUrl) && Boolean(apiKey)

  const builder = Tolgee().use(FormatIcu())

  // LanguageDetector and LanguageStorage use localStorage/navigator — browser only.
  // DevTools also requires a browser context + valid API credentials.
  if (import.meta.client) {
    builder.use(LanguageDetector()).use(LanguageStorage())

    if (canUseDevTools) {
      builder.use(DevTools())
    }
  }

  // Determine initial language from Cookie (Primary) or Session (Secondary)
  const localeCookie = useCookie('cw_locale', { maxAge: 60 * 60 * 24 * 365 })
  const { data: session } = useAuth()

  let initialLanguage = localeCookie.value || 'en'

  // If no cookie, try to use session data (even on server)
  if (!localeCookie.value && session.value?.user) {
    const userLang = (session.value.user as any).language
    if (userLang && LANGUAGE_MAP[userLang]) {
      initialLanguage = LANGUAGE_MAP[userLang]
    }
  }

  const tolgee = builder.init({
    language: initialLanguage,
    staticData: {
      'en:common': enCommon,
      'en:dashboard': enDashboard,
      'en:activities': enActivities,
      'en:workout': enWorkout,
      'en:profile': enProfile,
      'en:hero': enHero,
      'en:nutrition': enNutrition,
      'en:how-it-works': enHowItWorks,
      'en:architecture': enArchitecture,
      'en:bento': enBento,
      'en:goals': enGoals,
      'en:community': enCommunity,
      'en:pricing': enPricing,
      'en:auth': enAuth,
      'en:support': enSupport,
      'en:stories': enStories,
      'en:works-with': enWorksWith,
      'en:legend': enLegend,
      'en:onboarding': enOnboarding,
      'en:hu-bento': enHuBento,
      'en:test-dynamic': enTestDynamic,
      'en:workout-tooltips': enWorkoutTooltips,
      'en:chat': enChat,
      'en:performance': enPerformance,
      'en:fitness': enFitness,
      'en:settings': enSettings,

      'hu:common': huCommon,
      'hu:dashboard': huDashboard,
      'hu:activities': huActivities,
      'hu:workout': huWorkout,
      'hu:profile': huProfile,
      'hu:hero': huHero,
      'hu:nutrition': huNutrition,
      'hu:how-it-works': huHowItWorks,
      'hu:architecture': huArchitecture,
      'hu:bento': huBento,
      'hu:goals': huGoals,
      'hu:community': huCommunity,
      'hu:pricing': huPricing,
      'hu:auth': huAuth,
      'hu:support': huSupport,
      'hu:stories': huStories,
      'hu:legend': huLegend,
      'hu:onboarding': huOnboarding,
      'hu:works-with': huWorksWith,
      'hu:hu-bento': huHuBento,
      'hu:test-dynamic': huTestDynamic,
      'hu:workout-tooltips': huWorkoutTooltips,
      'hu:chat': huChat,
      'hu:performance': huPerformance,
      'hu:fitness': huFitness,
      'hu:settings': huSettings,

      'de:common': deCommon,
      'de:dashboard': deDashboard,
      'de:activities': deActivities,
      'de:workout': deWorkout,
      'de:profile': deProfile,
      'de:hero': deHero,
      'de:nutrition': deNutrition,
      'de:how-it-works': deHowItWorks,
      'de:architecture': deArchitecture,
      'de:bento': deBento,
      'de:goals': deGoals,
      'de:community': deCommunity,
      'de:pricing': dePricing,
      'de:auth': deAuth,
      'de:support': deSupport,
      'de:stories': deStories,
      'de:chat': deChat,
      'de:fitness': deFitness,
      'de:hu-bento': deHuBento,
      'de:test-dynamic': deTestDynamic,
      'de:works-with': deWorksWith,
      'de:legend': deLegend,
      'de:onboarding': deOnboarding,
      'de:performance': dePerformance,
      'de:workout-tooltips': deWorkoutTooltips,

      'fr:common': frCommon,
      'fr:dashboard': frDashboard,
      'fr:activities': frActivities,
      'fr:workout': frWorkout,
      'fr:profile': frProfile,
      'fr:hero': frHero,
      'fr:nutrition': frNutrition,
      'fr:how-it-works': frHowItWorks,
      'fr:architecture': frArchitecture,
      'fr:bento': frBento,
      'fr:goals': frGoals,
      'fr:community': frCommunity,
      'fr:pricing': frPricing,
      'fr:auth': frAuth,
      'fr:chat': frChat,
      'fr:fitness': frFitness,
      'fr:hu-bento': frHuBento,
      'fr:stories': frStories,
      'fr:support': frSupport,
      'fr:test-dynamic': frTestDynamic,
      'fr:works-with': frWorksWith,
      'fr:legend': frLegend,
      'fr:onboarding': frOnboarding,
      'fr:performance': frPerformance,
      'fr:workout-tooltips': frWorkoutTooltips,

      'it:common': itCommon,
      'it:dashboard': itDashboard,
      'it:activities': itActivities,
      'it:workout': itWorkout,
      'it:profile': itProfile,
      'it:hero': itHero,
      'it:nutrition': itNutrition,
      'it:how-it-works': itHowItWorks,
      'it:architecture': itArchitecture,
      'it:bento': itBento,
      'it:goals': itGoals,
      'it:community': itCommunity,
      'it:pricing': itPricing,
      'it:auth': itAuth,
      'it:chat': itChat,
      'it:hu-bento': itHuBento,
      'it:stories': itStories,
      'it:support': itSupport,
      'it:test-dynamic': itTestDynamic,
      'it:works-with': itWorksWith,
      'it:fitness': itFitness,
      'it:legend': itLegend,
      'it:onboarding': itOnboarding,
      'it:performance': itPerformance,

      'nl:common': nlCommon,
      'nl:dashboard': nlDashboard,
      'nl:activities': nlActivities,
      'nl:workout': nlWorkout,
      'nl:profile': nlProfile,
      'nl:hero': nlHero,
      'nl:nutrition': nlNutrition,
      'nl:how-it-works': nlHowItWorks,
      'nl:architecture': nlArchitecture,
      'nl:bento': nlBento,
      'nl:goals': nlGoals,
      'nl:community': nlCommunity,
      'nl:pricing': nlPricing,
      'nl:auth': nlAuth,
      'nl:chat': nlChat,
      'nl:hu-bento': nlHuBento,
      'nl:stories': nlStories,
      'nl:support': nlSupport,
      'nl:test-dynamic': nlTestDynamic,
      'nl:works-with': nlWorksWith,
      'nl:fitness': nlFitness,
      'nl:legend': nlLegend,
      'nl:onboarding': nlOnboarding,
      'nl:performance': nlPerformance
    },
    ...(canUseDevTools ? { apiUrl, apiKey } : {})
  })

  if (import.meta.client) {
    nuxtApp.hook('app:mounted', () => {
      void tolgee.run()

      // Watch for user language preference changes
      const userStore = useUserStore()
      watch(
        [() => userStore.user?.language, () => userStore.profile?.language],
        ([userLang, profileLang]) => {
          const newLang = profileLang || userLang
          if (!newLang) return
          const isoCode = LANGUAGE_MAP[newLang]
          if (isoCode) {
            // Update Cookie for SSR
            if (localeCookie.value !== isoCode) {
              localeCookie.value = isoCode
            }
            // Update Tolgee Instance
            if (tolgee.getLanguage() !== isoCode) {
              void tolgee.changeLanguage(isoCode)
            }
          }
        },
        { immediate: true }
      )
    })
  }

  nuxtApp.vueApp.use(VueTolgee, { tolgee, enableSSR: true })

  return {
    provide: {
      tolgee
    }
  }
})
