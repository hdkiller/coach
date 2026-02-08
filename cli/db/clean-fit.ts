import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'

const cleanOrphanedFitCommand = new Command('clean-fit')

cleanOrphanedFitCommand
    .description('Identify and delete orphaned FitFile records (no associated workout)')
    .option('--prod', 'Use production database')
    .option('--dry-run', 'List orphaned files without deleting them')
    .action(async (options) => {
        const isProd = options.prod

        const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

        if (isProd) {
            if (!connectionString) {
                console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
                process.exit(1)
            }
            process.env.DATABASE_URL = connectionString
            console.log(chalk.yellow('Using PRODUCTION database.'))
        } else {
            console.log(chalk.blue('Using DEVELOPMENT database.'))
        }

        // Import prisma AFTER setting environment variable
        const { prisma } = await import('../../server/utils/db')

        try {
            console.log(chalk.gray('Searching for orphaned FitFiles...'))

            const orphaned = await prisma.fitFile.findMany({
                where: {
                    workoutId: null
                },
                include: {
                    user: {
                        select: { email: true }
                    }
                }
            })

            if (orphaned.length === 0) {
                console.log(chalk.green('No orphaned FitFiles found.'))
                return
            }

            console.log(chalk.yellow(`Found ${orphaned.length} orphaned FitFile records.`))

            for (const file of orphaned) {
                console.log(`- ${chalk.cyan(file.filename)} (User: ${file.user.email}, ID: ${chalk.gray(file.id)})`)
            }

            if (options.dryRun) {
                console.log(chalk.blue('\nDRY RUN: No records were deleted.'))
                return
            }

            console.log(chalk.gray('\nDeleting orphaned records...'))

            const result = await prisma.fitFile.deleteMany({
                where: {
                    workoutId: null
                }
            })

            console.log(chalk.green(`\n✅ Successfully deleted ${result.count} orphaned FitFile records.`))
        } catch (err: any) {
            console.error(chalk.red('Error:'), err.message)
        } finally {
            await prisma.$disconnect()
        }
    })

export default cleanOrphanedFitCommand
