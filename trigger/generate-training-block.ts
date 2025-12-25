import { logger, task } from "@trigger.dev/sdk/v3";
import { generateStructuredAnalysis } from "../server/utils/gemini";
import { prisma } from "../server/utils/db";
import { userReportsQueue } from "./queues";

const trainingBlockSchema = {
  type: "object",
  properties: {
    weeks: {
      type: "array",
      description: "List of training weeks in this block",
      items: {
        type: "object",
        properties: {
          weekNumber: { type: "integer", description: "1-based index within the block" },
          focus: { type: "string", description: "Primary focus of this week (e.g. Loading, Recovery)" },
          volumeTargetMinutes: { type: "integer" },
          workouts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dayOfWeek: { type: "integer", description: "0=Sunday, 1=Monday, ..., 6=Saturday" },
                title: { type: "string", description: "Workout title (e.g. '3x10m Sweet Spot')" },
                description: { type: "string", description: "Brief description of the workout goal" },
                type: { type: "string", enum: ["Ride", "Run", "Swim", "Gym", "Rest", "Active Recovery"] },
                durationMinutes: { type: "integer" },
                tssEstimate: { type: "integer" },
                intensity: {
                  type: "string",
                  enum: ["recovery", "easy", "moderate", "hard", "very_hard"],
                  description: "Overall intensity level"
                }
              },
              required: ["dayOfWeek", "title", "type", "durationMinutes", "intensity"]
            }
          }
        },
        required: ["weekNumber", "workouts"]
      }
    }
  },
  required: ["weeks"]
};

export const generateTrainingBlockTask = task({
  id: "generate-training-block",
  queue: userReportsQueue,
  maxDuration: 300, // 5 minutes
  run: async (payload: { userId: string; blockId: string }) => {
    const { userId, blockId } = payload;
    
    logger.log("Starting training block generation", { userId, blockId });
    
    // 1. Fetch Context
    const block = await prisma.trainingBlock.findUnique({
      where: { id: blockId },
      include: {
        plan: {
          include: {
            goal: true
          }
        }
      }
    });
    
    if (!block) throw new Error("Block not found");
    
    const [user, availability] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { ftp: true, weight: true, maxHr: true, aiPersona: true }
      }),
      prisma.trainingAvailability.findMany({
        where: { userId }
      })
    ]);
    
    // 2. Format Availability Context
    const scheduleContext = availability.map(day => {
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.dayOfWeek];
      let slots = [];
      if (day.morning) slots.push("Morning");
      if (day.afternoon) slots.push("Afternoon");
      if (day.evening) slots.push("Evening");
      
      if (slots.length === 0) return `${dayName}: REST DAY (No availability)`;
      return `${dayName}: Available (${slots.join(", ")}) - Preferred: ${day.preferredTypes ? JSON.stringify(day.preferredTypes) : "Any"}`;
    }).join("\n");
    
    // 3. Build Prompt
    const prompt = `You are an expert cycling coach designing a specific mesocycle (training block) for an athlete.

ATHLETE PROFILE:
- FTP: ${user?.ftp || 'Unknown'} W
- Weight: ${user?.weight || 'Unknown'} kg
- Coach Persona: ${user?.aiPersona || 'Supportive'}

TRAINING GOAL:
- Goal: ${block.plan.goal.title}
- Event Date: ${new Date(block.plan.goal.eventDate || block.plan.targetDate).toDateString()}
- Strategy: ${block.plan.strategy}

BLOCK CONTEXT:
- Block Name: "${block.name}"
- Phase Type: ${block.type} (e.g. Base, Build, Peak)
- Primary Focus: ${block.primaryFocus}
- Duration: ${block.durationWeeks} weeks
- Start Date: ${new Date(block.startDate).toDateString()}
- Progression Logic: ${block.progressionLogic || "Standard linear progression"}
- Recovery Week: Week ${block.recoveryWeekIndex || 4} is a recovery week.

WEEKLY SCHEDULE CONSTRAINTS:
${scheduleContext || "No specific constraints, assume standard training week (Mon rest, Tue/Thu intensity, Sat/Sun long)."}

INSTRUCTIONS:
Generate a detailed daily training plan for each week in this block (${block.durationWeeks} weeks).
- Adhere strictly to the Schedule Constraints (do not schedule workouts on unavailable days).
- Ensure progressive overload from week 1 to ${block.durationWeeks - 1}.
- Ensure the recovery week (if applicable) has significantly reduced volume and intensity.
- For "Ride" workouts, provide realistic TSS estimates based on duration and intensity.
- Workout types: Ride, Run, Swim, Gym, Rest, Active Recovery.

OUTPUT FORMAT:
Return valid JSON matching the schema provided.`;

    // 4. Generate with Gemini
    logger.log("Prompting Gemini...");
    const result = await generateStructuredAnalysis<any>(
      prompt,
      trainingBlockSchema,
      'flash', // Flash is usually sufficient for planning, switch to Pro if logic is complex
      {
        userId,
        operation: 'generate_training_block',
        entityType: 'TrainingBlock',
        entityId: blockId
      }
    );
    
    // 5. Persist Results
    logger.log("Persisting generated plan...", { weeksCount: result.weeks.length });
    
    await prisma.$transaction(async (tx) => {
      // Clear existing generated weeks for this block to avoid duplicates if re-running
      // (Optional: might want to be smarter about this if preserving history)
      await tx.trainingWeek.deleteMany({
        where: { blockId }
      });

      for (const weekData of result.weeks) {
        // Calculate dates
        const weekStartDate = new Date(block.startDate);
        weekStartDate.setDate(weekStartDate.getDate() + (weekData.weekNumber - 1) * 7);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        // Create Week
        const createdWeek = await tx.trainingWeek.create({
          data: {
            blockId,
            weekNumber: weekData.weekNumber,
            startDate: weekStartDate,
            endDate: weekEndDate,
            focus: weekData.focus,
            volumeTargetMinutes: weekData.volumeTargetMinutes || 0,
            tssTarget: weekData.workouts.reduce((acc: number, w: any) => acc + (w.tssEstimate || 0), 0),
            isRecovery: weekData.focus?.toLowerCase().includes('recovery') || false
          }
        });
        
        // Create Workouts
        for (const workout of weekData.workouts) {
          // Calculate specific date based on dayOfWeek (0-6)
          // weekStartDate is implied to be Monday in business logic, but let's be careful.
          // Usually isoWeek starts on Monday (1). JS DategetDay() is Sun=0.
          // Let's assume the AI follows the requested 0=Sun mapping.
          
          // Align weekStartDate to the correct Monday/Sunday start?
          // Simplification: weekStartDate is the start of the block + offset.
          // We need to find the specific date that matches the dayOfWeek within this week range.
          
          const targetDate = new Date(weekStartDate);
          const startDay = targetDate.getDay(); // 0-6
          const dayDiff = (workout.dayOfWeek - startDay + 7) % 7;
          targetDate.setDate(targetDate.getDate() + dayDiff);
          
          // Ensure it falls within the week (sometimes logic above pushes to next week if start is late)
          // Actually, standard is: Block starts on a Monday.
          // If block.startDate is Monday, then:
          // Mon=1, Tue=2... Sun=0.
          // If workout.dayOfWeek is 1 (Mon), date is weekStartDate.
          // If workout.dayOfWeek is 0 (Sun), date is weekStartDate + 6.
          
          // Correct logic assuming Block Start is ALWAYS aligned to start of week (e.g. Monday)
          const daysToAdd = workout.dayOfWeek === 0 ? 6 : workout.dayOfWeek - 1; 
          // Wait, standard JS getDay: Sun=0, Mon=1.
          // If Start is Mon(1):
          // Mon(1) -> +0 days
          // Tue(2) -> +1 days
          // ...
          // Sun(0) -> +6 days
          
          const offset = workout.dayOfWeek === 0 ? 6 : workout.dayOfWeek - 1;
          const workoutDate = new Date(weekStartDate);
          workoutDate.setDate(workoutDate.getDate() + offset);

          await tx.plannedWorkout.create({
            data: {
              userId,
              trainingWeekId: createdWeek.id,
              date: workoutDate,
              title: workout.title,
              description: workout.description,
              type: workout.type,
              durationSec: (workout.durationMinutes || 0) * 60,
              tss: workout.tssEstimate,
              workIntensity: getIntensityScore(workout.intensity),
              externalId: `ai-gen-${createdWeek.id}-${workout.dayOfWeek}-${Date.now()}`, // Temporary ID
              category: 'WORKOUT'
            }
          });
        }
      }
    });
    
    return { success: true, blockId };
  }
});

function getIntensityScore(intensity: string): number {
  switch (intensity) {
    case 'recovery': return 0.3;
    case 'easy': return 0.5;
    case 'moderate': return 0.7;
    case 'hard': return 0.85;
    case 'very_hard': return 0.95;
    default: return 0.5;
  }
}
