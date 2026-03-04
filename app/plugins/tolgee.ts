import { Tolgee, DevTools, LanguageDetector, LanguageStorage } from '@tolgee/web'
import { FormatIcu } from '@tolgee/format-icu'
import { VueTolgee } from '@tolgee/vue'

import enCommon from '../i18n/en/common.json'
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
import huStories from '../i18n/hu/stories.json'
import deStories from '../i18n/de/stories.json'

import huCommon from '../i18n/hu/common.json'
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

import deCommon from '../i18n/de/common.json'
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

import frCommon from '../i18n/fr/common.json'
import frHero from '../i18n/fr/hero.json'
import frNutrition from '../i18n/fr/nutrition.json'
import frHowItWorks from '../i18n/fr/how-it-works.json'
import frArchitecture from '../i18n/fr/architecture.json'
import frBento from '../i18n/fr/bento.json'
import frGoals from '../i18n/fr/goals.json'
import frCommunity from '../i18n/fr/community.json'
import frPricing from '../i18n/fr/pricing.json'
import frAuth from '../i18n/fr/auth.json'

import itCommon from '../i18n/it/common.json'
import itHero from '../i18n/it/hero.json'
import itNutrition from '../i18n/it/nutrition.json'
import itHowItWorks from '../i18n/it/how-it-works.json'
import itArchitecture from '../i18n/it/architecture.json'
import itBento from '../i18n/it/bento.json'
import itGoals from '../i18n/it/goals.json'
import itCommunity from '../i18n/it/community.json'
import itPricing from '../i18n/it/pricing.json'
import itAuth from '../i18n/it/auth.json'

import nlCommon from '../i18n/nl/common.json'
import nlHero from '../i18n/nl/hero.json'
import nlNutrition from '../i18n/nl/nutrition.json'
import nlHowItWorks from '../i18n/nl/how-it-works.json'
import nlArchitecture from '../i18n/nl/architecture.json'
import nlBento from '../i18n/nl/bento.json'
import nlGoals from '../i18n/nl/goals.json'
import nlCommunity from '../i18n/nl/community.json'
import nlPricing from '../i18n/nl/pricing.json'
import nlAuth from '../i18n/nl/auth.json'

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

  const tolgee = builder.init({
    language: 'en',
    staticData: {
      'en:common': enCommon,
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
      'hu:stories': huStories,
      'hu:common': huCommon,
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
      'de:stories': deStories,
      'de:common': deCommon,
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
      'fr:common': frCommon,
      'fr:hero': frHero,
      'fr:nutrition': frNutrition,
      'fr:how-it-works': frHowItWorks,
      'fr:architecture': frArchitecture,
      'fr:bento': frBento,
      'fr:goals': frGoals,
      'fr:community': frCommunity,
      'fr:pricing': frPricing,
      'fr:auth': frAuth,
      'it:common': itCommon,
      'it:hero': itHero,
      'it:nutrition': itNutrition,
      'it:how-it-works': itHowItWorks,
      'it:architecture': itArchitecture,
      'it:bento': itBento,
      'it:goals': itGoals,
      'it:community': itCommunity,
      'it:pricing': itPricing,
      'it:auth': itAuth,
      'nl:common': nlCommon,
      'nl:hero': nlHero,
      'nl:nutrition': nlNutrition,
      'nl:how-it-works': nlHowItWorks,
      'nl:architecture': nlArchitecture,
      'nl:bento': nlBento,
      'nl:goals': nlGoals,
      'nl:community': nlCommunity,
      'nl:pricing': nlPricing,
      'nl:auth': nlAuth
    },
    ...(canUseDevTools ? { apiUrl, apiKey } : {})
  })

  if (import.meta.client) {
    nuxtApp.hook('app:mounted', () => {
      void tolgee.run()
    })
  }

  nuxtApp.vueApp.use(VueTolgee, { tolgee, enableSSR: true })

  return {
    provide: {
      tolgee
    }
  }
})
