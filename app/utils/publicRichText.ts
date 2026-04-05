import { marked } from 'marked'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizePublicUrl(value: string) {
  if (!value) return null
  if (value.startsWith('/')) return value

  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
  } catch {
    return null
  }

  return null
}

function extractAttribute(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`${attribute}="([^"]*)"`, 'i'))
  return match?.[1] || ''
}

function sanitizeRenderedMedia(html: string) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = sanitizePublicUrl(extractAttribute(tag, 'src'))
    if (!src) return ''

    const alt = escapeHtml(extractAttribute(tag, 'alt'))
    const title = extractAttribute(tag, 'title')
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : ''

    return `<img src="${src}" alt="${alt}"${titleAttribute} loading="lazy" decoding="async" />`
  })
}

export function renderSafeMarkdown(value?: string | null) {
  if (!value) return ''
  return sanitizeRenderedMedia(marked.parse(escapeHtml(value)) as string)
}
