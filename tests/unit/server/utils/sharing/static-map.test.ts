import { describe, expect, it } from 'vitest'
import {
  buildStaticMapSvg,
  normalizeLatLngSegments,
  projectSegmentsToViewport
} from '../../../../../server/utils/sharing/static-map'

describe('static workout map rendering', () => {
  it('splits coordinate segments around invalid points', () => {
    const segments = normalizeLatLngSegments([
      [47.5, 19.04],
      [47.5005, 19.041],
      null,
      { lat: 47.501, lng: 19.042 },
      { lat: 47.502, lng: 19.043 }
    ])

    expect(segments).toHaveLength(2)
    expect(segments[0]).toHaveLength(2)
    expect(segments[1]).toHaveLength(2)
  })

  it('projects points into the padded viewport while preserving route proportions', () => {
    const segments = normalizeLatLngSegments([
      [47.5, 19.04],
      [47.5005, 19.041],
      [47.501, 19.043],
      [47.502, 19.044]
    ])

    const projection = projectSegmentsToViewport(segments, {
      width: 840,
      height: 760,
      padding: 56
    })

    expect(projection).not.toBeNull()
    expect(projection!.projectedBounds.minX).toBeGreaterThanOrEqual(56)
    expect(projection!.projectedBounds.maxX).toBeLessThanOrEqual(840 - 56)
    expect(projection!.projectedBounds.minY).toBeGreaterThanOrEqual(56)
    expect(projection!.projectedBounds.maxY).toBeLessThanOrEqual(760 - 56)

    const originalWidth = (19.044 - 19.04) * Math.cos((47.500875 * Math.PI) / 180)
    const originalHeight = 47.502 - 47.5
    const projectedWidth = projection!.projectedBounds.maxX - projection!.projectedBounds.minX
    const projectedHeight = projection!.projectedBounds.maxY - projection!.projectedBounds.minY

    expect(projectedWidth / projectedHeight).toBeCloseTo(originalWidth / originalHeight, 3)
  })

  it('renders a valid svg for loops and out-and-back routes', () => {
    const svg = buildStaticMapSvg(
      [
        [47.5, 19.04],
        [47.501, 19.042],
        [47.502, 19.04],
        [47.501, 19.038],
        [47.5, 19.04]
      ],
      {
        width: 840,
        height: 760,
        padding: 56
      }
    )

    expect(svg).toContain('<svg')
    expect(svg).toContain('<path d="M')
    expect(svg).toContain('circle')
  })

  it('omits the framed map panel when framed is disabled', () => {
    const svg = buildStaticMapSvg(
      [
        [47.5, 19.04],
        [47.5005, 19.041],
        [47.501, 19.042]
      ],
      {
        width: 840,
        height: 760,
        padding: 40,
        framed: false
      }
    )

    expect(svg).not.toContain('fill="#101418"')
    expect(svg).not.toContain('stroke="rgba(255,255,255,0.08)"')
  })
})
