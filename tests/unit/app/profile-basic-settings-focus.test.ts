// @vitest-environment nuxt

import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BasicSettings from '../../../app/components/profile/BasicSettings.vue'

vi.mock('@tolgee/vue', () => ({
  useTranslate: () => ({ t: (key: string) => key })
}))

mockNuxtImport('useAuth', () => () => ({ signIn: vi.fn(), status: 'authenticated' }))
mockNuxtImport('useFormat', () => () => ({ formatDateUTC: vi.fn(() => '') }))
mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))

describe('ProfileBasicSettings focus requests', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    HTMLElement.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    scrollIntoView.mockReset()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('scrolls again when the same section receives a new focus request', async () => {
    const wrapper = await mountSuspended(BasicSettings, {
      attachTo: document.body,
      shallow: true,
      props: {
        modelValue: {
          accounts: [],
          integrations: [],
          dob: null,
          weight: null,
          weightUnits: 'Kilograms',
          height: null,
          heightUnits: 'cm'
        },
        email: 'athlete@example.com',
        focusSection: null,
        focusRequestId: 0
      }
    })

    await nextTick()
    await nextTick()
    expect(document.getElementById('body-metrics')).not.toBeNull()

    await wrapper.setProps({ focusSection: 'body-metrics', focusRequestId: 1 })
    await nextTick()
    await nextTick()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ focusRequestId: 2 })
    await nextTick()
    await nextTick()

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  }, 120_000)
})
