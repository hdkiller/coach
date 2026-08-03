import pg from 'pg'
const { Client } = pg

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  await client.connect()

  try {
    await client.query(`ALTER TABLE "User" ADD COLUMN "intervalsApiKey" TEXT;`)
    console.log('Added intervalsApiKey')
  } catch (e) {
    console.log('intervalsApiKey error:', e.message)
  }

  try {
    await client.query(`ALTER TABLE "User" ADD COLUMN "intervalsAthleteId" TEXT;`)
    console.log('Added intervalsAthleteId')
  } catch (e) {
    console.log('intervalsAthleteId error:', e.message)
  }

  await client.end()
}

main().catch(console.error)
