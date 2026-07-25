import { test as base } from '@playwright/test'
import { loginAs } from '../helpers/auth.ts'
import { E2E_ADMIN_EMAIL, E2E_ATHLETE_EMAIL } from '../seed.ts'
import type { Page } from '@playwright/test'

type E2eFixtures = {
  authedPage: Page
  adminPage: Page
}

export const test = base.extend<E2eFixtures>({
  authedPage: async ({ page }, use) => {
    await loginAs(page, E2E_ATHLETE_EMAIL)
    await use(page)
  },
  adminPage: async ({ page }, use) => {
    await loginAs(page, E2E_ADMIN_EMAIL)
    await use(page)
  }
})

export { expect } from '@playwright/test'
