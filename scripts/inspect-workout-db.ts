import 'dotenv/config'
import { prisma } from '../server/utils/db';

async function main() {
  const workoutId = process.argv[2];
  if (!workoutId) {
    console.error('Please provide a workout ID');
    process.exit(1);
  }

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      streams: true
    }
  });

  if (!workout) {
    console.error('Workout not found');
    process.exit(1);
  }

  console.log('Workout Details:');
  console.log('----------------');
  console.log(`ID: ${workout.id}`);
  console.log(`Date: ${workout.date}`);
  console.log(`Title: ${workout.title}`);
  console.log(`Duration: ${workout.durationSec}s`);
  console.log(`Distance: ${workout.distanceMeters}m`);
  console.log(`Avg Power: ${workout.averageWatts}W`);
  console.log(`Avg HR: ${workout.averageHr}bpm`);
  console.log(`Calories: ${workout.calories}`);
  
  console.log('\nDerived Metrics:');
  console.log(`TSS: ${workout.tss}`);
  console.log(`Normalized Power: ${workout.normalizedPower}W`);
  console.log(`Intensity Factor: ${workout.intensity}`);
  console.log(`Kilojoules: ${workout.kilojoules}`);
  
  console.log('\nStreams:');
  if (workout.streams) {
    const streamKeys = ['time', 'distance', 'velocity', 'heartrate', 'cadence', 'watts', 'altitude', 'latlng', 'grade', 'moving'];
    streamKeys.forEach(key => {
      const data = (workout.streams as any)[key];
      if (Array.isArray(data) && data.length > 0) {
        console.log(`${key}: ${data.length} data points`);
      } else {
        console.log(`${key}: 0 data points`);
      }
    });
  } else {
    console.log('No streams found');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
