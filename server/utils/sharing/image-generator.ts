import fs from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { formatPace } from '../pacing'

interface WorkoutData {
  title: string
  type: string | null
  date: Date
  durationSec: number
  distanceMeters: number | null
  averageHr: number | null
  averageWatts: number | null
  averageSpeed: number | null
}

export const imageGenerator = {
  /**
   * Generates a PNG buffer from a workout and a template name
   */
  async generateWorkoutImage(
    workout: WorkoutData,
    templateName: string = 'activity-modern'
  ): Promise<Buffer> {
    const templatePath = path.resolve(
      process.cwd(),
      `server/assets/templates/sharing/${templateName}.svg`
    )
    let svgContent = await fs.readFile(templatePath, 'utf-8')

    const data = this.prepareImageData(workout)

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`
      svgContent = svgContent.replaceAll(placeholder, String(value))
    }

    const resvg = new Resvg(svgContent, {
      background: '#09090B',
      fitTo: {
        mode: 'width',
        value: 1080
      }
    })

    const pngData = resvg.render()
    return pngData.asPng()
  },

  /**
   * Prepares the data object for SVG placeholders
   */
  prepareImageData(workout: WorkoutData) {
    const distanceKm = workout.distanceMeters ? (workout.distanceMeters / 1000).toFixed(1) : '0.0'
    const durationMin = Math.floor(workout.durationSec / 60)
    const durationHours = Math.floor(durationMin / 60)
    const remainingMin = durationMin % 60
    const durationStr =
      durationHours > 0 ? `${durationHours}h ${remainingMin}m` : `${remainingMin}m`

    let paceStr = 'N/A'
    if (workout.averageSpeed && workout.averageSpeed > 0) {
      // averageSpeed is usually m/s.
      // 1 m/s = 3.6 km/h.
      // pace (min/km) = 60 / (speed in km/h) = 60 / (averageSpeed * 3.6) = 16.666 / averageSpeed
      const paceMinPerKm = 16.666667 / workout.averageSpeed
      paceStr = formatPace(paceMinPerKm).replace('/km', '')
    } else if (workout.durationSec > 0 && workout.distanceMeters && workout.distanceMeters > 0) {
      const paceMinPerKm = workout.durationSec / 60 / (workout.distanceMeters / 1000)
      paceStr = formatPace(paceMinPerKm).replace('/km', '')
    }

    return {
      title: workout.title || 'Untitled Activity',
      subtitle: workout.type || 'Activity',
      heroLabel: 'Total Distance',
      heroValue: distanceKm,
      heroUnit: 'KM',
      stat1Label: 'Avg Pace',
      stat1Value: paceStr,
      stat1Unit: '/KM',
      stat2Label: 'Heart Rate',
      stat2Value: workout.averageHr ? Math.round(workout.averageHr) : '--',
      stat2Unit: 'BPM',
      stat3Label: 'Avg Power',
      stat3Value: workout.averageWatts ? Math.round(workout.averageWatts) : '--',
      stat3Unit: 'W'
    }
  }
}
