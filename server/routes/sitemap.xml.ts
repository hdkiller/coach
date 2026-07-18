import { listPublishedPublicEvents } from '../utils/public-events'

type SitemapEntry = {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toXml(entries: SitemapEntry[]) {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`]
      if (entry.lastmod) parts.push(`    <lastmod>${entry.lastmod}</lastmod>`)
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`)
      if (entry.priority != null) {
        parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`)
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

function siteOrigin(event: Parameters<typeof getRequestURL>[0]) {
  const config = useRuntimeConfig()
  const configured = String(config.public.siteUrl || '').replace(/\/$/, '')
  if (configured && !configured.includes('localhost')) {
    return configured
  }
  const requestUrl = getRequestURL(event)
  return `${requestUrl.protocol}//${requestUrl.host}`
}

export default defineEventHandler(async (event) => {
  const origin = siteOrigin(event)

  const staticPaths: Array<{
    path: string
    priority: number
    changefreq: SitemapEntry['changefreq']
  }> = [
    { path: '/', priority: 1.0, changefreq: 'weekly' },
    { path: '/calendar', priority: 0.9, changefreq: 'daily' },
    { path: '/training-plans', priority: 0.8, changefreq: 'weekly' },
    { path: '/works-with', priority: 0.6, changefreq: 'monthly' },
    { path: '/stories', priority: 0.6, changefreq: 'monthly' },
    { path: '/documentation', priority: 0.5, changefreq: 'monthly' },
    { path: '/support', priority: 0.4, changefreq: 'monthly' },
    { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
    { path: '/terms', priority: 0.3, changefreq: 'yearly' }
  ]

  // Partner offer pages are intentionally omitted — redeemable via direct link only.
  const events = await listPublishedPublicEvents({ includePast: true })

  const entries: SitemapEntry[] = [
    ...staticPaths.map((item) => ({
      loc: `${origin}${item.path}`,
      changefreq: item.changefreq,
      priority: item.priority
    })),
    ...events.map((publicEvent) => ({
      loc: `${origin}${publicEvent.publicUrl}`,
      changefreq: 'weekly' as const,
      priority: 0.8
    }))
  ]

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return toXml(entries)
})
