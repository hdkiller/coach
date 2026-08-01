// @vitest-environment nuxt

import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import NotificationDropdown from '../../../../app/components/NotificationDropdown.vue'
import { useNotificationStore } from '../../../../app/stores/notifications'

vi.mock('@tolgee/vue', () => ({
  useTranslate: () => ({ t: computed(() => (key: string) => key) })
}))

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))

mockNuxtImport('useUserRuns', () => () => ({ refresh: vi.fn() }))
mockNuxtImport('useFormat', () => () => ({
  formatDate: (date: string) => date
}))
mockNuxtImport('navigateTo', () => navigateToMock)

const NOTIFICATION = {
  id: 'notif-1',
  userId: 'user-1',
  title: 'Workout synced',
  message: 'Your workout finished syncing.',
  link: '/workouts/planned/workout-1',
  read: false,
  createdAt: '2026-07-30T12:00:00.000Z'
}

function createDeferred<T = any>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function mountDropdown() {
  const wrapper = await mountSuspended(NotificationDropdown, {
    shallow: true,
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        // The clickable notification rows live inside UPopover's named
        // `#content` slot; the default shallow stub only renders the
        // default slot, so this needs an explicit slot-preserving template.
        UPopover: { template: '<div><slot /><slot name="content" /></div>' }
      }
    }
  })

  await flushPromises()
  await nextTick()

  return wrapper
}

describe('NotificationDropdown handleNotificationClick (CW-53)', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let markReadDeferred: ReturnType<typeof createDeferred>

  beforeEach(() => {
    setActivePinia(createPinia())
    navigateToMock.mockReset()

    markReadDeferred = createDeferred()

    fetchMock = vi.fn((url: string, options: any = {}) => {
      if (url === '/api/notifications') {
        return Promise.resolve({
          notifications: [{ ...NOTIFICATION }],
          total: 1,
          unreadCount: 1
        })
      }
      if (url === '/api/notifications/read' && options?.method === 'PATCH') {
        return markReadDeferred.promise
      }
      return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
    })
    ;(fetchMock as any).raw = vi.fn().mockResolvedValue({ _data: null })
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears the unread badge immediately and only navigates after markAsRead resolves', async () => {
    const wrapper = await mountDropdown()
    const store = useNotificationStore()

    expect(store.unreadCount).toBe(1)
    expect(store.notifications[0]?.read).toBe(false)

    const item = wrapper.find('.cursor-pointer')
    expect(item.exists()).toBe(true)

    await item.trigger('click')
    await nextTick()

    // Optimistic update: the store (and therefore the badge bound to
    // unreadCount) updates synchronously, before the PATCH request to
    // /api/notifications/read has resolved.
    expect(store.unreadCount).toBe(0)
    expect(store.notifications[0]?.read).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/read',
      expect.objectContaining({ method: 'PATCH', body: { id: NOTIFICATION.id } })
    )

    // Navigation must not happen before the mark-as-read call has settled.
    expect(navigateToMock).not.toHaveBeenCalled()

    markReadDeferred.resolve({})
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith(NOTIFICATION.link)
  })

  it('rolls back the optimistic read state when the server call fails', async () => {
    const wrapper = await mountDropdown()
    const store = useNotificationStore()

    const item = wrapper.find('.cursor-pointer')
    await item.trigger('click')
    await nextTick()

    expect(store.unreadCount).toBe(0)
    expect(store.notifications[0]?.read).toBe(true)

    markReadDeferred.reject(new Error('network error'))
    await flushPromises()

    // The optimistic update is rolled back since the server never
    // persisted the read state, so the badge/unread count stay accurate.
    expect(store.unreadCount).toBe(1)
    expect(store.notifications[0]?.read).toBe(false)
  })
})
