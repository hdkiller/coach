import type { Page } from '@playwright/test'

export async function loginAs(
  page: Page,
  email = process.env.E2E_TEST_USER_EMAIL ?? 'e2e-athlete@coachwatts.test'
) {
  const response = await page.request.post('/api/__e2e/login', {
    data: { email }
  })

  if (!response.ok()) {
    throw new Error(`E2E login failed (${response.status()}): ${await response.text()}`)
  }
}

export async function getSessionUser(page: Page) {
  const response = await page.request.get('/api/auth/session')
  if (!response.ok()) {
    throw new Error(`Session lookup failed (${response.status()}): ${await response.text()}`)
  }

  return response.json()
}
