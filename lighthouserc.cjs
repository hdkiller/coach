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
      numberOfRuns: 2,
      ...(chromePath || process.env.CHROME_PATH
        ? { chromePath: process.env.CHROME_PATH || chromePath }
        : {}),
      settings: {
        chromeFlags: '--no-sandbox --disable-gpu --disable-dev-shm-usage --headless=new',
        preset: 'desktop'
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Adapt thresholds for CI server headless run variance
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'uses-http2': 'off',
        'offscreen-images': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
