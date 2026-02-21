import 'dotenv/config'
import pg from 'pg'
import chalk from 'chalk'

async function main() {
  const connectionString = process.env.DATABASE_URL_PROD
  if (!connectionString) {
    console.error('DATABASE_URL_PROD is not defined')
    process.exit(1)
  }

  console.log(chalk.blue('Inspecting DailyCheckin columns in PRODUCTION...'))
  const pool = new pg.Pool({ connectionString })

  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'DailyCheckin'
      ORDER BY column_name;
    `)

    console.log(chalk.green('Columns in production:'))
    result.rows.forEach((col) => {
      console.log(`- ${col.column_name} (${col.data_type})`)
    })

    if (result.rows.length === 0) {
      console.log(chalk.red('Table DailyCheckin NOT FOUND in production!'))
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error)
  } finally {
    await pool.end()
  }
}

main()
