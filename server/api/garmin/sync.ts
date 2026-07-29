import { GarminConnect } from '@flow-js/garmin-connect'

export default defineEventHandler(async (event) => {
  const username = process.env.GARMIN_USERNAME
  const password = process.env.GARMIN_PASSWORD

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'GARMIN_USERNAME or GARMIN_PASSWORD environment variables are missing.'
    })
  }

  try {
    const gcClient = new GarminConnect({ username, password })
    await gcClient.login()

    // Fetch the latest 10 activities
    const activities = await gcClient.getActivities(0, 10)

    return {
      success: true,
      activities
    }
  } catch (error: any) {
    console.error('Garmin Sync Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to sync with Garmin: ${error.message}`
    })
  }
})
