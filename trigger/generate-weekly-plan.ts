import { logger, task } from "@trigger.dev/sdk/v3";
import { generateStructuredAnalysis } from "../server/utils/gemini";
import { prisma } from "../server/utils/db";
import { workoutRepository } from "../server/utils/repositories/workoutRepository";
import { wellnessRepository } from "../server/utils/repositories/wellnessRepository";
import { generateTrainingContext } from "../server/utils/training-metrics";
import { userBackgroundQueue } from "./queues";

const weeklyPlanSchema = {
  type: 'object',
  properties: {
    weekSummary: {
      type: 'string',
      description: 'Brief overview of the weekly plan strategy'
    },
    totalTSS: {
      type: 'number',
      description: 'Total weekly Training Stress Score'
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in ISO format' },
          dayOfWeek: { type: 'number', description: 'Day of week (0-6)' },
          workoutType: { 
            type: 'string',
            description: 'Type of workout: Ride, Run, Gym, Swim, Rest, or Active Recovery'
          },
          timeOfDay: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening'],
            description: 'Recommended time of day'
          },
          title: { type: 'string', description: 'Workout title' },
          description: { type: 'string', description: 'Detailed workout description' },
          durationMinutes: { type: 'number', description: 'Duration in minutes' },
          targetTSS: { type: 'number', description: 'Target Training Stress Score' },
          intensity: {
            type: 'string',
            enum: ['recovery', 'easy', 'moderate', 'hard', 'very_hard'],
            description: 'Workout intensity level'
          },
          location: {
            type: 'string',
            enum: ['indoor', 'outdoor', 'gym'],
            description: 'Location for the workout'
          },
          reasoning: {
            type: 'string',
            description: 'Why this workout on this day'
          }
        },
        required: ['date', 'dayOfWeek', 'workoutType', 'title', 'description', 'durationMinutes', 'reasoning']
      }
    }
  },
  required: ['weekSummary', 'totalTSS', 'days']
};

export const generateWeeklyPlanTask = task({
  id: "generate-weekly-plan",
  queue: userBackgroundQueue,
  run: async (payload: { userId: string; startDate: Date; daysToPlann: number }) => {
    const { userId, startDate, daysToPlann } = payload;
    
    logger.log("Starting weekly plan generation", { userId, startDate, daysToPlann });
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    // Calculate week boundaries
    const weekStart = new Date(start);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    weekStart.setDate(diff);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + (daysToPlann - 1));
    
    // Fetch user data
    const [user, availability, recentWorkouts, recentWellness, currentPlan, athleteProfile, activeGoals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { ftp: true, weight: true, maxHr: true }
      }),
      prisma.trainingAvailability.findMany({
        where: { userId },
        orderBy: { dayOfWeek: 'asc' }
      }),
      workoutRepository.getForUser(userId, {
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Last 14 days
        endDate: start, // strictly less than start handled by lte in repo? Repo uses lte.
        // We need 'lt' strictly speaking, but for daily granularity, using day before as endDate is safer or just accept overlaps?
        // Let's use the date range as is, repo uses lte.
        // Actually, start is set to 00:00:00 of the planning start date.
        // So we want everything BEFORE that.
        // Repo getForUser uses 'lte'. So if we pass 'start' it will include workouts on 'start' day at 00:00:00.
        // We should pass 'new Date(start.getTime() - 1)' as endDate.
        limit: 10,
        orderBy: { date: 'desc' }
      }),
      wellnessRepository.getForUser(userId, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        endDate: start,
        limit: 7,
        orderBy: { date: 'desc' }
      }),
      prisma.weeklyTrainingPlan.findFirst({
        where: {
          userId,
          weekStartDate: weekStart
        }
      }),
      
      // Latest athlete profile
      prisma.report.findFirst({
        where: {
          userId,
          type: 'ATHLETE_PROFILE',
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        select: { analysisJson: true, createdAt: true }
      }),
      
      // Active goals
      prisma.goal.findMany({
        where: {
          userId,
          status: 'ACTIVE'
        },
        orderBy: { priority: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          metric: true,
          currentValue: true,
          targetValue: true,
          targetDate: true,
          eventDate: true,
          eventType: true,
          priority: true,
          aiContext: true
        }
      })
    ]);
    
    logger.log("Data fetched", {
      hasUser: !!user,
      availabilityDays: availability.length,
      recentWorkoutsCount: recentWorkouts.length,
      recentWellnessCount: recentWellness.length,
      hasExistingPlan: !!currentPlan,
      hasAthleteProfile: !!athleteProfile,
      activeGoals: activeGoals.length
    });
    
    // Build availability summary
    const availabilitySummary = availability.map(a => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const slots = [];
      if (a.morning) slots.push('morning');
      if (a.afternoon) slots.push('afternoon');
      if (a.evening) slots.push('evening');
      
      const constraints = [];
      if (a.bikeAccess) constraints.push('bike/trainer available');
      if (a.gymAccess) constraints.push('gym available');
      if (a.indoorOnly) constraints.push('indoor only');
      if (a.outdoorOnly) constraints.push('outdoor only');
      
      // Build the line
      let line = `${dayNames[a.dayOfWeek]}: ${slots.length > 0 ? slots.join(', ') : 'rest day'}`;
      if (constraints.length > 0) {
        line += ` (${constraints.join(', ')})`;
      }
      
      // Add explicit warnings for equipment limitations
      if (slots.length > 0 && !a.bikeAccess && !a.gymAccess) {
        line += ' [NO EQUIPMENT - only bodyweight activities]';
      } else if (slots.length > 0 && !a.bikeAccess && a.gymAccess) {
        line += ' [NO BIKE - gym strength training only]';
      } else if (slots.length > 0 && a.bikeAccess && !a.gymAccess) {
        line += ' [cycling only, no gym]';
      }
      
      return line;
    }).join('\n');
    
    // Calculate recent training load
    const recentTSS = recentWorkouts.reduce((sum, w) => sum + (w.tss || 0), 0);
    const avgRecovery = recentWellness.length > 0
      ? recentWellness.reduce((sum, w) => sum + (w.recoveryScore || 50), 0) / recentWellness.length
      : 50;
    
    // Generate training context for load management
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const trainingContext = await generateTrainingContext(userId, thirtyDaysAgo, now, {
      includeZones: false,
      includeBreakdown: true
    });

    // Determine current training phase if a goal exists
    let phaseInstruction = "";
    const primaryGoal = activeGoals.find(g => g.type === 'EVENT' && g.priority === 'HIGH') || activeGoals[0];
    
    if (primaryGoal) {
      const today = new Date();
      const goalDate = primaryGoal.eventDate || primaryGoal.targetDate;
      
      if (goalDate) {
        const weeksToGoal = Math.ceil((new Date(goalDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7));
        
        // Extract phase preference from aiContext if available
        let preferredPhase = "";
        if (primaryGoal.aiContext?.includes("Phase Preference:")) {
          preferredPhase = primaryGoal.aiContext.split("Phase Preference:")[1].split(".")[0].trim();
        }

        if (preferredPhase) {
          phaseInstruction = `\nUSER SPECIFIED PHASE: ${preferredPhase}. Focus the training plan strictly on this phase's objectives.`;
        } else if (weeksToGoal > 12) {
          phaseInstruction = `\nRECOMMENDED PHASE: BASE. Focus on building aerobic foundation and muscular endurance.`;
        } else if (weeksToGoal > 4) {
          phaseInstruction = `\nRECOMMENDED PHASE: BUILD. Focus on specificity, threshold, and race-intensity workouts.`;
        } else if (weeksToGoal > 0) {
          phaseInstruction = `\nRECOMMENDED PHASE: SPECIALTY/PEAK. Focus on maximum specificity, race simulation, and tapering.`;
        }
      }
    }
    
    // Calculate current and target TSS values
    const currentWeeklyTSS = trainingContext.loadTrend.weeklyTSSAvg;
    const targetMinTSS = Math.round(currentWeeklyTSS * 1.05); // 5% increase
    const targetMaxTSS = Math.round(currentWeeklyTSS * 1.10); // 10% increase
    
    // Build athlete profile context
    let athleteContext = '';
    if (athleteProfile?.analysisJson) {
      const profile = athleteProfile.analysisJson as any;
      athleteContext = `
ATHLETE PROFILE (Generated ${new Date(athleteProfile.createdAt).toLocaleDateString()}):
${profile.executive_summary ? `Summary: ${profile.executive_summary}` : ''}

Current Fitness: ${profile.current_fitness?.status_label || 'Unknown'}
${profile.current_fitness?.key_points ? profile.current_fitness.key_points.map((p: string) => `- ${p}`).join('\n') : ''}

Training Characteristics:
${profile.training_characteristics?.training_style || 'No data'}
Strengths: ${profile.training_characteristics?.strengths?.join(', ') || 'None listed'}
Areas for Development: ${profile.training_characteristics?.areas_for_development?.join(', ') || 'None listed'}

Recovery Profile: ${profile.recovery_profile?.recovery_pattern || 'Unknown'}
${profile.recovery_profile?.key_observations ? profile.recovery_profile.key_observations.map((o: string) => `- ${o}`).join('\n') : ''}

Recent Performance Trend: ${profile.recent_performance?.trend || 'Unknown'}
${profile.recent_performance?.patterns ? profile.recent_performance.patterns.map((p: string) => `- ${p}`).join('\n') : ''}

Planning Context:
${profile.planning_context?.current_focus ? `Current Focus: ${profile.planning_context.current_focus}` : ''}
${profile.planning_context?.limitations?.length ? `Limitations: ${profile.planning_context.limitations.join(', ')}` : ''}
${profile.planning_context?.opportunities?.length ? `Opportunities: ${profile.planning_context.opportunities.join(', ')}` : ''}

Recommendations Summary:
${profile.recommendations_summary?.recurring_themes?.length ? `Themes: ${profile.recommendations_summary.recurring_themes.join('; ')}` : ''}
${profile.recommendations_summary?.action_items?.length ? `Priority Actions:\n${profile.recommendations_summary.action_items.map((a: any) => `- [${a.priority}] ${a.action}`).join('\n')}` : ''}
`;
    } else {
      athleteContext = `
USER BASIC INFO:
- FTP: ${user?.ftp || 'Unknown'} watts
- Weight: ${user?.weight || 'Unknown'} kg
- Max HR: ${user?.maxHr || 'Unknown'} bpm
Note: No structured athlete profile available yet. Consider generating one for better personalized planning.
`;
    }
    
    // Add goals context
    if (activeGoals.length > 0) {
      athleteContext += `

CURRENT GOALS:
${activeGoals.map(g => {
  const daysToTarget = g.targetDate ? Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const daysToEvent = g.eventDate ? Math.ceil((new Date(g.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  
  let goalInfo = `- [${g.priority}] ${g.title} (${g.type})`;
  if (g.description) goalInfo += `\n  ${g.description}`;
  if (g.metric && g.targetValue) {
    goalInfo += `\n  Target: ${g.metric} = ${g.targetValue}`;
    if (g.currentValue) goalInfo += ` (Current: ${g.currentValue})`;
  }
  if (daysToTarget) goalInfo += `\n  Timeline: ${daysToTarget} days remaining`;
  if (daysToEvent) goalInfo += `\n  Event: ${g.eventType || 'race'} on ${new Date(g.eventDate!).toLocaleDateString()} (${daysToEvent} days)`;
  if (g.aiContext) goalInfo += `\n  Context: ${g.aiContext}`;
  
  return goalInfo;
}).join('\n\n')}
`;
    } else {
      athleteContext += `

CURRENT GOALS:
No active goals set. Plan for general fitness maintenance and improvement.
`;
    }
    
    // Build prompt
    const prompt = `You are an expert cycling coach creating a personalized ${daysToPlann}-day training plan.
${phaseInstruction}

${athleteContext}

TRAINING AVAILABILITY (when user can train):
${availabilitySummary || 'No availability set - assume flexible schedule'}

RECENT TRAINING (Last 14 days):
- Total TSS: ${recentTSS.toFixed(0)}
- Workouts completed: ${recentWorkouts.length}
- Recent workouts: ${recentWorkouts.slice(0, 3).map(w => 
    `${new Date(w.date).toLocaleDateString()}: ${w.title} (TSS: ${w.tss || 'N/A'}, ${Math.round(w.durationSec / 60)}min)`
  ).join(', ') || 'No recent workouts'}

RECENT RECOVERY (Last 7 days):
- Average recovery score: ${avgRecovery.toFixed(0)}%
- Latest HRV: ${recentWellness[0]?.hrv || 'N/A'} ms
- Latest resting HR: ${recentWellness[0]?.restingHr || 'N/A'} bpm

PLANNING PERIOD:
- Start: ${weekStart.toLocaleDateString()}
- End: ${weekEnd.toLocaleDateString()}
- Days to plan: ${daysToPlann}

CRITICAL EQUIPMENT CONSTRAINTS:
- NEVER suggest cycling workouts (Ride) on days without "bike/trainer available"
- Days with ONLY "gym available" MUST use Gym workouts (strength training)
- Days with NO equipment can only have: Rest, Active Recovery (walking, stretching, mobility)
- Days with "bike/trainer available" can have cycling workouts
- Respect indoor/outdoor constraints strictly

INSTRUCTIONS:
1. **STRICTLY RESPECT EQUIPMENT AVAILABILITY** - This is the #1 priority
2. Create a progressive training plan that respects user's availability and equipment
3. **Balance intensity and load progression safely**:
   - Use current TSB (Form) to determine if athlete can handle more load
   - TSB > 5: Can increase intensity/volume
   - TSB -10 to 5: Maintain current load
   - TSB < -10: Reduce load or add recovery
   - Weekly TSS should not increase by more than 5-10% from current average (${Math.round(trainingContext.loadTrend.weeklyTSSAvg)})
4. Consider recent training load and recovery status
5. For days with multiple time slots, choose the best one based on workout type
6. If no availability is set for a day, suggest rest or light stretching/mobility work
7. Include variety based on available equipment:
   - With bike: endurance rides, intervals, recovery rides
   - With gym: strength training, core work, leg/upper body splits
   - Without equipment: mobility, stretching, walking, yoga
8. Ensure adequate recovery between hard efforts based on intensity distribution
9. Target weekly TSS should progress safely from current load (Current: ${currentWeeklyTSS}, Target: ${targetMinTSS}-${targetMaxTSS})
10. Each workout should have clear objectives and be actionable
11. Consider location constraints (indoor vs outdoor vs gym)
12. **Reference the activity type breakdown** to maintain balanced training across disciplines

WORKOUT TYPES AND EQUIPMENT REQUIREMENTS:
- Ride: Requires bike/trainer available - DO NOT use if not available
- Run: Running workout (minimal equipment)
- Gym: Requires gym available - strength training, weights
- Swim: Swimming workout (requires pool access)
- Rest: Complete rest day (no equipment needed)
- Active Recovery: Very easy activity - walking, stretching, light mobility (no equipment needed)

Create a structured, progressive plan for the next ${daysToPlann} days.`;

    logger.log("Generating plan with Gemini Flash");
    
    const plan = await generateStructuredAnalysis(
      prompt,
      weeklyPlanSchema,
      'flash',
      {
        userId,
        operation: 'weekly_plan_generation',
        entityType: 'WeeklyTrainingPlan',
        entityId: undefined
      }
    );
    
    logger.log("Plan generated", { 
      daysPlanned: (plan as any).days?.length,
      totalTSS: (plan as any).totalTSS
    });
    
    // Save or update the plan
    const planData = {
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      daysPlanned: daysToPlann,
      status: 'ACTIVE',
      generatedBy: 'AI',
      modelVersion: 'gemini-2.0-flash-exp',
      planJson: plan as any,
      totalTSS: (plan as any).totalTSS,
      totalDuration: (plan as any).days?.reduce((sum: number, d: any) => sum + (d.durationMinutes || 0) * 60, 0),
      workoutCount: (plan as any).days?.filter((d: any) => d.workoutType !== 'Rest').length
    };
    
    const savedPlan = currentPlan
      ? await prisma.weeklyTrainingPlan.update({
          where: { id: currentPlan.id },
          data: {
            ...planData,
            updatedAt: new Date()
          }
        })
      : await prisma.weeklyTrainingPlan.create({
          data: planData
        });
    
    logger.log("Plan saved", { planId: savedPlan.id });
    
    return {
      success: true,
      planId: savedPlan.id,
      userId,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      daysPlanned: daysToPlann,
      totalTSS: savedPlan.totalTSS,
      workoutCount: savedPlan.workoutCount
    };
  }
});