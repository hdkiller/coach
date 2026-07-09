import { useTranslate } from '@tolgee/vue'

export function useCoachingI18n() {
  const { t } = useTranslate('coaching')

  const tr = (key: string, fallback: string, params?: Record<string, string | number>) => {
    if (typeof t.value !== 'function') return fallback
    let translated = t.value(key)
    if (translated === key) translated = fallback
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        translated = translated.replace(`{${name}}`, String(value))
      }
    }
    return translated
  }

  return { tr }
}
