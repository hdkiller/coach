import { config } from 'dotenv'

// Load environment variables before importing anything else
config()

async function debugActivity() {
  console.log('Environment variables loaded.')
  
  // Dynamically import modules to ensure env vars are available when they initialize
  const { prisma } = await import('../server/utils/db')
  const { fetchStravaActivityDetails, fetchStravaActivityStreams, normalizeStravaActivity } = await import('../server/utils/strava')

  const EXTERNAL_ID = '16669578007'
  const USER_ID = '6cbccf6c-e5a3-4df2-8305-2584e317f1ea'

  console.log(`Starting debug for Strava activity: ${EXTERNAL_ID}`)

  // 1. Check existing workout in DB
?  const workout = await prisma.workout.findFirst({
    where: {
      externalId: EXTERNAL_ID,
      source: 'strava'
    },
    include: {
      streams: true
    }
  })

  if (!workout) {
    console.error('Workout not found in database!')
  } else {
    console.log('Found workout in DB:')
    console.log(`- ID: ${workout.id}`)
    console.log(`- Type: ${workout.type}`)
    console.log(`- Has Streams: ${workout.streams ? 'Yes' : 'No'}`)
    console.log(`- Avg HR in DB: ${workout.averageHr}`)
  }

  // 2. Get Integration
  const integration = await prisma.integration.findUnique({
    where: {
      userId_provider: {
        userId: USER_ID,
        provider: 'strava'
      }
    }
  })

  if (!integration) {
    console.error('Strava integration not found!')
    return
  }

  console.log('Found integration, fetching fresh data from Strava API...')

  try {
    // 3. Fetch Activity Details from Strava
    const activityId = parseInt(EXTERNAL_ID)
    const details = await fetchStravaActivityDetails(integration, activityId)
    
    console.log('\n--- Strava API Activity Details ---')
    console.log(`- Name: ${details.name}`)
    console.log(`- Type: ${details.type}`)
    console.log(`- Sport Type: ${details.sport_type}`)
    console.log(`- Has Heartrate: ${details.has_heartrate}`)
    console.log(`- Average Heartrate: ${details.average_heartrate}`)
    console.log(`- Max Heartrate: ${details.max_heartrate}`)
    
    // Check normalization logic
    const normalized = normalizeStravaActivity(details, USER_ID)
    console.log('\n--- Normalized Data Preview ---')
    console.log(`- Type: ${normalized.type}`)
    console.log(`- Avg HR: ${normalized.averageHr}`)

    // 4. Fetch Streams from Strava
    console.log('\n--- Fetching Streams ---')
    const streams = await fetchStravaActivityStreams(integration, activityId, [
      'heartrate', 'time', 'distance', 'velocity_smooth', 'watts', 'cadence', 'temp'
    ])
    
    console.log('Stream Keys Found:', Object.keys(streams))
    
    if (streams.heartrate) {
      console.log(`- Heartrate Stream: ${streams.heartrate.data.length} points`)
    } else {
      console.log('- No Heartrate Stream found')
    }

  } catch (error) {
    console.error('Error fetching from Strava:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugActivity()