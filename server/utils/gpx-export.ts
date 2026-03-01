/**
 * Utility for exporting workout data to GPX format
 */

export function generateGPX(
  title: string,
  startTime: Date,
  latlngs: [number, number][],
  timeStream: number[],
  altitudes?: number[],
  heartrates?: number[],
  watts?: number[]
): string {
  if (!latlngs || latlngs.length === 0) {
    throw new Error('No GPS data available for GPX export')
  }

  // XML Header
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Coach Watts" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>${escapeXml(title)}</name>
    <time>${startTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(title)}</name>
    <trkseg>`

  // Track Points
  for (let i = 0; i < latlngs.length; i++) {
    const point = latlngs[i]
    if (!point || point.length < 2) continue

    const lat = point[0]
    const lon = point[1]
    const elapsedSec = timeStream[i] || 0
    const pointTime = new Date(startTime.getTime() + elapsedSec * 1000)

    gpx += `
      <trkpt lat="${lat}" lon="${lon}">`

    if (altitudes && altitudes[i] !== undefined) {
      gpx += `
        <ele>${altitudes[i]}</ele>`
    }

    gpx += `
        <time>${pointTime.toISOString()}</time>`

    // Extensions (HR, Cadence, Power)
    const hr = heartrates ? heartrates[i] : null
    const power = watts ? watts[i] : null

    if (hr !== null || power !== null) {
      gpx += `
        <extensions>`

      if (power !== null) {
        gpx += `
          <power>${power}</power>`
      }

      if (hr !== null) {
        gpx += `
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${Math.round(hr)}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>`
      }

      gpx += `
        </extensions>`
    }

    gpx += `
      </trkpt>`
  }

  gpx += `
    </trkseg>
  </trk>
</gpx>`

  return gpx
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case '"':
        return '&quot;'
      case "'":
        return '&apos;'
      default:
        return c
    }
  })
}
