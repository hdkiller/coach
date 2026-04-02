import pkg from './package.json'
import { createHash } from 'node:crypto'

const TERMS = [
  'negative-split',
  'tempo',
  'threshold',
  'vo2max',
  'aerobic',
  'lactate',
  'cadence',
  'drafting',
  'bonk',
  'hydration',
  'endurance',
  'ultra',
  'interval',
  'fartlek',
  'base',
  'peak',
  'recovery',
  'zone2',
  'taper',
  'hillrepeat'
]

const ANIMALS = [
  'falcon',
  'cheetah',
  'wolf',
  'gazelle',
  'ibex',
  'husky',
  'orca',
  'condor',
  'marlin',
  'albatross',
  'caribou',
  'puma',
  'camel'
]

const sanitizeSlugPart = (input: string) =>
  input
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const makeSeededRng = (seed: string) => {
  let state = createHash('sha256').update(seed).digest().readUInt32BE(0) >>> 0
  return (min: number, max: number) => {
    state = (1664525 * state + 1013904223) >>> 0
    const range = max - min + 1
    return min + (state % range)
  }
}

const pickDeterministic = (list: string[], rng: (min: number, max: number) => number) =>
  sanitizeSlugPart(list[rng(0, list.length - 1)] as string)

const getBuildCodename = (seed: string) => {
  if (process.env.NUXT_PUBLIC_BUILD_CODENAME) {
    return sanitizeSlugPart(process.env.NUXT_PUBLIC_BUILD_CODENAME)
  }

  const rng = makeSeededRng(seed)
  const term = pickDeterministic(TERMS, rng)
  const animal = pickDeterministic(ANIMALS, rng)
  return `${term}-${animal}`
}

const getGitCommitHash = () => {
  if (process.env.NUXT_PUBLIC_COMMIT_HASH) {
    return process.env.NUXT_PUBLIC_COMMIT_HASH
  }
  if (process.env.COMMIT_SHA) {
    return process.env.COMMIT_SHA.substring(0, 7)
  }
  if (process.env.REVISION_ID) {
    return process.env.REVISION_ID.substring(0, 7)
  }
  if (process.env.SHORT_SHA) {
    return process.env.SHORT_SHA
  }
  if (process.env.BUILD_ID) {
    return process.env.BUILD_ID
  }
  return process.env.NODE_ENV === 'development' ? 'dev' : 'unknown'
}

const commitHash = getGitCommitHash()
const date = new Date()
const buildDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
const buildCodenameSeed =
  process.env.NUXT_PUBLIC_BUILD_CODENAME_SEED ||
  (commitHash !== 'unknown' ? `${pkg.version}:${commitHash}` : `${pkg.version}:${buildDate}`)
const buildCodename = getBuildCodename(buildCodenameSeed)
const buildVersion = `v${pkg.version}+${buildDate}.${commitHash}.${buildCodename}`

const sentryRelease = `${pkg.name}@${pkg.version}+${commitHash}`

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ignore: ['examples/**', 'coverage/**', 'backups/**'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      titleTemplate: '%s - Coach Watts',
      title: 'Coach Watts',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'AI-powered endurance coaching platform that adapts to your training.'
        },
        { name: 'apple-mobile-web-app-title', content: 'Coach Watts' },
        { name: 'application-name', content: 'Coach Watts' },
        { property: 'og:site_name', content: 'Coach Watts' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@coachwatts' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ],
      script: [
        {
          innerHTML: `
            (function() {
              window.addEventListener('error', function(event) {
                var errorText = event.message || '';
                if (
                  errorText.includes('Importing a module script failed') ||
                  errorText.includes('Failed to fetch dynamically imported module') ||
                  errorText.includes('loading chunk')
                ) {
                  var now = Date.now();
                  var lastReload = sessionStorage.getItem('chunk-error-reload');
                  if (lastReload && (now - parseInt(lastReload) < 10000)) return;
                  sessionStorage.setItem('chunk-error-reload', now.toString());
                  var url = new URL(window.location.href);
                  url.searchParams.set('reload', now.toString());
                  window.location.href = url.toString();
                }
              }, true);
            })();
          `.replace(/\s+/g, ' '),
          type: 'text/javascript'
        }
      ]
    }
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/content',
    '@stefanobartoletti/nuxt-social-share',
    '@sidebase/nuxt-auth',
    '@nuxtjs/mdc',
    '@pinia/nuxt',
    'nuxt-gtag',
    'nuxt-api-shield',
    '@sentry/nuxt/module',
    '@nuxt/eslint',
    '@vue-email/nuxt'
  ],

  vueEmail: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://app.coachwatts.com',
    emailsDir: 'app/emails'
  },

  colorMode: {
    preference: 'system',
    fallback: 'light'
  },

  socialShare: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3099'
  },

  nitro: {
    experimental: {
      openAPI: true,
      websocket: true,
      tasks: true,
      asyncContext: true
    },
    openAPI: {
      production: 'runtime',
      route: '/_openapi.json',
      meta: {
        title: 'Coach Watts API',
        description: 'AI-powered endurance coaching platform API',
        version: pkg.version
      },
      ui: {
        scalar: {
          route: '/_docs/scalar',
          theme: 'purple'
        },
        swagger: {
          route: '/_docs/swagger'
        }
      }
    },
    // Ensure unhead is properly bundled/traced
    externals: {
      // @vue-email/compiler dynamically loads vue-email at runtime.
      // Inline both so Nitro always ships them in production output.
      inline: ['unhead', '@vue-email/compiler', 'vue-email']
    },
    // Rate limit storage
    storage: {
      shield: {
        driver: 'memory'
      }
    },
    scheduledTasks: {
      '*/15 * * * *': ['shield:cleanBans'],
      '0 0 * * *': ['shield:cleanIpData']
    }
  },

  css: ['~/assets/css/main.css'],

  auth: {
    baseURL: '/api/auth',
    provider: {
      type: 'authjs'
    },
    session: {
      enableRefreshPeriodically: true,
      enableRefreshOnWindowFocus: true
    }
  },

  runtimeConfig: {
    authOrigin: process.env.NUXT_AUTH_ORIGIN || 'http://localhost:3099',
    authBypassEnabled: !!process.env.AUTH_BYPASS_USER,
    authBypassUser: process.env.AUTH_BYPASS_USER || '',
    authBypassName: process.env.AUTH_BYPASS_NAME || '',

    // Redis / DragonflyDB
    redisUrl: process.env.REDIS_URL || '',

    // Resend
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',

    // Stripe Configuration
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    stripeSupporterProductId: process.env.STRIPE_SUPPORTER_PRODUCT_ID || '',
    stripeSupporterMonthlyPriceId: process.env.STRIPE_SUPPORTER_MONTHLY_PRICE_ID || '',
    stripeSupporterAnnualPriceId: process.env.STRIPE_SUPPORTER_ANNUAL_PRICE_ID || '',
    stripeSupporterMonthlyEurPriceId: process.env.STRIPE_SUPPORTER_MONTHLY_EUR_PRICE_ID || '',
    stripeSupporterAnnualEurPriceId: process.env.STRIPE_SUPPORTER_ANNUAL_EUR_PRICE_ID || '',
    stripeProProductId: process.env.STRIPE_PRO_PRODUCT_ID || '',
    stripeProMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    stripeProAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
    stripeProMonthlyEurPriceId: process.env.STRIPE_PRO_MONTHLY_EUR_PRICE_ID || '',
    stripeProAnnualEurPriceId: process.env.STRIPE_PRO_ANNUAL_EUR_PRICE_ID || '',

    public: {
      authAllowedProviders: (process.env.AUTH_ALLOWED_PROVIDERS || '')
        .split(',')
        .map((provider) => provider.trim())
        .filter(Boolean),
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3099',
      version: pkg.version,
      commitHash,
      buildDate,
      buildCodename,
      buildVersion,
      sentryRelease,
      authBypassEnabled: !!process.env.AUTH_BYPASS_USER,
      authBypassUser: process.env.AUTH_BYPASS_USER || '',
      authBypassName: process.env.AUTH_BYPASS_NAME || '',
      authOidcEnabled: Boolean(
        process.env.OIDC_PROVIDER_ID &&
        process.env.OIDC_CLIENT_ID &&
        process.env.OIDC_CLIENT_SECRET &&
        (process.env.OIDC_WELL_KNOWN || process.env.OIDC_ISSUER)
      ),
      authOidcProviderId: process.env.OIDC_PROVIDER_ID || '',
      authOidcProviderName: process.env.OIDC_PROVIDER_NAME || process.env.OIDC_PROVIDER_ID || '',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      stripeSupporterMonthlyPriceId: process.env.STRIPE_SUPPORTER_MONTHLY_PRICE_ID || '',
      stripeSupporterAnnualPriceId: process.env.STRIPE_SUPPORTER_ANNUAL_PRICE_ID || '',
      stripeSupporterMonthlyEurPriceId: process.env.STRIPE_SUPPORTER_MONTHLY_EUR_PRICE_ID || '',
      stripeSupporterAnnualEurPriceId: process.env.STRIPE_SUPPORTER_ANNUAL_EUR_PRICE_ID || '',
      stripeProMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
      stripeProAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
      stripeProMonthlyEurPriceId: process.env.STRIPE_PRO_MONTHLY_EUR_PRICE_ID || '',
      stripeProAnnualEurPriceId: process.env.STRIPE_PRO_ANNUAL_EUR_PRICE_ID || '',
      subscriptionsEnabled: process.env.NUXT_PUBLIC_SUBSCRIPTIONS_ENABLED !== 'false',
      stravaEnabled: process.env.NUXT_PUBLIC_STRAVA_ENABLED !== 'false',
      tolgee: {
        apiUrl:
          process.env.TOLGEE_API_ENABLED === 'true'
            ? process.env.NUXT_PUBLIC_TOLGEE_API_URL || process.env.TOLGEE_API_URL
            : undefined,
        apiKey:
          process.env.TOLGEE_API_ENABLED === 'true'
            ? process.env.NUXT_PUBLIC_TOLGEE_API_KEY || process.env.TOLGEE_API_KEY
            : undefined
      },
      gtag: {
        id: process.env.NUXT_PUBLIC_GTAG_ID,
        enabled: !!process.env.NUXT_PUBLIC_GTAG_ID
      },
      realtimeBusEnabled: !!process.env.REDIS_URL
    }
  },

  devServer: {
    port: 3099
  },

  build: {
    transpile: ['@vue-leaflet/vue-leaflet', '@tolgee/vue', '@tolgee/web', '@tolgee/format-icu']
  },

  vite: {
    server: {
      watch: {
        ignored: [
          '**/examples/**',
          '**/coverage/**',
          '**/backups/**',
          '**/.output/**',
          '**/.trigger/**',
          '**/.nuxt/**',
          '**/node_modules/**'
        ]
      }
    },
    optimizeDeps: {
      include: [
        'prosemirror-state',
        'leaflet',
        '@vueuse/core',
        'date-fns',
        'date-fns-tz',
        'vue-chartjs',
        'chart.js',
        'chartjs-adapter-date-fns',
        'vuedraggable',
        '@sentry/nuxt',
        'zod',
        '@internationalized/date'
      ]
    },
    vue: {
      template: {
        compilerOptions: {
          isCustomElement: (tag) => ['rapi-doc'].includes(tag)
        }
      }
    }
  },

  sentry: {
    org: 'newpush-y4',
    project: 'coach-watts',
    sourceMapsUploadOptions: {
      telemetry: false
    }
  },

  sourcemap: {
    client: 'hidden'
  },

  nuxtApiShield: {
    limit: {
      max: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '1000', 10),
      duration: parseInt(process.env.WEBHOOK_RATE_LIMIT_TTL || '60', 10),
      ban: 300
    },
    // @ts-expect-error: Type definition mismatch in module
    security: {
      trustXForwardedFor: true
    },
    routes: [
      '/api/integrations/withings/webhook',
      '/api/integrations/whoop/webhook',
      '/api/integrations/intervals/webhook',
      '/api/integrations/fitbit/webhook'
    ],
    retryAfterHeader: true
  }
})
