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
      'de:support': deSupport
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
