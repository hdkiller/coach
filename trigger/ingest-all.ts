import { logger, task, batch } from "@trigger.dev/sdk/v3";
import { prisma } from "../server/utils/db";
import { ingestStravaTask } from "./ingest-strava";
import { ingestWhoopTask } from "./ingest-whoop";
import { ingestIntervalsTask } from "./ingest-intervals";
import { ingestYazioTask } from "./ingest-yazio";

export const ingestAllTask = task({
  id: "ingest-all",
  run: async (payload: {
    userId: string;
    startDate: string;
    endDate: string;
  }) => {
    const { userId, startDate, endDate } = payload;
    
    logger.log("=" .repeat(60));
    logger.log("🔄 BATCH INGESTION STARTING");
    logger.log("=" .repeat(60));
    logger.log(`User ID: ${userId}`);
    logger.log(`Date Range: ${startDate} to ${endDate}`);
    logger.log("");
    
    // Fetch all active integrations for the user
    const integrations = await prisma.integration.findMany({
      where: {
        userId
      }
    });
    
    if (integrations.length === 0) {
      logger.log("⚠️  No integrations found for user");
      return {
        success: true,
        message: "No integrations to sync",
        results: []
      };
    }
    
    logger.log(`Found ${integrations.length} integration(s):`);
    integrations.forEach(integration => {
      logger.log(`  • ${integration.provider} (last sync: ${integration.lastSyncAt ? integration.lastSyncAt.toISOString() : 'never'})`);
    });
    logger.log("");
    
    // Build task triggers based on available integrations
    const tasksTrigger = [];
    
    for (const integration of integrations) {
      const taskPayload = { userId, startDate, endDate };
      
      switch (integration.provider) {
        case 'strava':
          tasksTrigger.push({
            task: ingestStravaTask,
            payload: taskPayload
          });
          break;
        case 'whoop':
          tasksTrigger.push({
            task: ingestWhoopTask,
            payload: taskPayload
          });
          break;
        case 'intervals':
          tasksTrigger.push({
            task: ingestIntervalsTask,
            payload: taskPayload
          });
          break;
        case 'yazio':
          tasksTrigger.push({
            task: ingestYazioTask,
            payload: taskPayload
          });
          break;
        default:
          logger.warn(`Unknown provider: ${integration.provider}`);
      }
    }
    
    if (tasksTrigger.length === 0) {
      logger.log("⚠️  No supported integrations to sync");
      return {
        success: true,
        message: "No supported integrations found",
        results: []
      };
    }
    
    logger.log(`🚀 Triggering ${tasksTrigger.length} ingestion task(s) in parallel...`);
    logger.log("");
    
    // Trigger all tasks in parallel and wait for completion
    const { runs } = await batch.triggerByTaskAndWait(tasksTrigger);
    
    logger.log("=" .repeat(60));
    logger.log("📊 BATCH INGESTION RESULTS");
    logger.log("=" .repeat(60));
    
    const results = runs.map((run, index) => {
      const integration = integrations[index];
      
      if (run.ok) {
        logger.log(`✅ ${integration.provider}: SUCCESS`);
        logger.log(`   ${JSON.stringify(run.output, null, 2)}`);
        
        return {
          provider: integration.provider,
          status: 'success',
          data: run.output
        };
      } else {
        logger.error(`❌ ${integration.provider}: FAILED`);
        logger.error(`   Error: ${run.error}`);
        
        return {
          provider: integration.provider,
          status: 'failed',
          error: run.error
        };
      }
    });
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    logger.log("");
    logger.log("Summary:");
    logger.log(`  ✅ Successful: ${successCount}`);
    logger.log(`  ❌ Failed: ${failedCount}`);
    logger.log(`  📊 Total: ${results.length}`);
    logger.log("=" .repeat(60));
    
    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      total: results.length,
      results,
      userId,
      startDate,
      endDate
    };
  }
});