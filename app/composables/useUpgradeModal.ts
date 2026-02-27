import type { PricingTier } from '~/utils/pricing'

interface UpgradeModalOptions {
  title?: string
  feature?: string
  featureTitle?: string
  featureDescription?: string
  bullets?: string[]
  recommendedTier?: PricingTier
  reason?: string
}

export function useUpgradeModal() {
  const isOpen = useState<boolean>('upgradeModalOpen', () => false)
  const options = useState<UpgradeModalOptions>('upgradeModalOptions', () => ({}))
  const { trackUpgradeView } = useAnalytics()

  function show(opts: UpgradeModalOptions = {}) {
    options.value = opts
    isOpen.value = true

    // Track promotion view
    trackUpgradeView(opts.featureTitle || opts.title || 'Upgrade Plan', opts.reason || 'upsell')
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
