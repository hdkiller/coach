export function useStripe() {
  const toast = useToast()

  /**
   * Create a checkout session and redirect to Stripe
   */
  async function createCheckoutSession(
    priceId: string,
    options?: {
      successUrl?: string
      cancelUrl?: string
    }
  ) {
    try {
      const { data, error } = await useFetch('/api/stripe/checkout-session', {
        method: 'POST',
        body: {
          priceId,
          successUrl: options?.successUrl,
          cancelUrl: options?.cancelUrl
        }
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create checkout session')
      }

      if (data.value?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.value.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      toast.add({
        title: 'Checkout Failed',
        description: err.message || 'Unable to start checkout process',
        color: 'error'
      })
    }
  }

  /**
   * Open Stripe Customer Portal
   */
  async function openCustomerPortal(returnUrl?: string) {
    try {
      const { data, error } = await useFetch('/api/stripe/portal-session', {
        method: 'POST',
        body: {
          returnUrl
        }
      })

      if (error.value) {
        throw new Error(error.value.message || 'Failed to create portal session')
      }

      if (data.value?.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.value.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (err: any) {
      console.error('Portal error:', err)
      toast.add({
        title: 'Portal Access Failed',
        description: err.message || 'Unable to access customer portal',
        color: 'error'
      })
    }
  }

  /**
   * Change subscription plan directly (one-click)
   */
  async function changePlan(priceId: string, direction: 'upgrade' | 'downgrade' = 'upgrade') {
    try {
      const { data, error } = await useFetch('/api/stripe/change-plan', {
        method: 'POST',
        body: {
          priceId,
          direction
        }
      })

      if (error.value) {
        throw new Error(error.value.message || `Failed to ${direction} subscription`)
      }

      if (data.value?.status === 'requires_action') {
        // If SCA is required, we notify the user clearly before redirecting
        toast.add({
          title: 'Verification Required',
          description:
            'Your bank requires a quick security confirmation. We are taking you to a secure page to finish this.',
          color: 'info'
        })

        // Short delay to let the user read the message before the page changes
        await new Promise((resolve) => setTimeout(resolve, 2000))

        await openCustomerPortal(window.location.href)
        return false // Return false because it's not "finished" yet
      }

      if (data.value?.status === 'success') {
        toast.add({
          title: direction === 'upgrade' ? 'Upgrade Successful' : 'Plan Changed',
          description:
            direction === 'upgrade'
              ? 'Your subscription has been upgraded! Enjoy your new features.'
              : 'Your plan has been changed. Credits will be applied to your next bill.',
          color: 'success'
        })
        // Return true to indicate success so caller can trigger UI refresh
        return true
      }
    } catch (err: any) {
      console.error(`${direction} error:`, err)
      toast.add({
        title: `${direction.charAt(0).toUpperCase() + direction.slice(1)} Failed`,
        description: err.message || `Unable to ${direction} subscription. Try using the portal.`,
        color: 'error'
      })
    }
    return false
  }

  return {
    createCheckoutSession,
    openCustomerPortal,
    changePlan
  }
}
