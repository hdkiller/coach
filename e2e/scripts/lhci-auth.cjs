/**
 * LHCI Puppeteer Authentication Script
 * Authenticates as the E2E test athlete before Lighthouse audits run.
 */
module.exports = async (browser, context) => {
  const targetUrl = process.env.E2E_BASE_URL || 'http://localhost:3199'
  const email = process.env.E2E_TEST_USER_EMAIL || 'e2e-athlete@coachwatts.test'

  const page = context?.page || (await browser.newPage())

  // Navigate to target origin first so the session cookie domain is aligned
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })

  // Trigger the E2E login endpoint to set session cookies on the browser context
  const result = await page.evaluate(
    async ({ targetUrl, email }) => {
      const res = await fetch(`${targetUrl}/api/__e2e/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      return { ok: res.ok, status: res.status, text: await res.text() }
    },
    { targetUrl, email }
  )

  if (!result.ok) {
    throw new Error(`[LHCI Auth Failure] Login endpoint returned ${result.status}: ${result.text}`)
  }

  // Verify authentication session status
  const sessionCheck = await page.evaluate(async (targetUrl) => {
    const res = await fetch(`${targetUrl}/api/auth/session`)
    if (!res.ok) return null
    return res.json()
  }, targetUrl)

  if (!sessionCheck?.user) {
    throw new Error('[LHCI Auth Failure] Session lookup returned no authenticated user')
  }

  if (!context?.page) {
    await page.close()
  }
}
