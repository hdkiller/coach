import { Command } from 'commander';
import chalk from 'chalk';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { countries } from '../../app/utils/countries';

const backfillProfileCommand = new Command('profile');

backfillProfileCommand
  .description('Backfill/Fix user profile data (e.g. normalize country codes)')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Simulate changes without saving', false)
  .action(async (options) => {
    const isProd = options.prod;
    const isDryRun = options.dryRun;
    
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;

    if (isProd) {
        console.log(chalk.yellow('⚠️  Using PRODUCTION database.'));
    } else {
        console.log(chalk.blue('Using DEVELOPMENT database.'));
    }

    if (isDryRun) {
        console.log(chalk.cyan('🔍 DRY RUN: No changes will be applied.'));
    }

    if (!connectionString) {
        console.error(chalk.red('Database connection string is not defined.'));
        process.exit(1);
    }

    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        console.log(chalk.gray('Fetching users with country set...'));
        
        const users = await prisma.user.findMany({
            where: {
                country: { not: null }
            },
            select: {
                id: true,
                email: true,
                name: true,
                country: true
            }
        });

        console.log(chalk.white(`Found ${users.length} users with country set.`));
        
        let updatesCount = 0;

        for (const user of users) {
            if (!user.country) continue;

            // Check if it's already a valid code (case-insensitive check for code, but exact match preferred)
            const exactCodeMatch = countries.find(c => c.code === user.country);
            if (exactCodeMatch) {
                // Already valid
                continue;
            }

            // Try to find by name (case insensitive)
            const nameMatch = countries.find(c => c.name.toLowerCase() === user.country!.toLowerCase());
            
            if (nameMatch) {
                console.log(`User ${chalk.magenta(user.email)}: Converting "${chalk.yellow(user.country)}" -> "${chalk.green(nameMatch.code)}" (${nameMatch.name})`);
                
                if (!isDryRun) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { country: nameMatch.code }
                    });
                }
                updatesCount++;
            } else {
                // Try to find by code case-insensitive (e.g. "hu" -> "HU")
                const codeMatch = countries.find(c => c.code.toLowerCase() === user.country!.toLowerCase());
                if (codeMatch) {
                     console.log(`User ${chalk.magenta(user.email)}: Normalizing case "${chalk.yellow(user.country)}" -> "${chalk.green(codeMatch.code)}"`);
                     if (!isDryRun) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { country: codeMatch.code }
                        });
                    }
                    updatesCount++;
                } else {
                    console.warn(`User ${chalk.magenta(user.email)}: Unknown country "${chalk.red(user.country)}". Could not map to code.`);
                }
            }
        }

        if (updatesCount === 0) {
            console.log(chalk.green('✅ No profiles needed updating.'));
        } else {
            console.log(chalk.green(`✅ Successfully updated ${updatesCount} user profiles.`));
        }

    } catch (e) {
        console.error(chalk.red('Error backfilling profiles:'), e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
  });

export default backfillProfileCommand;
