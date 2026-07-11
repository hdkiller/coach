import { describe, it, expect } from 'vitest'
import { calculatePowerZones, calculateHrZones, formatZoneRange, identifyZone } from './zones'

describe('Zone Utils', () => {
  describe('calculatePowerZones', () => {
    it('calculates Coggan Classic zones correctly for 200W FTP', () => {
      const ftp = 200
      const zones = calculatePowerZones(ftp, 'coggan_classic')

      expect(zones).toHaveLength(7)

      // Z1: 0 - 55% (0 - 110)
      expect(zones[0]!.name).toContain('Z1')
      expect(zones[0]!.min).toBe(0)
      expect(zones[0]!.max).toBe(110)

      // Z2: 56% - 75% (111 - 150)
      expect(zones[1]!.name).toContain('Z2')
      expect(zones[1]!.min).toBe(111)
      expect(zones[1]!.max).toBe(150)

      // Z3: 76% - 90% (151 - 180)
      expect(zones[2]!.name).toContain('Z3')
      expect(zones[2]!.min).toBe(151)
      expect(zones[2]!.max).toBe(180)

      // Z4: 91% - 105% (181 - 210)
      expect(zones[3]!.name).toContain('Z4')
      expect(zones[3]!.min).toBe(181)
      expect(zones[3]!.max).toBe(210)

      // Z5: 106% - 120% (211 - 240)
      expect(zones[4]!.name).toContain('Z5')
      expect(zones[4]!.min).toBe(211)
      expect(zones[4]!.max).toBe(240)

      // Z6: 121% - 150% (241 - 300)
      expect(zones[5]!.name).toContain('Z6')
      expect(zones[5]!.min).toBe(241)
      expect(zones[5]!.max).toBe(300)
    })
  })

  describe('calculateHrZones', () => {
    it('calculates Friel LTHR zones correctly for 170 BPM LTHR', () => {
      const lthr = 170
      const zones = calculateHrZones(lthr, 190)

      expect(zones).toHaveLength(7)

      // Z1 Recovery: 0 - 81% (0 - 138)
      expect(zones[0]!.name).toContain('Z1')
      expect(zones[0]!.max).toBe(Math.round(170 * 0.81))

      // Z2 Aerobic: 82% - 89%
      expect(zones[1]!.name).toContain('Z2')
      expect(zones[1]!.min).toBe(zones[0]!.max + 1)
      expect(zones[1]!.max).toBe(Math.round(170 * 0.89))

      // Z5a SuperThreshold: 100% - 102%
      expect(zones[4]!.name).toContain('Z5a')
      expect(zones[4]!.min).toBe(Math.round(170 * 1.0))
      expect(zones[4]!.max).toBe(Math.round(170 * 1.02))
    })

    it('falls back to MaxHR zones if LTHR is missing', () => {
      const maxHr = 200
      const zones = calculateHrZones(null, maxHr)

      expect(zones).toHaveLength(5)

      // Z1: 0 - 60% (0 - 120)
      expect(zones[0]!.name).toContain('Z1')
      expect(zones[0]!.max).toBe(120)

      // Z5: 91% - 100% (181 - 200)
      expect(zones[4]!.name).toContain('Z5')
      expect(zones[4]!.min).toBe(181)
      expect(zones[4]!.max).toBe(200)
    })

    it('returns empty array if no HR data provided', () => {
      const zones = calculateHrZones(null, null)
      expect(zones).toHaveLength(0)
    })
  })

  describe('formatZoneRange', () => {
    it('formats watts correctly', () => {
      const zone = { name: 'Z1', min: 100, max: 200 }
      expect(formatZoneRange(zone, 'W')).toBe('100-200W')
    })
  })

  describe('identifyZone', () => {
    it('finds correct zone for a value', () => {
      const zones = [
        { name: 'Z1', min: 0, max: 100 },
        { name: 'Z2', min: 101, max: 200 }
      ]

      const z1 = identifyZone(50, zones)
      expect(z1?.name).toBe('Z1')

      const z2 = identifyZone(150, zones)
      expect(z2?.name).toBe('Z2')
    })

    it('returns undefined if outside all zones', () => {
      const zones = [{ name: 'Z1', min: 0, max: 100 }]
      const z = identifyZone(150, zones)
      expect(z).toBeUndefined()
    })
  })
})
