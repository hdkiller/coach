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
        // Prevent strict offscreen image or external HTTP warning errors from breaking CI
        'uses-http2': 'off',
        'offscreen-images': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
