import { logger, task } from "@trigger.dev/sdk/v3";
import {
  fetchStravaActivities,
  fetchStravaActivityDetails,
  normalizeStravaActivity
} from "../server/utils/strava";
import { prisma } from "../server/utils/db";

export const ingestStravaTask = task({
  id: "ingest-strava",
  run: async (payload: {
    userId: string;
    startDate: string;
    endDate: string;
  }) => {
    const { userId, startDate, endDate } = payload;
    
    logger.log("Starting Strava ingestion", { userId, startDate, endDate });
    
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'strava'
        }
      }
    });
    
    if (!integration) {
      throw new Error('Strava integration not found for user');
    }
    
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    });
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      logger.log("Fetching activities from Strava...");
      const activities = await fetchStravaActivities(integration, start, end);
      logger.log(`Fetched ${activities.length} activity summaries from Strava`);
      
      // Re-fetch integration to get any updated tokens from the activities fetch
      const updatedIntegration = await prisma.integration.findUnique({
        where: { id: integration.id }
      });
      
      if (!updatedIntegration) {
        throw new Error('Integration not found after activities fetch');
      }
      
      let workoutsUpserted = 0;
      let workoutsSkipped = 0;
      let detailsFetched = 0;
      
      for (const activity of activities) {
        // Check if this activity already exists from Intervals.icu
        // Match by date (within 5 minutes), type, and duration (within 30 seconds)
        const activityDate = new Date(activity.start_date_local);
        const fiveMinutesBefore = new Date(activityDate.getTime() - 5 * 60 * 1000);
        const fiveMinutesAfter = new Date(activityDate.getTime() + 5 * 60 * 1000);
        
        const existingFromIntervals = await prisma.workout.findFirst({
          where: {
            userId,
            source: 'intervals',
            date: {
              gte: fiveMinutesBefore,
              lte: fiveMinutesAfter
            },
            durationSec: {
              gte: activity.moving_time - 30,
              lte: activity.moving_time + 30
            }
          }
        });
        
        if (existingFromIntervals) {
          logger.log(`Skipping Strava activity ${activity.id} - already exists from Intervals.icu (workout ${existingFromIntervals.id})`);
          workoutsSkipped++;
          continue;
        }
        
        // Check if this exact Strava activity already exists and is up-to-date
        const existingStrava = await prisma.workout.findUnique({
          where: {
            userId_source_externalId: {
              userId,
              source: 'strava',
              externalId: String(activity.id)
            }
          }
        });
        
        // If activity exists and hasn't been updated on Strava, skip detail fetch
        const stravaUpdatedAt = new Date(activity.updated_at || activity.start_date);
        if (existingStrava && existingStrava.updatedAt && existingStrava.updatedAt >= stravaUpdatedAt) {
          logger.log(`Skipping Strava activity ${activity.id} - already up-to-date in database`);
          workoutsSkipped++;
          continue;
        }
        
        // Only fetch detailed activity data for new or updated activities
        logger.log(`Fetching details for activity ${activity.id}...`);
        const detailedActivity = await fetchStravaActivityDetails(updatedIntegration, activity.id);
        detailsFetched++;
        
        const workout = normalizeStravaActivity(detailedActivity, userId);
        
        await prisma.workout.upsert({
          where: {
            userId_source_externalId: {
              userId,
              source: 'strava',
              externalId: workout.externalId
            }
          },
          update: workout,
          create: workout
        });
        workoutsUpserted++;
        
        // Add a small delay to avoid rate limiting (Strava allows 100 requests per 15 minutes)
        // With 7-day sync window, we expect ~7-14 activities max, well under rate limits
        if (detailsFetched % 5 === 0) {
          logger.log(`Processed ${workoutsUpserted}/${activities.length} activities (${detailsFetched} detail fetches), pausing briefly...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      logger.log(`Strava sync complete: ${workoutsUpserted} upserted, ${workoutsSkipped} skipped, ${detailsFetched} detail API calls made`);
      
      logger.log(`Upserted ${workoutsUpserted} workouts from Strava`);
      
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
        skipped: workoutsSkipped,
        detailsFetched: detailsFetched,
        total: activities.length,
        userId,
        startDate,
        endDate
      };
    } catch (error) {
      logger.error("Error ingesting Strava data", { error });
      
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