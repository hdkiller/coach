import { Command } from 'commander'
import { prisma } from '../../server/utils/db'

const recalculateCommand = new Command('recalculate')
    .description('Recalculate nutrition totals based on item sums')
    .option('-d, --date <date>', 'Date to check (YYYY-MM-DD)')
    .option('-u, --user <email>', 'User email to check')
    .option('--apply', 'Apply changes to database')
    .action(async (options) => {
        try {
            const where: any = {}

            if (options.date) {
                // Match exact date (midnight UTC)
                where.date = new Date(options.date + 'T00:00:00Z')
            }

            if (options.user) {
                const user = await prisma.user.findFirst({
                    where: { email: { contains: options.user, mode: 'insensitive' } }
                })
                if (!user) {
                    console.error('User not found')
                    process.exit(1)
                }
                where.userId = user.id
            }

            console.log('Checking records with criteria:', JSON.stringify(where, null, 2))

            const records = await prisma.nutrition.findMany({
                where,
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            email: true
                        }
                    }
                }
            })

            console.log(`Found ${records.length} records. Analyzing discrepancies...`)

            let discrepancies = 0
            for (const r of records) {
                const meals = ['breakfast', 'lunch', 'dinner', 'snacks']
                let calcCalories = 0
                let calcProtein = 0
                let calcCarbs = 0
                let calcFat = 0

                meals.forEach((m) => {
                    const items = (r[m as keyof typeof r] as any[]) || []
                    items.forEach((i: any) => {
                        calcCalories += i.calories || 0
                        calcProtein += i.protein || 0
                        calcCarbs += i.carbs || 0
                        calcFat += i.fat || 0
                    })
                })

                // Round calculated values for comparison
                calcCalories = Math.round(calcCalories)
                // Keep macros as float but maybe fixed precision? Let's just compare roughly.

                const diffCalories = (r.calories || 0) - calcCalories

                // Tolerance of 1 calorie for rounding differences
                if (Math.abs(diffCalories) > 1) {
                    discrepancies++
                    console.log(`\n[${r.date.toISOString().split('T')[0]}] ${r.user.email}`)
                    console.log(`  Stored Calories: ${r.calories}`)
                    console.log(`  Calc.  Calories: ${calcCalories}`)
                    console.log(`  Difference:      ${diffCalories}`)

                    if (options.apply) {
                        console.log('  -> Fixing...')
                        await prisma.nutrition.update({
                            where: { id: r.id },
                            data: {
                                calories: calcCalories,
                                protein: calcProtein,
                                carbs: calcCarbs,
                                fat: calcFat
                            }
                        })
                        console.log('  -> Fixed.')
                    }
                }
            }

            console.log(`\nAnalysis complete. Found ${discrepancies} discrepancies out of ${records.length} records.`)
            if (!options.apply && discrepancies > 0) {
                console.log('Run with --apply to fix these records.')
            }

        } catch (e) {
            console.error(e)
            process.exit(1)
        } finally {
            await prisma.$disconnect()
        }
    })

export default recalculateCommand
