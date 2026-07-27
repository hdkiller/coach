let chromePath
try {
  // Dynamically resolve Chromium binary path installed by Playwright
  const playwright = require('playwright')
  chromePath = playwright.chromium.executablePath()
} catch (err) {
  console.warn('[LHCI Config] Could not resolve Playwright chromium executable path:', err.message)
}

const targetBaseUrl = process.env.E2E_BASE_URL || 'http://localhost:3199'
const isFastLocal = !process.env.CI

module.exports = {
  ci: {
    collect: {
      url: process.env.LHCI_URL
        ? [process.env.LHCI_URL]
        : [
            `${targetBaseUrl}/dashboard`,
            `${targetBaseUrl}/calendar`,
            `${targetBaseUrl}/chat`
          ],
      puppeteerScript: './e2e/scripts/lhci-auth.cjs',
      puppeteerLaunchOptions: {
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--headless=new'
        ]
      },
      // 1 run locally for instant feedback; 2 runs in CI for statistical stability
      numberOfRuns: isFastLocal ? 1 : 2,
      ...(chromePath || process.env.CHROME_PATH
        ? { chromePath: process.env.CHROME_PATH || chromePath }
        : {}),
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        skipAudits: ['full-page-screenshot'],
        logLevel: process.env.LHCI_LOG_LEVEL || (isFastLocal ? 'info' : 'silent'),
        // Disable artificial CPU/network throttling during local dev runs for 3x speedup
        ...(isFastLocal
          ? {
              throttlingMethod: 'provided',
              throttling: { rttMs: 0, throughputKbps: 0, cpuSlowdownMultiplier: 1 }
            }
          : {})
      }
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.80 }],
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
