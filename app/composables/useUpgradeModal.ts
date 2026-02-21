import type { PricingTier } from '~/utils/pricing'

interface UpgradeModalOptions {
  title?: string
  feature?: string
  featureTitle?: string
  featureDescription?: string
  bullets?: string[]
  recommendedTier?: PricingTier
}

export function useUpgradeModal() {
  const isOpen = useState<boolean>('upgradeModalOpen', () => false)
  const options = useState<UpgradeModalOptions>('upgradeModalOptions', () => ({}))

  function show(opts: UpgradeModalOptions = {}) {
    options.value = opts
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    options,
    show,
    close
  }
}
