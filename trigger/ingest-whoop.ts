import { logger, task } from "@trigger.dev/sdk/v3";
import { fetchWhoopRecovery, fetchWhoopSleep, normalizeWhoopRecovery } from "../server/utils/whoop";
import { prisma } from "../server/utils/db";

export const ingestWhoopTask = task({
  id: "ingest-whoop",
  run: async (payload: { 
    userId: string; 
    startDate: string; 
    endDate: string;
  }) => {
    const { userId, startDate, endDate } = payload;
    
    logger.log("Starting Whoop ingestion", { userId, startDate, endDate });
    
    // Fetch integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'whoop'
        }
      }
    });
    
    if (!integration) {
      throw new Error('Whoop integration not found for user');
    }
    
    // Update sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    });
    
    try {
      // Fetch recovery data
      const recoveryData = await fetchWhoopRecovery(
        integration,
        new Date(startDate),
        new Date(endDate)
      );
      
      logger.log(`Fetched ${recoveryData.length} recovery records from Whoop`);
      
      // Upsert wellness data
      let upsertedCount = 0;
      for (const recovery of recoveryData) {
        // Fetch corresponding sleep data if available
        let sleepData = null;
        if (recovery.sleep_id) {
          logger.log(`Fetching sleep data for sleep_id: ${recovery.sleep_id}`);
          sleepData = await fetchWhoopSleep(integration, recovery.sleep_id);
        }
        
        const wellness = normalizeWhoopRecovery(recovery, userId, sleepData);
        
        // Skip if recovery wasn't scored yet
        if (!wellness) {
          continue;
        }
        
        await prisma.wellness.upsert({
          where: {
            userId_date: {
              userId,
              date: wellness.date
            }
          },
          update: wellness,
          create: wellness
        });
        upsertedCount++;
      }
      
      logger.log(`Upserted ${upsertedCount} wellness entries from WHOOP`);
      
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
      logger.error("Error ingesting Whoop data", { error });
      
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