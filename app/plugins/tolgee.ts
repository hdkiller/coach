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
import enIntegrations from '../i18n/en/integrations.json'

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
import huIntegrations from '../i18n/hu/integrations.json'

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
import deSettings from '../i18n/de/settings.json'
import deLegend from '../i18n/de/legend.json'
import deOnboarding from '../i18n/de/onboarding.json'
import dePerformance from '../i18n/de/performance.json'
import deWorkoutTooltips from '../i18n/de/workout-tooltips.json'
import deHuBento from '../i18n/de/hu-bento.json'
import deTestDynamic from '../i18n/de/test-dynamic.json'
import deWorksWith from '../i18n/de/works-with.json'
import deIntegrations from '../i18n/de/integrations.json'

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
import frSettings from '../i18n/fr/settings.json'
import frLegend from '../i18n/fr/legend.json'
import frOnboarding from '../i18n/fr/onboarding.json'
import frPerformance from '../i18n/fr/performance.json'
import frWorkoutTooltips from '../i18n/fr/workout-tooltips.json'
import frHuBento from '../i18n/fr/hu-bento.json'
import frStories from '../i18n/fr/stories.json'
import frSupport from '../i18n/fr/support.json'
import frTestDynamic from '../i18n/fr/test-dynamic.json'
import frWorksWith from '../i18n/fr/works-with.json'
import frIntegrations from '../i18n/fr/integrations.json'

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
import itSettings from '../i18n/it/settings.json'
import itWorkoutTooltips from '../i18n/it/workout-tooltips.json'
import itLegend from '../i18n/it/legend.json'
import itOnboarding from '../i18n/it/onboarding.json'
import itPerformance from '../i18n/it/performance.json'
import itHuBento from '../i18n/it/hu-bento.json'
import itStories from '../i18n/it/stories.json'
import itSupport from '../i18n/it/support.json'
import itTestDynamic from '../i18n/it/test-dynamic.json'
import itWorksWith from '../i18n/it/works-with.json'
import itIntegrations from '../i18n/it/integrations.json'

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
import nlSettings from '../i18n/nl/settings.json'
import nlWorkoutTooltips from '../i18n/nl/workout-tooltips.json'
import nlLegend from '../i18n/nl/legend.json'
import nlOnboarding from '../i18n/nl/onboarding.json'
import nlPerformance from '../i18n/nl/performance.json'
import nlHuBento from '../i18n/nl/hu-bento.json'
import nlStories from '../i18n/nl/stories.json'
import nlSupport from '../i18n/nl/support.json'
import nlTestDynamic from '../i18n/nl/test-dynamic.json'
import nlWorksWith from '../i18n/nl/works-with.json'
import nlIntegrations from '../i18n/nl/integrations.json'

import ruCommon from '../i18n/ru/common.json'
import ruDashboard from '../i18n/ru/dashboard.json'
import ruActivities from '../i18n/ru/activities.json'
import ruWorkout from '../i18n/ru/workout.json'
import ruProfile from '../i18n/ru/profile.json'
import ruHero from '../i18n/ru/hero.json'
import ruNutrition from '../i18n/ru/nutrition.json'
import ruHowItWorks from '../i18n/ru/how-it-works.json'
import ruArchitecture from '../i18n/ru/architecture.json'
import ruBento from '../i18n/ru/bento.json'
import ruGoals from '../i18n/ru/goals.json'
import ruCommunity from '../i18n/ru/community.json'
import ruPricing from '../i18n/ru/pricing.json'
import ruAuth from '../i18n/ru/auth.json'
import ruChat from '../i18n/ru/chat.json'
import ruFitness from '../i18n/ru/fitness.json'
import ruSettings from '../i18n/ru/settings.json'
import ruWorkoutTooltips from '../i18n/ru/workout-tooltips.json'
import ruLegend from '../i18n/ru/legend.json'
import ruOnboarding from '../i18n/ru/onboarding.json'
import ruPerformance from '../i18n/ru/performance.json'
import ruHuBento from '../i18n/ru/hu-bento.json'
import ruStories from '../i18n/ru/stories.json'
import ruSupport from '../i18n/ru/support.json'
import ruTestDynamic from '../i18n/ru/test-dynamic.json'
import ruWorksWith from '../i18n/ru/works-with.json'
import ruIntegrations from '../i18n/ru/integrations.json'

import jaCommon from '../i18n/ja/common.json'
import jaDashboard from '../i18n/ja/dashboard.json'
import jaActivities from '../i18n/ja/activities.json'
import jaWorkout from '../i18n/ja/workout.json'
import jaProfile from '../i18n/ja/profile.json'
import jaHero from '../i18n/ja/hero.json'
import jaNutrition from '../i18n/ja/nutrition.json'
import jaHowItWorks from '../i18n/ja/how-it-works.json'
import jaArchitecture from '../i18n/ja/architecture.json'
import jaBento from '../i18n/ja/bento.json'
import jaGoals from '../i18n/ja/goals.json'
import jaCommunity from '../i18n/ja/community.json'
import jaPricing from '../i18n/ja/pricing.json'
import jaAuth from '../i18n/ja/auth.json'
import jaChat from '../i18n/ja/chat.json'
import jaFitness from '../i18n/ja/fitness.json'
import jaSettings from '../i18n/ja/settings.json'
import jaWorkoutTooltips from '../i18n/ja/workout-tooltips.json'
import jaLegend from '../i18n/ja/legend.json'
import jaOnboarding from '../i18n/ja/onboarding.json'
import jaPerformance from '../i18n/ja/performance.json'
import jaHuBento from '../i18n/ja/hu-bento.json'
import jaStories from '../i18n/ja/stories.json'
import jaSupport from '../i18n/ja/support.json'
import jaTestDynamic from '../i18n/ja/test-dynamic.json'
import jaWorksWith from '../i18n/ja/works-with.json'
import jaIntegrations from '../i18n/ja/integrations.json'

import zhCommon from '../i18n/zh/common.json'
import zhDashboard from '../i18n/zh/dashboard.json'
import zhActivities from '../i18n/zh/activities.json'
import zhWorkout from '../i18n/zh/workout.json'
import zhProfile from '../i18n/zh/profile.json'
import zhHero from '../i18n/zh/hero.json'
import zhNutrition from '../i18n/zh/nutrition.json'
import zhHowItWorks from '../i18n/zh/how-it-works.json'
import zhArchitecture from '../i18n/zh/architecture.json'
import zhBento from '../i18n/zh/bento.json'
import zhGoals from '../i18n/zh/goals.json'
import zhCommunity from '../i18n/zh/community.json'
import zhPricing from '../i18n/zh/pricing.json'
import zhAuth from '../i18n/zh/auth.json'
import zhChat from '../i18n/zh/chat.json'
import zhFitness from '../i18n/zh/fitness.json'
import zhSettings from '../i18n/zh/settings.json'
import zhWorkoutTooltips from '../i18n/zh/workout-tooltips.json'
import zhLegend from '../i18n/zh/legend.json'
import zhOnboarding from '../i18n/zh/onboarding.json'
import zhPerformance from '../i18n/zh/performance.json'
import zhHuBento from '../i18n/zh/hu-bento.json'
import zhStories from '../i18n/zh/stories.json'
import zhSupport from '../i18n/zh/support.json'
import zhTestDynamic from '../i18n/zh/test-dynamic.json'
import zhWorksWith from '../i18n/zh/works-with.json'
import zhIntegrations from '../i18n/zh/integrations.json'

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
  Russian: 'ru',
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
      'en:integrations': enIntegrations,

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
      'hu:integrations': huIntegrations,

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
      'de:settings': deSettings,
      'de:legend': deLegend,
      'de:onboarding': deOnboarding,
      'de:performance': dePerformance,
      'de:workout-tooltips': deWorkoutTooltips,
      'de:integrations': deIntegrations,

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
      'fr:settings': frSettings,
      'fr:legend': frLegend,
      'fr:onboarding': frOnboarding,
      'fr:performance': frPerformance,
      'fr:workout-tooltips': frWorkoutTooltips,
      'fr:integrations': frIntegrations,

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
      'it:settings': itSettings,
      'it:workout-tooltips': itWorkoutTooltips,
      'it:legend': itLegend,
      'it:onboarding': itOnboarding,
      'it:performance': itPerformance,
      'it:integrations': itIntegrations,

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
      'nl:settings': nlSettings,
      'nl:workout-tooltips': nlWorkoutTooltips,
      'nl:legend': nlLegend,
      'nl:onboarding': nlOnboarding,
      'nl:performance': nlPerformance,
      'nl:integrations': nlIntegrations,

      'ru:common': ruCommon,
      'ru:dashboard': ruDashboard,
      'ru:activities': ruActivities,
      'ru:workout': ruWorkout,
      'ru:profile': ruProfile,
      'ru:hero': ruHero,
      'ru:nutrition': ruNutrition,
      'ru:how-it-works': ruHowItWorks,
      'ru:architecture': ruArchitecture,
      'ru:bento': ruBento,
      'ru:goals': ruGoals,
      'ru:community': ruCommunity,
      'ru:pricing': ruPricing,
      'ru:auth': ruAuth,
      'ru:chat': ruChat,
      'ru:hu-bento': ruHuBento,
      'ru:stories': ruStories,
      'ru:support': ruSupport,
      'ru:test-dynamic': ruTestDynamic,
      'ru:works-with': ruWorksWith,
      'ru:fitness': ruFitness,
      'ru:settings': ruSettings,
      'ru:workout-tooltips': ruWorkoutTooltips,
      'ru:legend': ruLegend,
      'ru:onboarding': ruOnboarding,
      'ru:performance': ruPerformance,
      'ru:integrations': ruIntegrations,

      'ja:common': jaCommon,
      'ja:dashboard': jaDashboard,
      'ja:activities': jaActivities,
      'ja:workout': jaWorkout,
      'ja:profile': jaProfile,
      'ja:hero': jaHero,
      'ja:nutrition': jaNutrition,
      'ja:how-it-works': jaHowItWorks,
      'ja:architecture': jaArchitecture,
      'ja:bento': jaBento,
      'ja:goals': jaGoals,
      'ja:community': jaCommunity,
      'ja:pricing': jaPricing,
      'ja:auth': jaAuth,
      'ja:chat': jaChat,
      'ja:hu-bento': jaHuBento,
      'ja:stories': jaStories,
      'ja:support': jaSupport,
      'ja:test-dynamic': jaTestDynamic,
      'ja:works-with': jaWorksWith,
      'ja:fitness': jaFitness,
      'ja:settings': jaSettings,
      'ja:workout-tooltips': jaWorkoutTooltips,
      'ja:legend': jaLegend,
      'ja:onboarding': jaOnboarding,
      'ja:performance': jaPerformance,
      'ja:integrations': jaIntegrations,

      'zh:common': zhCommon,
      'zh:dashboard': zhDashboard,
      'zh:activities': zhActivities,
      'zh:workout': zhWorkout,
      'zh:profile': zhProfile,
      'zh:hero': zhHero,
      'zh:nutrition': zhNutrition,
      'zh:how-it-works': zhHowItWorks,
      'zh:architecture': zhArchitecture,
      'zh:bento': zhBento,
      'zh:goals': zhGoals,
      'zh:community': zhCommunity,
      'zh:pricing': zhPricing,
      'zh:auth': zhAuth,
      'zh:chat': zhChat,
      'zh:hu-bento': zhHuBento,
      'zh:stories': zhStories,
      'zh:support': zhSupport,
      'zh:test-dynamic': zhTestDynamic,
      'zh:works-with': zhWorksWith,
      'zh:fitness': zhFitness,
      'zh:settings': zhSettings,
      'zh:workout-tooltips': zhWorkoutTooltips,
      'zh:legend': zhLegend,
      'zh:onboarding': zhOnboarding,
      'zh:performance': zhPerformance,
      'zh:integrations': zhIntegrations
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
