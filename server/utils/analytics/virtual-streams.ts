export interface RawStreams {
  time?: number[]
  distance?: number[]
  watts?: number[]
  heartrate?: number[]
  cadence?: number[]
  velocity?: number[]
  altitude?: number[]
  grade?: number[]
  lat?: number[]
  lng?: number[]
}

export type VirtualField = 'torque' | 'vam' | 'decoupling_ratio' | 'power_hr_ratio' | 'w_balance'

/**
 * Calculates virtual streams derived from raw sensor data.
 */
export function calculateVirtualStream(
  field: VirtualField,
  streams: RawStreams,
  settings?: { ftp?: number; w_prime?: number }
): number[] {
  const { watts, heartrate, cadence, altitude, time } = streams
  const length = time?.length || watts?.length || 0
  if (length === 0) return []

  const result: number[] = new Array(length).fill(null)

  switch (field) {
    case 'torque': {
      if (!watts || !cadence) return []
      for (let i = 0; i < length; i++) {
        const w = watts[i]
        const c = cadence[i]
        if (w !== undefined && c !== undefined && c > 10) {
          // Torque (Nm) = (Watts * 60) / (2 * PI * Cadence)
          result[i] = Number(((w * 60) / (2 * Math.PI * c)).toFixed(1))
        } else {
          result[i] = 0
        }
      }
      break
    }

    case 'vam': {
      if (!altitude || !time) return []
      // VAM = (Vertical meters / time in seconds) * 3600
      // We use a rolling window of 30 seconds for smoother VAM
      const windowSize = 30
      for (let i = windowSize; i < length; i++) {
        const diffAlt = altitude[i]! - altitude[i - windowSize]!
        const diffTime = time[i]! - time[i - windowSize]!
        if (diffTime > 0 && diffAlt > 0) {
          result[i] = Math.round((diffAlt / diffTime) * 3600)
        } else {
          result[i] = 0
        }
      }
      break
    }

    case 'decoupling_ratio':
    case 'power_hr_ratio': {
      if (!watts || !heartrate) return []
      for (let i = 0; i < length; i++) {
        const w = watts[i]
        const hr = heartrate[i]
        if (w !== undefined && hr !== undefined && hr > 40) {
          result[i] = Number((w / hr).toFixed(2))
        } else {
          result[i] = 0
        }
      }
      break
    }

    case 'w_balance': {
      if (!watts || !time || !settings?.ftp || !settings?.w_prime) return []
      const ftp = settings.ftp
      const wPrime = settings.w_prime
      let currentW = wPrime

      for (let i = 0; i < length; i++) {
        const w = watts[i] || 0
        const dt = i === 0 ? 0 : time[i]! - time[i - 1]!

        if (w > ftp) {
          // Depleting
          currentW -= (w - ftp) * dt
        } else {
          // Recharging (simplified linear recharge for now)
          // Real W' balance uses an exponential recharge: W'(t) = W' + (W'bal_prev - W') * e^(-(CP-P)t / W')
          const tau = wPrime / (ftp - Math.min(w, ftp - 1))
          currentW = wPrime + (currentW - wPrime) * Math.exp(-dt / tau)
        }

        result[i] = Math.max(0, Math.round(currentW))
      }
      break
    }
  }

  return result
}
