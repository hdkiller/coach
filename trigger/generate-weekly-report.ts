import { logger, task } from "@trigger.dev/sdk/v3";
import { PrismaClient } from "@prisma/client";
import { 
  generateCoachAnalysis, 
  buildWorkoutSummary, 
  buildMetricsSummary 
} from "../server/utils/gemini";

const prisma = new PrismaClient();

export const generateWeeklyReportTask = task({
  id: "generate-weekly-report",
  maxDuration: 300, // 5 minutes for AI processing
  run: async (payload: { userId: string; reportId: string }) => {
    const { userId, reportId } = payload;
    
    logger.log("Starting weekly report generation", { userId, reportId });
    
    // Update report status
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'PROCESSING' }
    });
    
    try {
      // Calculate date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      logger.log("Fetching data", { startDate, endDate });
      
      // Fetch data
      const [workouts, metrics, user] = await Promise.all([
        prisma.workout.findMany({
          where: {
            userId,
            date: { gte: startDate, lte: endDate }
          },
          orderBy: { date: 'asc' }
        }),
        prisma.dailyMetric.findMany({
          where: {
            userId,
            date: { gte: startDate, lte: endDate }
          },
          orderBy: { date: 'asc' }
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { ftp: true, weight: true, maxHr: true }
        })
      ]);
      
      logger.log("Data fetched", { 
        workoutsCount: workouts.length, 
        metricsCount: metrics.length 
      });
      
      if (workouts.length === 0) {
        throw new Error('No workout data available for analysis');
      }
      
      // Build prompt
      const prompt = `You are an expert cycling coach analyzing training data.

USER PROFILE:
- FTP: ${user?.ftp || 'Unknown'} watts
- Weight: ${user?.weight || 'Unknown'} kg
- Max HR: ${user?.maxHr || 'Unknown'} bpm
- W/kg: ${user?.ftp && user?.weight ? (user.ftp / user.weight).toFixed(2) : 'Unknown'}

WORKOUTS (Last 30 days):
${buildWorkoutSummary(workouts)}

DAILY METRICS (Recovery & Sleep):
${metrics.length > 0 ? buildMetricsSummary(metrics) : 'No recovery data available'}

ANALYSIS INSTRUCTIONS:
1. Calculate training load distribution (easy, moderate, hard days)
2. Identify trends in HRV vs training intensity
3. Look for signs of overreaching or undertraining
4. Analyze power progression and fatigue accumulation
5. Evaluate recovery patterns and sleep quality
6. Provide specific, actionable recommendations

OUTPUT FORMAT: 
Write a professional markdown report with the following sections:
- **Executive Summary** (2-3 sentences highlighting key findings)
- **Training Load Analysis** (weekly TSS, intensity distribution, trends)
- **Recovery Trends** (HRV patterns, sleep quality, readiness)
- **Power Progression** (improvements or regressions in key metrics)
- **Fatigue & Form** (current training stress balance)
- **Recommendations** (3-5 specific actionable items)

Write in a supportive, coaching tone. Be specific with numbers and metrics.`;

      logger.log("Generating report with Gemini Pro");
      
      // Generate with Gemini Pro
      const markdown = await generateCoachAnalysis(prompt, 'pro');
      
      logger.log("Report generated successfully", { 
        markdownLength: markdown.length 
      });
      
      // Save report
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          markdown,
          modelVersion: 'gemini-2.0-flash-thinking-exp-1219',
          dateRangeStart: startDate,
          dateRangeEnd: endDate
        }
      });
      
      logger.log("Report saved to database");
      
      return {
        success: true,
        reportId,
        userId,
        markdownLength: markdown.length
      };
    } catch (error) {
      logger.error("Error generating report", { error });
      
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
        }
      });
      
      throw error;
    }
  }
});