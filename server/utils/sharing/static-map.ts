type CoordinateInput = [number, number] | { lat: number; lng: number } | null | undefined

export interface MapPoint {
  lat: number
  lng: number
}

export interface ProjectedPoint {
  x: number
  y: number
}

export interface StaticMapOptions {
  width: number
  height: number
  padding?: number
  maxPoints?: number
  transparent?: boolean
  framed?: boolean
  routeColor?: string
  routeGlowColor?: string
  glow?: boolean
}

export interface StaticMapProjection {
  segments: ProjectedPoint[][]
  startPoint: ProjectedPoint
  endPoint: ProjectedPoint
  projectedBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}

const DEFAULT_PADDING = 48
const DEFAULT_MAX_POINTS = 1200

export function normalizeLatLngSegments(coordinates: CoordinateInput[]): MapPoint[][] {
  const segments: MapPoint[][] = []
  let currentSegment: MapPoint[] = []

  for (const coordinate of coordinates) {
    const point = toMapPoint(coordinate)

    if (!point) {
      if (currentSegment.length > 1) {
        segments.push(currentSegment)
      }
      currentSegment = []
      continue
    }

    currentSegment.push(point)
  }

  if (currentSegment.length > 1) {
    segments.push(currentSegment)
  }

  return segments
}

export function projectSegmentsToViewport(
  segments: MapPoint[][],
  options: StaticMapOptions
): StaticMapProjection | null {
  const decimatedSegments = decimateSegments(segments, options.maxPoints ?? DEFAULT_MAX_POINTS)
  const points = decimatedSegments.flat()

  if (points.length < 2) {
    return null
  }

  const padding = options.padding ?? DEFAULT_PADDING
  const centerLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length
  const cosLat = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.01)

  const projectedRaw = points.map((point) => ({
    x: point.lng * cosLat,
    y: -point.lat
  }))

  const minX = Math.min(...projectedRaw.map((point) => point.x))
  const maxX = Math.max(...projectedRaw.map((point) => point.x))
  const minY = Math.min(...projectedRaw.map((point) => point.y))
  const maxY = Math.max(...projectedRaw.map((point) => point.y))

  const rawWidth = Math.max(maxX - minX, 1e-9)
  const rawHeight = Math.max(maxY - minY, 1e-9)
  const innerWidth = Math.max(options.width - padding * 2, 1)
  const innerHeight = Math.max(options.height - padding * 2, 1)
  const scale = Math.min(innerWidth / rawWidth, innerHeight / rawHeight)

  const offsetX = (options.width - rawWidth * scale) / 2
  const offsetY = (options.height - rawHeight * scale) / 2

  let pointIndex = 0
  const projectedSegments = decimatedSegments.map((segment) =>
    segment.map(() => {
      const point = projectedRaw[pointIndex++]
      return {
        x: offsetX + (point.x - minX) * scale,
        y: offsetY + (point.y - minY) * scale
      }
    })
  )

  const projectedPoints = projectedSegments.flat()

  return {
    segments: projectedSegments,
    startPoint: projectedSegments[0][0],
    endPoint:
      projectedSegments[projectedSegments.length - 1][
        projectedSegments[projectedSegments.length - 1].length - 1
      ],
    projectedBounds: {
      minX: Math.min(...projectedPoints.map((point) => point.x)),
      maxX: Math.max(...projectedPoints.map((point) => point.x)),
      minY: Math.min(...projectedPoints.map((point) => point.y)),
      maxY: Math.max(...projectedPoints.map((point) => point.y))
    }
  }
}

export function buildStaticMapSvg(
  coordinates: CoordinateInput[],
  options: StaticMapOptions
): string | null {
  const segments = normalizeLatLngSegments(coordinates)
  const projection = projectSegmentsToViewport(segments, options)

  if (!projection) {
    return null
  }

  const routePaths = projection.segments
    .map((segment) => {
      const path = segment
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${round(point.x)} ${round(point.y)}`)
        .join(' ')
      return `<path d="${path}" />`
    })
    .join('')

  return [
    `<svg viewBox="0 0 ${options.width} ${options.height}" width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">`,
    '<defs>',
    '<linearGradient id="map-sheen" x1="0%" y1="0%" x2="100%" y2="100%">',
    '<stop offset="0%" stop-color="rgba(255,255,255,0.10)" />',
    '<stop offset="100%" stop-color="rgba(0,220,130,0.02)" />',
    '</linearGradient>',
    '<radialGradient id="map-glow" cx="50%" cy="45%" r="75%">',
    '<stop offset="0%" stop-color="rgba(0,220,130,0.18)" />',
    '<stop offset="100%" stop-color="rgba(0,220,130,0)" />',
    '</radialGradient>',
    '<filter id="map-shadow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feGaussianBlur stdDeviation="12" />',
    '</filter>',
    '<filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur4" />',
    '<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur10" />',
    '<feComponentTransfer in="blur4" result="intenseGlow">',
    '<feFuncA type="linear" slope="2" />',
    '</feComponentTransfer>',
    '<feMerge>',
    '<feMergeNode in="blur10" />',
    '<feMergeNode in="intenseGlow" />',
    '<feMergeNode in="SourceGraphic" />',
    '</feMerge>',
    '</filter>',
    '</defs>',
    ...(options.transparent || options.framed === false
      ? []
      : [
          `<rect width="${options.width}" height="${options.height}" rx="28" fill="#101418" />`,
          `<rect width="${options.width}" height="${options.height}" rx="28" fill="url(#map-sheen)" stroke="rgba(255,255,255,0.08)" />`,
          `<circle cx="${round(options.width / 2)}" cy="${round(options.height * 0.38)}" r="${round(Math.max(options.width, options.height) * 0.42)}" fill="url(#map-glow)" filter="url(#map-shadow)" />`,
          `<path d="M 32 ${round(options.height * 0.25)} H ${options.width - 32}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="10 12" />`,
          `<path d="M 32 ${round(options.height * 0.75)} H ${options.width - 32}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="10 12" />`
        ]),
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    ...(options.glow === false
      ? []
      : [
          routePaths.replaceAll(
            '/>',
            ` stroke="${options.routeGlowColor || 'rgba(0,220,130,0.24)'}" stroke-width="18" filter="url(#route-glow)" />`
          )
        ]),
    routePaths.replaceAll('/>', ` stroke="${options.routeColor || '#00C16A'}" stroke-width="8" />`),
    '</g>',
    `<circle cx="${round(projection.startPoint.x)}" cy="${round(projection.startPoint.y)}" r="12" fill="#09090B" stroke="${options.routeColor || '#00C16A'}" stroke-width="5" />`,
    `<circle cx="${round(projection.endPoint.x)}" cy="${round(projection.endPoint.y)}" r="14" fill="${options.routeColor || '#00C16A'}" stroke="#ECFDF5" stroke-width="4" />`,
    '</svg>'
  ].join('')
}

function toMapPoint(coordinate: CoordinateInput): MapPoint | null {
  if (!coordinate) return null

  if (Array.isArray(coordinate)) {
    const [lat, lng] = coordinate
    return isFiniteNumber(lat) && isFiniteNumber(lng) ? { lat, lng } : null
  }

  if (isFiniteNumber(coordinate.lat) && isFiniteNumber(coordinate.lng)) {
    return { lat: coordinate.lat, lng: coordinate.lng }
  }

  return null
}

function decimateSegments(segments: MapPoint[][], maxPoints: number): MapPoint[][] {
  const totalPoints = segments.reduce((sum, segment) => sum + segment.length, 0)
  const step = Math.max(1, Math.ceil(totalPoints / Math.max(maxPoints, 2)))

  if (step === 1) {
    return segments
  }

  return segments
    .map((segment) => {
      if (segment.length <= 2) return segment

      const decimated = segment.filter(
        (_, index) => index === 0 || index === segment.length - 1 || index % step === 0
      )
      return decimated.length > 1 ? decimated : segment.slice(0, 2)
    })
    .filter((segment) => segment.length > 1)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function round(value: number): string {
  return value.toFixed(2)
}
