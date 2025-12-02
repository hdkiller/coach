import { logger, task } from "@trigger.dev/sdk/v3";
import {
  fetchIntervalsWorkouts,
  fetchIntervalsWellness,
  fetchIntervalsPlannedWorkouts,
  normalizeIntervalsWorkout,
  normalizeIntervalsWellness,
  normalizeIntervalsPlannedWorkout
} from "../server/utils/intervals";
import { prisma } from "../server/utils/db";

export const ingestIntervalsTask = task({
  id: "ingest-intervals",
  run: async (payload: {
    userId: string;
    startDate: string;
    endDate: string;
  }) => {
    const { userId, startDate, endDate } = payload;
    
    logger.log("Starting Intervals.icu ingestion", { userId, startDate, endDate });
    
    // Fetch integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'intervals'
        }
      }
    });
    
    if (!integration) {
      throw new Error('Intervals integration not found for user');
    }
    
    // Update sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    });
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Fetch activities
      logger.log("Fetching activities...");
      const activities = await fetchIntervalsWorkouts(integration, start, end);
      logger.log(`Fetched ${activities.length} activities from Intervals.icu`);
      
      // Fetch wellness data
      logger.log("Fetching wellness data...");
      const wellnessData = await fetchIntervalsWellness(integration, start, end);
      logger.log(`Fetched ${wellnessData.length} wellness entries from Intervals.icu`);
      
      // Fetch planned workouts (import all categories)
      logger.log("Fetching planned workouts...");
      const plannedWorkouts = await fetchIntervalsPlannedWorkouts(integration, start, end);
      logger.log(`Fetched ${plannedWorkouts.length} events from Intervals.icu`);
      
      // Upsert workouts
      let workoutsUpserted = 0;
      for (const activity of activities) {
        const workout = normalizeIntervalsWorkout(activity, userId);
        
        await prisma.workout.upsert({
          where: {
            userId_source_externalId: {
              userId,
              source: 'intervals',
              externalId: workout.externalId
            }
          },
          update: workout,
          create: workout
        });
        workoutsUpserted++;
      }
      
      logger.log(`Upserted ${workoutsUpserted} workouts`);
      
      // Upsert wellness data
      let wellnessUpserted = 0;
      for (const wellness of wellnessData) {
        const wellnessDate = new Date(wellness.id); // wellness.id is the date string
        const normalizedWellness = normalizeIntervalsWellness(wellness, userId, wellnessDate);
        
        await prisma.wellness.upsert({
          where: {
            userId_date: {
              userId,
              date: wellnessDate
            }
          },
          update: normalizedWellness,
          create: normalizedWellness
        });
        wellnessUpserted++;
      }
      
      logger.log(`Upserted ${wellnessUpserted} wellness entries`);
      
      // Upsert planned workouts
      let plannedWorkoutsUpserted = 0;
      for (const planned of plannedWorkouts) {
        const normalizedPlanned = normalizeIntervalsPlannedWorkout(planned, userId);
        
        await prisma.plannedWorkout.upsert({
          where: {
            userId_externalId: {
              userId,
              externalId: normalizedPlanned.externalId
            }
          },
          update: normalizedPlanned,
          create: normalizedPlanned
        });
        plannedWorkoutsUpserted++;
      }
      
      logger.log(`Upserted ${plannedWorkoutsUpserted} planned workouts`);
      
      // Update sync status
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          errorMessage: null
        }
      });
      
      return {
        success: true,
        workouts: workoutsUpserted,
        wellness: wellnessUpserted,
        plannedWorkouts: plannedWorkoutsUpserted,
        userId,
        startDate,
        endDate
      };
    } catch (error) {
      logger.error("Error ingesting Intervals data", { error });
      
      // Update error status
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }
});