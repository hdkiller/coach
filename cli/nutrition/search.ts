import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

const searchCommand = new Command('search')
    .description('Search for nutrition records based on criteria')
    .option('-d, --date <date>', 'Date to search (YYYY-MM-DD)')
    .option('--min-calories <number>', 'Minimum calories', parseInt)
    .option('--max-calories <number>', 'Maximum calories', parseInt)
    .option('-u, --user <email>', 'Filter by user email')
    .option('--limit <number>', 'Limit results', parseInt)
    .option('--prod', 'Use production database')
    .action(async (options) => {
        const isProd = options.prod
        const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

        if (isProd) {
            console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
        } else {
            console.log(chalk.blue('Using DEVELOPMENT database.'))
        }

        if (!connectionString) {
            console.error(chalk.red('Error: Database connection string is not defined.'))
            process.exit(1)
        }

        const pool = new pg.Pool({ connectionString })
        const adapter = new PrismaPg(pool)
        const prisma = new PrismaClient({ adapter })

        try {
            const where: any = {}

            if (options.date) {
                const date = new Date(options.date)
                if (isNaN(date.getTime())) {
                    console.error(chalk.red('Invalid date format'))
                    process.exit(1)
                }
                where.date = new Date(options.date + 'T00:00:00Z')
            }

            if (options.minCalories !== undefined || options.maxCalories !== undefined) {
                where.calories = {}
                if (options.minCalories !== undefined) where.calories.gte = options.minCalories
                if (options.maxCalories !== undefined) where.calories.lte = options.maxCalories
            }

            if (options.user) {
                const user = await prisma.user.findFirst({
                    where: { email: { contains: options.user, mode: 'insensitive' } }
                })
                if (!user) {
                    console.error(chalk.red('User not found'))
                    process.exit(1)
                }
                where.userId = user.id
            }

            console.log('Searching with criteria:', JSON.stringify(where, null, 2))

            const records = await prisma.nutrition.findMany({
                where,
                take: options.limit || 20,
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            email: true,
                            name: true,
                            timezone: true
                        }
                    }
                }
            })

            console.log(`Found ${records.length} records.`)

            if (records.length === 0) return

            console.table(
                records.map((r) => {
                    // Calculate sum of items
                    const meals = ['breakfast', 'lunch', 'dinner', 'snacks']
                    let itemSum = 0
                    meals.forEach((m) => {
                        const items = (r[m as keyof typeof r] as any[]) || []
                        items.forEach((i: any) => (itemSum += i.calories || 0))
                    })

                    return {
                        Date: r.date.toISOString().split('T')[0],
                        User: r.user.email,
                        'Total (DB)': r.calories,
                        'Item Sum': Math.round(itemSum),
                        Diff: (r.calories || 0) - Math.round(itemSum),
                        ID: r.id
                    }
                })
            )
        } catch (e) {
            console.error(chalk.red('Error:'), e)
            process.exit(1)
        } finally {
            await prisma.$disconnect()
            await pool.end()
        }
    })

export default searchCommand
