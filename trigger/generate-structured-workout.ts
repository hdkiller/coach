import { logger, task } from "@trigger.dev/sdk/v3";
import { generateStructuredAnalysis } from "../server/utils/gemini";
import { prisma } from "../server/utils/db";
import { userReportsQueue } from "./queues";

const workoutStructureSchema = {
  type: "object",
  properties: {
    description: { type: "string", description: "Overall workout strategy description" },
    coachInstructions: { type: "string", description: "Personalized coaching advice based on athlete profile" },
    steps: {
      type: "array",
      description: "Linear sequence of workout steps (Ride, Run, Swim)",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["Warmup", "Active", "Rest", "Cooldown"] },
          durationSeconds: { type: "integer" },
          distance: { type: "integer", description: "Distance in meters (Swim/Run)" },
          description: { type: "string", description: "Pace or stroke description" },
          power: {
            type: "object",
            properties: {
              value: { type: "number", description: "Target % of FTP (e.g. 0.95)" },
              range: { 
                type: "object", 
                properties: { start: { type: "number" }, end: { type: "number" } },
                description: "For ramps: start and end % of FTP"
              }
            }
          },
          cadence: { type: "integer" },
          name: { type: "string", description: "e.g. '5min @ 95%'" }
        },
        required: ["type", "name"]
      }
    },
    exercises: {
      type: "array",
      description: "List of exercises for Strength training",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sets: { type: "integer" },
          reps: { type: "string", description: "e.g. '8-12' or 'AMRAP'" },
          weight: { type: "string", description: "e.g. '70% 1RM' or 'Bodyweight'" },
          duration: { type: "integer", description: "Duration in seconds if time-based" },
          notes: { type: "string", description: "Form cues or tempo" }
        },
        required: ["name"]
      }
    }
  },
  required: ["coachInstructions"]
};

export const generateStructuredWorkoutTask = task({
  id: "generate-structured-workout",
  queue: userReportsQueue,
  run: async (payload: { plannedWorkoutId: string }) => {
    const { plannedWorkoutId } = payload;
    
    const workout = await (prisma as any).plannedWorkout.findUnique({
      where: { id: plannedWorkoutId },
      include: {
        user: { select: { ftp: true, aiPersona: true, name: true } },
        trainingWeek: {
          include: {
            block: {
              include: {
                plan: {
                  include: {
                    goal: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!workout) throw new Error("Workout not found");
    
    // Build context
    const persona = workout.user.aiPersona || 'Supportive';
    const goal = workout.trainingWeek?.block.plan.goal?.title || workout.trainingWeek?.block.plan.name || 'General Fitness';
    const phase = workout.trainingWeek?.block.type || 'General';
    const focus = workout.trainingWeek?.block.primaryFocus || 'Fitness';
    
    const prompt = `Design a structured ${workout.type} workout for ${workout.user.name || 'Athlete'}.
    
    TITLE: ${workout.title}
    DURATION: ${Math.round((workout.durationSec || 3600) / 60)} minutes
    INTENSITY: ${workout.workIntensity || 'Moderate'}
    DESCRIPTION: ${workout.description || 'No specific description'}
    USER FTP: ${workout.user.ftp || 250}W
    TYPE: ${workout.type}
    
    CONTEXT:
    - Goal: ${goal}
    - Phase: ${phase}
    - Focus: ${focus}
    - Coach Persona: ${persona}
    
    INSTRUCTIONS:
    - Create a JSON structure defining the exact steps (Warmup, Intervals, Rest, Cooldown).
    - Ensure total duration matches the target duration exactly.
    - Add "coachInstructions": A personalized message (2-3 sentences) explaining WHY this workout matters for their goal (${goal}) and how to execute it (e.g. "Focus on smooth cadence during the efforts"). Use the '${persona}' persona tone.

    FOR CYCLING (Ride/VirtualRide):
    - Use % of FTP for power targets (e.g. 0.95 = 95%).
    - For ramps (Warmup/Cooldown), use "range" with "start" and "end" values (e.g. start: 0.50, end: 0.75 for warmup).
    - Include target "cadence" (RPM) for each step (e.g. 85-95 for intervals, 60-80 for rest).

    FOR RUNNING (Run):
    - Steps should have 'type', 'durationSeconds', 'name', and 'targetPower' (optional, use if power based) or 'description' for pace (e.g. "5:00 min/km").
    
    FOR SWIMMING (Swim):
    - Steps should ideally have 'distance' (meters) instead of or in addition to duration. If using duration, estimate distance.
    - Include 'stroke' type in description if applicable.

    FOR STRENGTH (Gym/WeightTraining):
    - Instead of 'steps', provide a list of 'exercises'.
    - Each exercise should have 'name', 'sets', 'reps', 'weight' (optional description like "Heavy" or %1RM), and 'notes'.
    - Structure it as Warmup -> Main Lifts -> Accessories -> Cooldown if possible.
    
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
    
    await (prisma as any).plannedWorkout.update({
      where: { id: plannedWorkoutId },
      data: {
        structuredWorkout: structure as any
      }
    });
    
    return { success: true, plannedWorkoutId };
  }
});
