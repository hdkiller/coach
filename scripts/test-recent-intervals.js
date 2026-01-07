// Script to test recent Intervals.icu activities
import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

async function main() {
  console.log('Fetching user and integration...\n')

  // Get user and integration
  const userResult = await pool.query('SELECT * FROM "User" LIMIT 1')
  const user = userResult.rows[0]

  if (!user) {
    console.log('No user found')
    return
  }

  console.log(`User: ${user.email} (${user.id})`)

  const integrationResult = await pool.query(
    'SELECT * FROM "Integration" WHERE "userId" = $1 AND provider = $2',
    [user.id, 'intervals']
  )

  const integration = integrationResult.rows[0]

  if (!integration) {
    console.log('No intervals integration found')
    return
  }

  console.log(`Integration Status: ${integration.syncStatus}`)
  console.log(`Last Sync: ${integration.lastSyncAt}`)
  console.log(`External User ID: ${integration.externalUserId}\n`)

  // Fetch recent activities from Intervals.icu
  const athleteId = integration.externalUserId || 'i0'
  const auth = Buffer.from(`API_KEY:${integration.accessToken}`).toString('base64')

  // Get last 7 days
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const oldest = sevenDaysAgo.toISOString().split('T')[0]
  const newest = today.toISOString().split('T')[0]

  console.log(`Fetching activities from ${oldest} to ${newest}...`)

  const url = `https://intervals.icu/api/v1/athlete/${athleteId}/activities?oldest=${oldest}&newest=${newest}`

  console.log(`API URL: ${url}\n`)

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`
    }
  })

  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`)
    const text = await response.text()
    console.error(text)
    return
  }

  const activities = await response.json()

  console.log(`\nFound ${activities.length} activities in Intervals.icu:\n`)
  console.log('='.repeat(100))

  activities.forEach((activity, idx) => {
    console.log(`\n${idx + 1}. ${activity.name}`)
    console.log(`   ID: ${activity.id}`)
    console.log(`   Type: ${activity.type}`)
    console.log(`   Date: ${activity.start_date_local}`)
    console.log(
      `   Duration: ${activity.moving_time ? Math.round(activity.moving_time / 60) : 'N/A'} min`
    )
    console.log(
      `   Distance: ${activity.distance ? (activity.distance / 1000).toFixed(2) : 'N/A'} km`
    )
  })

  console.log('\n' + '='.repeat(100))

  // Check what's in the database
  const workoutResult = await pool.query(
    `SELECT * FROM "Workout" WHERE "userId" = $1 AND date >= $2 ORDER BY date DESC`,
    [user.id, sevenDaysAgo]
  )

  console.log(`\n\nFound ${workoutResult.rows.length} workouts in database:\n`)
  console.log('='.repeat(100))

  workoutResult.rows.forEach((workout, idx) => {
    console.log(`\n${idx + 1}. ${workout.title}`)
    console.log(`   ID: ${workout.id}`)
    console.log(`   External ID: ${workout.externalId}`)
    console.log(`   Type: ${workout.type}`)
    console.log(`   Date: ${workout.date}`)
    console.log(`   Source: ${workout.source}`)
    console.log(
      `   Duration: ${workout.durationSec ? Math.round(workout.durationSec / 60) : 'N/A'} min`
    )
  })

  console.log('\n' + '='.repeat(100))

  // Check for missing activities
  // const activityIds = activities.map(a => a.id)
  // console.log(`Found ${activityIds.length} activities`)
  const workoutExternalIds = new Set(workoutResult.rows.map((w) => w.externalId))

  const missingInDb = activities.filter((a) => !workoutExternalIds.has(a.id))

  if (missingInDb.length > 0) {
    console.log(`\n\n⚠️  MISSING IN DATABASE (${missingInDb.length} activities):\n`)
    missingInDb.forEach((activity) => {
      console.log(`   - ${activity.name} (${activity.type}) - ${activity.start_date_local}`)
      console.log(`     ID: ${activity.id}`)
    })
  } else {
    console.log('\n\n✅ All Intervals.icu activities are in the database')
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end())
