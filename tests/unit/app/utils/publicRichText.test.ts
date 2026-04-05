import { describe, expect, it } from 'vitest'
import { renderSafeMarkdown } from '../../../../app/utils/publicRichText'

describe('publicRichText', () => {
  it('renders markdown images with safe attributes', () => {
    const html = renderSafeMarkdown('![Coach photo](https://example.com/coach.jpg)')

    expect(html).toContain('<img')
    expect(html).toContain('src="https://example.com/coach.jpg"')
    expect(html).toContain('alt="Coach photo"')
    expect(html).toContain('loading="lazy"')
  })

  it('rejects unsafe image urls', () => {
    const html = renderSafeMarkdown('![Coach photo](javascript:alert(1))')

    expect(html).not.toContain('<img')
  })

  it('escapes raw html while preserving markdown formatting', () => {
    const html = renderSafeMarkdown('<script>alert(1)</script>\n\n**Bold**')

    expect(html).not.toContain('<script>')
    expect(html).toContain('<strong>Bold</strong>')
  })
})
