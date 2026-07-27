let chromePath
try {
  // Dynamically resolve Chromium binary path installed by Playwright
  const playwright = require('playwright')
  chromePath = playwright.chromium.executablePath()
} catch (err) {
  console.warn('[LHCI Config] Could not resolve Playwright chromium executable path:', err.message)
}

const targetBaseUrl = process.env.E2E_BASE_URL || 'http://localhost:3199'

module.exports = {
  ci: {
    collect: {
      url: [
        `${targetBaseUrl}/dashboard`,
        `${targetBaseUrl}/calendar`,
        `${targetBaseUrl}/chat`
      ],
      puppeteerScript: './e2e/scripts/lhci-auth.cjs',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--headless=new']
      },
      numberOfRuns: 2,
      ...(chromePath || process.env.CHROME_PATH
        ? { chromePath: process.env.CHROME_PATH || chromePath }
        : {}),
      settings: {
        preset: 'desktop'
      }
    },
    assert: {
      assertions: {
        // Enforce accessibility compliance across authenticated routes
        'categories:accessibility': ['error', { minScore: 0.80 }],
        // Set realistic category warning levels for full-stack SSR app in Docker CI
        'categories:performance': ['warn', { minScore: 0.40 }],
        'categories:best-practices': ['warn', { minScore: 0.75 }],
        'categories:seo': ['warn', { minScore: 0.75 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
