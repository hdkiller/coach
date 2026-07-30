export default defineNuxtPlugin(() => {
  function fixAriaExpandedRoles() {
    // Find any span or generic element with aria-expanded that lacks an interactive ARIA role
    const triggers = document.querySelectorAll<HTMLElement>(
      'span[aria-expanded]:not([role]), div[aria-expanded]:not([role])'
    )
    triggers.forEach((el) => {
      if (!el.hasAttribute('role')) {
        el.setAttribute('role', 'button')
      }
      if (
        el.getAttribute('role') === 'button' &&
        !el.getAttribute('aria-label') &&
        !el.textContent?.trim()
      ) {
        const labelText =
          el
            .closest('li, a, button, nav')
            ?.querySelector('span:not([aria-expanded])')
            ?.textContent?.trim() ||
          el.parentElement?.textContent?.trim() ||
          'Toggle section'
        el.setAttribute('aria-label', labelText)
      }
    })
  }

  if (import.meta.client) {
    // Run on initial load
    onNuxtReady(() => {
      fixAriaExpandedRoles()

      // Observe dynamic DOM updates (e.g. navigation renders, modals, accordions)
      const observer = new MutationObserver((mutations) => {
        let shouldFix = false
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldFix = true
            break
          }
          if (mutation.type === 'attributes' && mutation.attributeName === 'aria-expanded') {
            shouldFix = true
            break
          }
        }
        if (shouldFix) {
          fixAriaExpandedRoles()
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-expanded']
      })
    })
  }
})
