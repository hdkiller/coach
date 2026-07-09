import { useTranslate } from '@tolgee/vue'

export function useConnectI18n(provider: string) {
  const { t } = useTranslate('integrations')

  const tr = (key: string, fallback: string) => {
    if (typeof t.value !== 'function') return fallback
    const translated = t.value(key)
    return translated === key ? fallback : translated
  }

  const p = (suffix: string, fallback: string) => tr(`connect_${provider}_${suffix}`, fallback)

  return {
    tr,
    p,
    back: () => tr('connect_back', 'Back'),
    cancel: () => tr('connect_cancel', 'Cancel'),
    failedTitle: () => tr('connect_failed_title', 'Connection Failed'),
    oauthTitle: () => tr('connect_oauth_title', 'OAuth Authorization'),
    secureOAuthTitle: () => tr('connect_secure_oauth_title', 'Secure OAuth Connection')
  }
}
