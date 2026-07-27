/**
 * LHCI Puppeteer Authentication Script
 * Authenticates as the test athlete before Lighthouse audits run.
 * Supports both fast E2E bypass (/api/__e2e/login) and UI form login fallback.
 */
module.exports = async (browser, context) => {
  const targetUrl = process.env.E2E_BASE_URL || 'http://localhost:3199'
  const email = process.env.E2E_TEST_USER_EMAIL || 'e2e-athlete@coachwatts.test'
  const password = process.env.E2E_TEST_USER_PASSWORD || 'password123'

  const page = context?.page || (await browser.newPage())

  // 1. Navigate to target origin so cookie domain is aligned
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })

  // 2. Try fast E2E bypass endpoint first (/api/__e2e/login)
  const e2eLoginResult = await page.evaluate(
    async ({ targetUrl, email }) => {
      try {
        const res = await fetch(`${targetUrl}/api/__e2e/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        return { ok: res.ok, status: res.status }
      } catch (err) {
        return { ok: false, status: 0, error: err.message }
      }
    },
    { targetUrl, email }
  )

  if (!e2eLoginResult.ok) {
    // Fallback: If /api/__e2e/login is disabled (e.g. standard dev mode without E2E_MODE=true), perform UI login via /login page
    console.log('[LHCI Auth] E2E bypass endpoint unavailable, performing UI login fallback on /login...')
    await page.goto(`${targetUrl}/login`, { waitUntil: 'networkidle0' })

    const emailInput = await page.$('input[type="email"], input[name="email"]')
    if (emailInput) {
      await page.type('input[type="email"], input[name="email"]', email)
      const passwordInput = await page.$('input[type="password"], input[name="password"]')
      if (passwordInput) {
        await page.type('input[type="password"], input[name="password"]', password)
      }
      const submitBtn = await page.$('button[type="submit"]')
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
          submitBtn.click()
        ])
      }
    }
  }

  // 3. Verify session is active
  const session = await page.evaluate(async (targetUrl) => {
    try {
      const res = await fetch(`${targetUrl}/api/auth/session`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }, targetUrl)

  if (!session?.user) {
    throw new Error(`[LHCI Auth Failure] Could not authenticate session for ${email} on ${targetUrl}`)
  }

  console.log(`[LHCI Auth] Authenticated as ${session.user.email} on ${targetUrl}`)

  if (!context?.page) {
    await page.close()
  }
}
