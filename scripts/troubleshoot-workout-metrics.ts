import { detectSurgesAndFades } from '../server/utils/interval-detection'
import { calculateWPrimeBalance } from '../server/utils/performance-metrics'
import fs from 'fs'
import { prisma } from '../server/utils/db'

async function troubleshootWorkout(workoutId: string) {
  console.log(`Troubleshooting workout: ${workoutId}`)

  // 1. Fetch workout data
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      user: {
      }
    }
  })

  if (!workout) {
    console.error('Workout not found')
    return
  }

  console.log('Workout found:', {
    id: workout.id,
    title: workout.title,
    userId: workout.userId,
    // @ts-ignore
    date: workout.start_date_local || workout.date || 'Unknown'
  })

  // 2. Fetch streams
  // Assuming streams are stored in a separate table or file, or as a JSON field in the workout
  // Based on schema inspection or common patterns, let's look for stream data
  // If streams are not in DB, we might need to check how they are loaded (e.g. from Intervals.icu or Strava)
  
  // Checking for streams in database (if applicable, adjust based on actual schema)
  // Since I don't have the full schema handy for streams, I'll assume standard locations or try to fetch from where app gets it.
  // BUT, looking at file list, there is `server/utils/intervals.ts` and `server/utils/strava.ts`. 
  // Let's assume for this script we just want to see if we can calculate metrics GIVEN valid data.
  // We need to fetch the raw data that the frontend uses.
  
  // Actually, I'll fetch the workout and see if it has 'streams' or 'data' field.
  // If not, I'll look for how the app retrieves streams.
  
  // Let's rely on what `check-workout-stream-data.ts` might do, but simplified here.
  // I will check `data` or `streams` field on the workout object if it exists.
  
  // If the workout data is stored in a JSON column 'data' or similar:
  const workoutData = (workout as any).data || (workout as any).streams
  
  if (!workoutData) {
      console.log("No direct 'data' or 'streams' field on workout object. Checking DB schema...")
      // In a real scenario I'd check schema.prisma, but for now let's assume we can't find it easily without it.
      // However, the prompt says "power and cadence data in the timeline", implying it IS present in the system.
  }
  
  // Let's look at `server/api/reports/[id].get.ts` or similar to see how it fetches data for the frontend.
  // Wait, the user mentioned the workout page `workouts/[id]`. Let's assume there is an API endpoint for it.
  
  // Simplified: simpler approach is to check if we can calculate the metrics using the utils, 
  // assuming we can get the data. 
  
  // Let's check the User's FTP
  // @ts-ignore
  const userFtp = workout.user?.profile?.ftp || 250 // Default if missing
  console.log(`User FTP: ${userFtp}`)
  
  // We need the POWER and CADENCE streams.
  // I will try to read the streams from the filesystem if they are cached, or just inspect the workout object more closely.
  
  // Let's try to query the workout with all fields to find where data is hiding.
  // Or simpler: The user said "metrics seems empty". 
  
  // Let's try to re-calculate the metrics and print them out.
  // We need a way to get the streams.
  
  // For this specific script, since I don't know EXACTLY where streams are, I will:
  // 1. Inspect the workout object keys
  // 2. If streams are found, run the calculations
  
  const keys = Object.keys(workout)
  console.log('Workout object keys:', keys)
  
  // If there is a "streams" json field
  // @ts-ignore
  const streams = workout.streams
  
  if (streams) {
      console.log('Streams found in workout object.')
      const timeStream = streams.find((s: any) => s.type === 'time')?.data
      const powerStream = streams.find((s: any) => s.type === 'watts')?.data
      const cadenceStream = streams.find((s: any) => s.type === 'cadence')?.data
      
      console.log('Stream lengths:', {
          time: timeStream?.length,
          power: powerStream?.length,
          cadence: cadenceStream?.length
      })
      
      if (powerStream && timeStream) {
          // 1. Anaerobic Battery (W' Bal)
          console.log('--- Calculating W\' Bal ---')
          // W' is typically around 20kJ for cyclists, or user specific.
          // If not in profile, default to 20000 J.
          // @ts-ignore
          const wPrime = (workout.user?.profile as any)?.wPrime || 20000
          console.log(`Using W': ${wPrime}`)
          
          try {
             const wBalResult = calculateWPrimeBalance(powerStream, timeStream, userFtp, wPrime)
             console.log('W\' Bal Stats:', wBalResult ? 'Calculated' : 'Failed')
             if (wBalResult) {
                 console.log('Min W\' Bal:', wBalResult.minWPrimeBalance)
             }
          } catch (e) {
              console.error('Error calculating W\' Bal:', e)
          }

          // 2. Surges / Matches
          console.log('--- Calculating Surges ---')
          try {
             const surges = detectSurgesAndFades(timeStream, powerStream, userFtp)
             console.log(`Detected ${surges.length} surges`)
             console.log('Surges:', JSON.stringify(surges, null, 2))
          } catch (e) {
              console.error('Error calculating surges:', e)
          }
      } else {
          console.log('Missing Power or Time stream for advanced metrics.')
      }
      
      if (cadenceStream && powerStream) {
           console.log('--- Checking Cadence Profile Requirements ---')
           console.log('Power and Cadence streams present. Cadence profile should be possible.')
      }

  } else {
      console.log('No streams field found directly on workout.')
  }

}

troubleshootWorkout('77db85b6-4506-493c-b365-b094a4752132')
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
