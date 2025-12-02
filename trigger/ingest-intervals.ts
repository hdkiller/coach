import { logger, task } from "@trigger.dev/sdk/v3";
import { PrismaClient } from "@prisma/client";
import { fetchIntervalsWorkouts, normalizeIntervalsWorkout } from "../server/utils/intervals";

const prisma = new PrismaClient();

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
      // Fetch activities
      const activities = await fetchIntervalsWorkouts(
        integration,
        new Date(startDate),
        new Date(endDate)
      );
      
      logger.log(`Fetched ${activities.length} activities from Intervals.icu`);
      
      // Upsert workouts
      let upsertedCount = 0;
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
        upsertedCount++;
      }
      
      logger.log(`Upserted ${upsertedCount} workouts`);
      
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
        count: upsertedCount,
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