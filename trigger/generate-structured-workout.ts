import { logger, task } from "@trigger.dev/sdk/v3";
import { generateStructuredAnalysis } from "../server/utils/gemini";
import { prisma } from "../server/utils/db";
import { userReportsQueue } from "./queues";

const workoutStructureSchema = {
  type: "object",
  properties: {
    description: { type: "string", description: "Overall workout strategy description" },
    steps: {
      type: "array",
      description: "Linear sequence of workout steps",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["Warmup", "Active", "Rest", "Cooldown"] },
          durationSeconds: { type: "integer" },
          power: {
            type: "object",
            properties: {
              value: { type: "number", description: "Target % of FTP (e.g. 0.95)" },
              range: { 
                type: "object", 
                properties: { min: { type: "number" }, max: { type: "number" } } 
              }
            }
          },
          cadence: { type: "integer" },
          name: { type: "string", description: "e.g. '5min @ 95%'" }
        },
        required: ["type", "durationSeconds", "name"]
      }
    }
  },
  required: ["steps"]
};

export const generateStructuredWorkoutTask = task({
  id: "generate-structured-workout",
  queue: userReportsQueue,
  run: async (payload: { plannedWorkoutId: string }) => {
    const { plannedWorkoutId } = payload;
    
    const workout = await prisma.plannedWorkout.findUnique({
      where: { id: plannedWorkoutId },
      include: {
        user: { select: { ftp: true } }
      }
    });
    
    if (!workout) throw new Error("Workout not found");
    
    const prompt = `Design a structured cycling workout.
    
    TITLE: ${workout.title}
    DURATION: ${Math.round((workout.durationSec || 3600) / 60)} minutes
    INTENSITY: ${workout.workIntensity || 'Moderate'}
    DESCRIPTION: ${workout.description || 'No specific description'}
    USER FTP: ${workout.user.ftp || 250}W
    
    INSTRUCTIONS:
    - Create a JSON structure defining the exact steps (Warmup, Intervals, Rest, Cooldown).
    - Ensure total duration matches the target duration exactly.
    - Use % of FTP for power targets (e.g. 0.95 = 95%).
    - Be creative but realistic.
    
    OUTPUT JSON format matching the schema.`;
    
    const structure = await generateStructuredAnalysis(
      prompt,
      workoutStructureSchema,
      'flash',
      {
        userId: workout.userId,
        operation: 'generate_structured_workout',
        entityType: 'PlannedWorkout',
        entityId: plannedWorkoutId
      }
    );
    
    await prisma.plannedWorkout.update({
      where: { id: plannedWorkoutId },
      data: {
        structuredWorkout: structure as any
      }
    });
    
    return { success: true, plannedWorkoutId };
  }
});
