import { logger, task } from "@trigger.dev/sdk/v3";
import { PrismaClient } from "@prisma/client";
import { fetchWhoopRecovery, normalizeWhoopRecovery } from "../server/utils/whoop";

const prisma = new PrismaClient();

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
      
      // Upsert metrics
      let upsertedCount = 0;
      for (const recovery of recoveryData) {
        const metric = normalizeWhoopRecovery(recovery, userId);
        
        await prisma.dailyMetric.upsert({
          where: {
            userId_date: {
              userId,
              date: metric.date
            }
          },
          update: metric,
          create: metric
        });
        upsertedCount++;
      }
      
      logger.log(`Upserted ${upsertedCount} daily metrics`);
      
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