/**
 * LHCI Puppeteer Authentication Script
 * Authenticates as the test athlete before Lighthouse audits run.
 * Uses native HTTP login to set session cookies directly on the browser context.
 */
module.exports = async (browser, context) => {
  const targetUrl = process.env.E2E_BASE_URL || 'http://localhost:3199'
  const email = process.env.E2E_TEST_USER_EMAIL || 'e2e-athlete@coachwatts.test'
  const password = process.env.E2E_TEST_USER_PASSWORD || 'password123'

  const page = context?.page || (await browser.newPage())
  page.setDefaultTimeout(10000)

  // 1. Try E2E bypass endpoint via native HTTP fetch
  try {
    const res = await fetch(`${targetUrl}/api/__e2e/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })

    if (res.ok) {
      const cookieHeaders = typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie')].filter(Boolean)

      for (const cookieStr of cookieHeaders) {
        if (!cookieStr) continue
        const [firstPart] = cookieStr.split(';')
        const eqIdx = firstPart.indexOf('=')
        if (eqIdx === -1) continue

        const name = firstPart.slice(0, eqIdx).trim()
        const value = firstPart.slice(eqIdx + 1).trim()

        if (name && value) {
          await page.setCookie({
            name,
            value,
            url: targetUrl
          })
        }
      }

      console.log(`[LHCI Auth] Successfully authenticated as ${email} on ${targetUrl}`)
      return
    }
  } catch (err) {
    console.warn(`[LHCI Auth] E2E login endpoint error (${err.message}). Trying UI login...`)
  }

  // 2. Fallback: Perform UI login via /login page if E2E endpoint is unavailable
  console.log('[LHCI Auth] Performing UI login fallback on /login...')
  await page.goto(`${targetUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 })

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
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {}),
        submitBtn.click()
      ])
    }
  }

  console.log(`[LHCI Auth] UI login finished for ${email}`)
}
