/**
 * Largest-Triangle-Three-Buckets (LTTB) algorithm for downsampling data while preserving visual features.
 * Based on the thesis by Sveinn Steinarsson.
 */
export function lttb<T>(
  data: T[],
  targetPoints: number,
  xAccessor: (d: T) => number,
  yAccessor: (d: T) => number
): T[] {
  const length = data.length
  if (targetPoints >= length || targetPoints <= 0) {
    return data
  }

  const sampled: T[] = []
  let sampledIndex = 0

  // Always include the first point
  sampled[sampledIndex++] = data[0]!

  // Bucket size. Leave room for the start and end points
  const bucketSize = (length - 2) / (targetPoints - 2)

  let a = 0 // Point A (the last sampled point)
  let nextA = 0

  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate point average for next bucket (middle bucket)
    let avgX = 0
    let avgY = 0
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1
    avgRangeEnd = avgRangeEnd < length ? avgRangeEnd : length

    const avgRangeLength = avgRangeEnd - avgRangeStart

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += xAccessor(data[avgRangeStart]!)
      avgY += yAccessor(data[avgRangeStart]!)
    }
    avgX /= avgRangeLength
    avgY /= avgRangeLength

    // Get the range for this bucket
    let rangeOffs = Math.floor(i * bucketSize) + 1
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1

    // Point A
    const pointAX = xAccessor(data[a]!)
    const pointAY = yAccessor(data[a]!)

    let maxArea = -1
    let area = -1

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // Calculate triangle area over three buckets
      area =
        Math.abs(
          (pointAX - avgX) * (yAccessor(data[rangeOffs]!) - pointAY) -
            (pointAX - xAccessor(data[rangeOffs]!)) * (avgY - pointAY)
        ) * 0.5

      if (area > maxArea) {
        maxArea = area
        nextA = rangeOffs
      }
    }

    sampled[sampledIndex++] = data[nextA]!
    a = nextA // This becomes the next A for the next iteration
  }

  // Always include the last point
  sampled[sampledIndex++] = data[length - 1]!

  return sampled
}
