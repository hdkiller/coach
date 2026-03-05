import 'dotenv/config'
import { prisma } from '../server/utils/db'
import { mergeWorkoutTags } from '../server/utils/workout-tags'

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.split('=')
    return [key.replace(/^--/, ''), value ?? 'true']
  })
)

const limit = Number(args.get('limit') || 500)
const dryRun = args.get('dry-run') === 'true'
const cursor = args.get('cursor') || null

async function main() {
  let processed = 0
  let updated = 0
  let nextCursor = cursor

  while (true) {
    const workouts = await prisma.workout.findMany({
      where: {
        source: 'intervals',
        ...(nextCursor ? { id: { gt: nextCursor } } : {})
      },
      orderBy: { id: 'asc' },
      take: limit,
      select: {
        id: true,
        title: true,
        tags: true,
        rawJson: true
      }
    })

    if (workouts.length === 0) break

    for (const workout of workouts) {
      processed++
      nextCursor = workout.id

      const raw = workout.rawJson as Record<string, unknown> | null
      const rawTags = Array.isArray(raw?.tags) ? raw.tags : undefined
      const nextTags = mergeWorkoutTags(workout.tags as string[], {
        incomingIntervalsTags: rawTags
      })

      const currentTags = Array.isArray(workout.tags) ? [...workout.tags].sort() : []
      if (JSON.stringify(currentTags) === JSON.stringify(nextTags)) continue

      updated++
      if (!dryRun) {
        await prisma.workout.update({
          where: { id: workout.id },
          data: { tags: nextTags }
        })
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        processed,
        updated,
        nextCursor
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
