import 'dotenv/config'
import { prisma } from '../server/utils/db';
import { parseFitFile, normalizeFitSession, extractFitStreams } from '../server/utils/fit';
import { workoutRepository } from '../server/utils/repositories/workoutRepository';
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress';

async function main() {
  const workoutId = process.argv[2];
  if (!workoutId) {
    console.error('Please provide a workout ID');
    process.exit(1);
  }

  console.log(`Re-ingesting workout: ${workoutId}`);

  // Find the workout and associated fit file
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { fitFile: true }
  });

  if (!workout) {
    console.error('Workout not found');
    process.exit(1);
  }

  if (!workout.fitFile) {
    console.error('No FIT file associated with this workout');
    // Try to find fit file by looking for one that points to this workout
    const fitFile = await prisma.fitFile.findUnique({
      where: { workoutId: workout.id }
    });
    
    if (!fitFile) {
        console.error('Could not find fit file via reverse lookup either');
        process.exit(1);
    }
    workout.fitFile = fitFile;
  }

  console.log(`Found FIT file: ${workout.fitFile.filename}`);

  // Parse file content
  console.log('Parsing FIT file...');
  const fitData = await parseFitFile(Buffer.from(workout.fitFile.fileData));
  
  // Get main session
  const session = fitData.sessions[0];
  if (!session) {
    console.error('No session data found in FIT file');
    process.exit(1);
  }
  
  // Normalize to workout
  console.log('Normalizing session data...');
  const workoutData = normalizeFitSession(session, workout.userId, workout.fitFile.filename);
  
  // Extract streams
  console.log('Extracting streams...');
  const streams = extractFitStreams(fitData.records);
  
  // Calculate derived metrics from streams if not present in session
  if (!workoutData.normalizedPower && streams.watts && streams.watts.length > 0) {
    console.log('Normalized power missing from session, will be calculated from streams');
  }

  // Update workout
  console.log('Updating workout...');
  const updatedWorkout = await prisma.workout.update({
    where: { id: workoutId },
    data: {
      ...workoutData,
      // Preserve original ID and creation date
      id: undefined, 
      userId: undefined,
      externalId: undefined,
      createdAt: undefined,
      updatedAt: new Date()
    }
  });
  
  console.log(`Updated workout: ${updatedWorkout.id}`);
  
  // Save streams
  console.log('Updating streams...');
  await prisma.workoutStream.upsert({
    where: { workoutId: workout.id },
    create: {
      workoutId: workout.id,
      ...streams
    },
    update: {
      ...streams
    }
  });
  
  // Calculate stress metrics
  try {
    console.log('Calculating stress metrics...');
    await calculateWorkoutStress(workout.id, workout.userId);
    console.log(`Calculated workout stress for ${workout.id}`);
  } catch (error) {
    console.error(`Failed to calculate workout stress for ${workout.id}:`, error);
  }
  
  console.log('Re-ingestion complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
