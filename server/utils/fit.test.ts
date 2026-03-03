import { describe, it, expect } from 'vitest'
import { extractFitStreams, reconstructSessionFromRecords, normalizeFitSession } from './fit'

describe('Fit Utils', () => {
  describe('extractFitStreams', () => {
    it('extracts basic streams correctly', () => {
      const records = [
        {
          timestamp: '2023-01-01T10:00:00Z',
          elapsed_time: 0,
          distance: 0,
          speed: 0,
          heart_rate: 60,
          power: 100
        },
        {
          timestamp: '2023-01-01T10:00:01Z',
          elapsed_time: 1,
          distance: 5,
          speed: 5,
          heart_rate: 140,
          power: 200
        }
      ]

      const streams = extractFitStreams(records)

      expect(streams.time).toEqual([0, 1])
      expect(streams.distance).toEqual([0, 5])
      expect(streams.velocity).toEqual([0, 5])
      expect(streams.heartrate).toEqual([60, 140])
      expect(streams.watts).toEqual([100, 200])
    })

    it('calculates grade from altitude and distance when grade is missing', () => {
      // 100m distance, 10m ascent = 10% grade
      const records = [
        { timestamp: '2023-01-01T10:00:00Z', elapsed_time: 0, distance: 0, altitude: 100 },
        { timestamp: '2023-01-01T10:00:10Z', elapsed_time: 10, distance: 100, altitude: 110 }
      ]

      const streams = extractFitStreams(records)

      expect(streams.grade).toHaveLength(2)
      expect(streams.grade[0]).toBe(0) // First point always 0
      expect(streams.grade[1]).toBeCloseTo(10) // (10 / 100) * 100
    })

    it('infers moving status from velocity', () => {
      const records = [
        { timestamp: '2023-01-01T10:00:00Z', elapsed_time: 0, speed: 0 }, // Stopped
        { timestamp: '2023-01-01T10:00:01Z', elapsed_time: 1, speed: 3.0 }, // Moving (>0.5)
        { timestamp: '2023-01-01T10:00:02Z', elapsed_time: 2, speed: 0.1 } // Stopped (<0.5)
      ]

      const streams = extractFitStreams(records)

      expect(streams.moving).toEqual([false, true, false])
    })
  })

  describe('reconstructSessionFromRecords', () => {
    it('calculates averages and max values correctly', () => {
      const records = [
        {
          timestamp: '2023-01-01T10:00:00Z',
          elapsed_time: 0,
          power: 100,
          heart_rate: 140,
          cadence: 80
        },
        {
          timestamp: '2023-01-01T10:00:01Z',
          elapsed_time: 1,
          power: 200,
          heart_rate: 160,
          cadence: 90
        },
        {
          timestamp: '2023-01-01T10:00:02Z',
          elapsed_time: 2,
          power: 150,
          heart_rate: 150,
          cadence: 85
        }
      ]

      const session = reconstructSessionFromRecords(records)

      expect(session).not.toBeNull()
      if (!session) return

      expect(session.avg_power).toBe(150) // (100+200+150)/3
      expect(session.max_power).toBe(200)

      expect(session.avg_heart_rate).toBe(150)
      expect(session.max_heart_rate).toBe(160)

      expect(session.avg_cadence).toBe(85)
      expect(session.max_cadence).toBe(90)
    })

    it('returns null for empty records', () => {
      expect(reconstructSessionFromRecords([])).toBeNull()
    })
  })

  describe('normalizeFitSession', () => {
    it('maps FIT fields to App schema', () => {
      const fitSession = {
        start_time: new Date('2023-01-01T10:00:00Z'),
        total_timer_time: 3600,
        total_distance: 30000,
        total_ascent: 500,
        avg_power: 200,
        max_power: 500,
        avg_heart_rate: 150,
        max_heart_rate: 180,
        sport: 'cycling'
      }

      const userId = 'user-123'
      const filename = 'morning-ride.fit'

      const workout = normalizeFitSession(fitSession, userId, filename)

      expect(workout.userId).toBe(userId)
      expect(workout.durationSec).toBe(3600)
      expect(workout.distanceMeters).toBe(30000)
      expect(workout.elevationGain).toBe(500)
      expect(workout.averageWatts).toBe(200)
      expect(workout.averageHr).toBe(150)
      expect(workout.type).toBe('Cycling')
      expect(workout.externalId).toContain('fit_')
      expect(workout.externalId).toContain('morning_ride')
      expect(workout.title).toBe('morning ride')
    })

    it('prefers the provided activity name over the filename', () => {
      const fitSession = {
        start_time: new Date('2023-01-01T10:00:00Z'),
        total_timer_time: 3600,
        sport: 'cycling'
      }

      const workout = normalizeFitSession(
        fitSession,
        'user-123',
        'morning-ride.fit',
        'Sunday Endurance Ride'
      )

      expect(workout.title).toBe('Sunday Endurance Ride')
    })
  })
})
