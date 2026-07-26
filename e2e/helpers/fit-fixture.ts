import { FitWriter } from '@markw65/fit-file-writer'

/**
 * Generates a valid binary FIT activity file buffer for E2E testing.
 */
export function generateSampleFitBuffer(title: string = 'E2E Test Ride'): Buffer {
  const fitWriter = new FitWriter()
  const toFitTimestamp = (date: Date) => Math.round(date.getTime() / 1000) - 631065600

  const now = new Date()

  // 1. File ID Header
  fitWriter.writeMessage('file_id', {
    type: 'activity',
    manufacturer: 'garmin',
    product: 1,
    serial_number: 99999,
    time_created: toFitTimestamp(now),
    number: 1,
    product_name: 'Coach Watts E2E Test'
  })

  // 2. Activity Session Summary
  fitWriter.writeMessage('session', {
    timestamp: toFitTimestamp(now),
    start_time: toFitTimestamp(now),
    total_elapsed_time: 3600,
    total_timer_time: 3600,
    total_distance: 25000,
    total_calories: 650,
    avg_speed: 6.94,
    max_speed: 11.2,
    avg_power: 215,
    max_power: 380,
    normalized_power: 225,
    training_stress_score: 70,
    intensity_factor: 0.82,
    avg_heart_rate: 145,
    max_heart_rate: 172,
    avg_cadence: 88,
    sport: 'cycling',
    sub_sport: 'generic'
  })

  // 3. Trackpoint Records
  for (let i = 0; i < 10; i++) {
    const recordTime = new Date(now.getTime() + i * 1000)
    fitWriter.writeMessage('record', {
      timestamp: toFitTimestamp(recordTime),
      distance: i * 10,
      speed: 6.94,
      power: 215,
      heart_rate: 145,
      cadence: 88
    })
  }

  const fitArray = fitWriter.finish()
  return Buffer.from(fitArray.buffer, fitArray.byteOffset, fitArray.byteLength)
}
