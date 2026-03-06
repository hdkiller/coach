import 'dotenv/config'
import { prisma } from '../server/utils/db'
import { backfillWorkoutTags } from '../server/utils/backfill-workout-tags'

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
  const result = await backfillWorkoutTags(prisma, {
    limit,
    dryRun,
    cursor
  })

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
