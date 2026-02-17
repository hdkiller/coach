export type SupportedCurrency = 'usd' | 'eur'

const EUROZONE_COUNTRIES = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'IE',
  'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'
])

export function useCurrency() {
  // useState is SSR-safe: server and client start with the same value ('usd'),
  // avoiding hydration mismatches.
  const currency = useState<SupportedCurrency>('preferred-currency', () => 'usd')

  // Only detect locale / localStorage after hydration to stay in sync with SSR.
  onMounted(() => {
    const stored = localStorage.getItem('preferred-currency') as SupportedCurrency | null
    if (stored) {
      currency.value = stored
      return
    }
    const country = navigator.language?.split('-')[1]?.toUpperCase()
    if (country && EUROZONE_COUNTRIES.has(country)) {
      currency.value = 'eur'
    }
  })

  function setCurrency(value: SupportedCurrency) {
    currency.value = value
    localStorage.setItem('preferred-currency', value)
  }

  return { currency: readonly(currency), setCurrency }
}
