import { prisma } from '../server/utils/db'

async function backfillSummaryPolylines() {
  console.log('Starting backfill of summary polylines for Strava workouts...')

  const workouts = await prisma.workout.findMany({
    where: {
      source: 'strava',
      summaryPolyline: null,
      rawJson: {
        not: null
      }
    },
    select: {
      id: true,
      rawJson: true
    }
  })

  console.log(`Found ${workouts.length} workouts to process.`)

  let updatedCount = 0
  for (const workout of workouts) {
    const rawJson = workout.rawJson as any
    const summaryPolyline = rawJson?.map?.summary_polyline

    if (summaryPolyline) {
      await prisma.workout.update({
        where: { id: workout.id },
        data: { summaryPolyline }
      })
      updatedCount++
    }
  }

  console.log(`Finished. Updated ${updatedCount} workouts.`)
}

backfillSummaryPolylines()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
