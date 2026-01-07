import { prisma } from "../db";
import {
  fetchIntervalsWorkouts,
  fetchIntervalsWellness,
  fetchIntervalsPlannedWorkouts,
  normalizeIntervalsWorkout,
  normalizeIntervalsWellness,
  normalizeIntervalsPlannedWorkout,
  fetchIntervalsActivityStreams
} from "../intervals";
import { workoutRepository } from "../repositories/workoutRepository";
import { wellnessRepository } from "../repositories/wellnessRepository";
import { eventRepository } from "../repositories/eventRepository";
import { normalizeTSS } from "../normalize-tss";
import { calculateWorkoutStress } from "../calculate-workout-stress";
import { getUserTimezone, getEndOfDayUTC } from "../date";
import { tasks } from "@trigger.dev/sdk/v3";
import { userIngestionQueue } from "../../../trigger/queues";
import {
  calculateLapSplits,
  calculatePaceVariability,
  calculateAveragePace,
  analyzePacingStrategy,
  detectSurges
} from "../pacing";

export class IntervalsService {
  /**
   * Sync activities for a user within a given date range.
   */
  static async syncActivities(userId: string, startDate: Date, endDate: Date) {
    console.log(`[IntervalsService] Syncing activities for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'intervals'
        }
      }
    });

    if (!integration) {
      throw new Error(`Intervals integration not found for user ${userId}`);
    }

    // Calculate 'now' to cap historical data fetching
    const timezone = await getUserTimezone(userId);
    const now = new Date();
    const historicalEndLocal = getEndOfDayUTC(timezone, now);
    const historicalEnd = endDate > historicalEndLocal ? historicalEndLocal : endDate;

    const allActivities = await fetchIntervalsWorkouts(integration, startDate, historicalEnd);
    console.log(`[IntervalsService] Fetched ${allActivities.length} activities`);

    // Filter out incomplete Strava activities
    const activities = allActivities.filter(activity => {
      const isIncompleteStrava = activity.source === 'STRAVA' && activity._note?.includes('not available via the API');
      if (isIncompleteStrava) {
        console.log(`[IntervalsService] Skipping incomplete Strava activity: ${activity.id}`);
        return false;
      }
      return true;
    });

    const pacingActivityTypes = ['Run', 'Ride', 'VirtualRide', 'Walk', 'Hike'];
    let upsertedCount = 0;

    for (const activity of activities) {
      const workout = normalizeIntervalsWorkout(activity, userId);
      
      const upsertedWorkout = await workoutRepository.upsert(
        userId,
        'intervals',
        workout.externalId,
        workout,
        workout
      );
      upsertedCount++;

      // Normalize TSS
      try {
        const tssResult = await normalizeTSS(upsertedWorkout.id, userId);
        if (tssResult.tss !== null) {
          await calculateWorkoutStress(upsertedWorkout.id, userId);
        }
      } catch (error) {
        console.error(`[IntervalsService] Failed to normalize TSS for workout ${upsertedWorkout.id}`, error);
      }

      // Sync stream data if applicable
      if (upsertedWorkout.type && pacingActivityTypes.includes(upsertedWorkout.type)) {
         try {
           console.log(`[IntervalsService] Syncing streams for activity ${activity.id}`);
           await IntervalsService.syncActivityStream(userId, upsertedWorkout.id, activity.id);
         } catch (error) {
           console.error(`[IntervalsService] Failed to sync stream for workout ${upsertedWorkout.id}`, error);
         }
      }
    }

    return upsertedCount;
  }

  /**
   * Sync activity stream data including pacing metrics.
   */
  static async syncActivityStream(userId: string, workoutId: string, activityId: string) {
    // Get Intervals integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: userId,
        provider: 'intervals'
      }
    });
    
    if (!integration) {
      throw new Error('Intervals.icu integration not found');
    }
    
    // Fetch streams from Intervals.icu API
    const streams = await fetchIntervalsActivityStreams(
      integration,
      activityId
    );
    
    // Check if we got any stream data
    if (!streams.time || !streams.time.data || (Array.isArray(streams.time.data) && streams.time.data.length === 0)) {
      console.log(`[IntervalsService] No stream data available for activity ${activityId}`);
      return null;
    }
    
    const dataPoints = (streams.time.data as any[]).length;
    console.log(`[IntervalsService] Found ${dataPoints} data points for activity ${activityId}`);
    
    // Extract data arrays
    const timeData = (streams.time?.data as number[]) || [];
    const distanceData = (streams.distance?.data as number[]) || [];
    const velocityData = (streams.velocity?.data as number[]) || [];
    const heartrateData = (streams.heartrate?.data as number[]) || null;
    const cadenceData = (streams.cadence?.data as number[]) || null;
    const wattsData = (streams.watts?.data as number[]) || null;
    const altitudeData = (streams.altitude?.data as number[]) || null;
    const latlngData = (streams.latlng?.data as [number, number][]) || null;
    const gradeData = (streams.grade?.data as number[]) || null;
    const movingData = (streams.moving?.data as boolean[]) || null;
    
    // Calculate pacing metrics
    let lapSplits = null;
    let paceVariability = null;
    let avgPacePerKm = null;
    let pacingStrategy = null;
    let surges = null;
    
    if (timeData.length > 0 && distanceData.length > 0) {
      // Calculate lap splits (1km intervals)
      lapSplits = calculateLapSplits(timeData, distanceData, 1000);
      
      // Calculate pace variability
      if (velocityData.length > 0) {
        paceVariability = calculatePaceVariability(velocityData);
        
        // Calculate average pace
        avgPacePerKm = calculateAveragePace(
          timeData[timeData.length - 1],
          distanceData[distanceData.length - 1]
        );
      }
      
      // Analyze pacing strategy
      if (lapSplits && lapSplits.length >= 2) {
        pacingStrategy = analyzePacingStrategy(lapSplits);
      }
      
      // Detect surges
      if (velocityData.length > 20 && timeData.length > 20) {
        surges = detectSurges(velocityData, timeData);
      }
    }
    
    // Store in database
    const workoutStream = await prisma.workoutStream.upsert({
      where: { workoutId: workoutId },
      create: {
        workoutId: workoutId,
        time: timeData,
        distance: distanceData,
        velocity: velocityData,
        heartrate: heartrateData,
        cadence: cadenceData,
        watts: wattsData,
        altitude: altitudeData,
        latlng: latlngData,
        grade: gradeData,
        moving: movingData,
        lapSplits,
        paceVariability,
        avgPacePerKm,
        pacingStrategy,
        surges
      },
      update: {
        time: timeData,
        distance: distanceData,
        velocity: velocityData,
        heartrate: heartrateData,
        cadence: cadenceData,
        watts: wattsData,
        altitude: altitudeData,
        latlng: latlngData,
        grade: gradeData,
        moving: movingData,
        lapSplits,
        paceVariability,
        avgPacePerKm,
        pacingStrategy,
        surges,
        updatedAt: new Date()
      }
    });
    
    console.log(`[IntervalsService] Successfully synced ${dataPoints} data points for activity ${activityId}`);
    
    return workoutStream;
  }

  /**
   * Sync wellness data for a user within a given date range.
   */
  static async syncWellness(userId: string, startDate: Date, endDate: Date) {
    console.log(`[IntervalsService] Syncing wellness for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'intervals'
        }
      }
    });

    if (!integration) {
      throw new Error(`Intervals integration not found for user ${userId}`);
    }

    const timezone = await getUserTimezone(userId);
    const now = new Date();
    const historicalEndLocal = getEndOfDayUTC(timezone, now);
    const historicalEnd = endDate > historicalEndLocal ? historicalEndLocal : endDate;

    const wellnessData = await fetchIntervalsWellness(integration, startDate, historicalEnd);
    console.log(`[IntervalsService] Fetched ${wellnessData.length} wellness entries`);

    let upsertedCount = 0;
    for (const wellness of wellnessData) {
      const wellnessDate = new Date(wellness.id);
      const normalizedWellness = normalizeIntervalsWellness(wellness, userId, wellnessDate);
      
      await wellnessRepository.upsert(
        userId,
        wellnessDate,
        normalizedWellness,
        normalizedWellness
      );
      upsertedCount++;
    }

    return upsertedCount;
  }

  /**
   * Sync planned workouts and events for a user within a given date range.
   */
  static async syncPlannedWorkouts(userId: string, startDate: Date, endDate: Date) {
    console.log(`[IntervalsService] Syncing planned workouts for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'intervals'
        }
      }
    });

    if (!integration) {
      throw new Error(`Intervals integration not found for user ${userId}`);
    }

    const plannedWorkouts = await fetchIntervalsPlannedWorkouts(integration, startDate, endDate);
    console.log(`[IntervalsService] Fetched ${plannedWorkouts.length} planned workouts`);

    let plannedUpserted = 0;
    let eventsUpserted = 0;

    for (const planned of plannedWorkouts) {
      const normalizedPlanned = normalizeIntervalsPlannedWorkout(planned, userId);
      
      await prisma.plannedWorkout.upsert({
        where: {
          userId_externalId: {
            userId,
            externalId: normalizedPlanned.externalId
          }
        },
        update: normalizedPlanned,
        create: normalizedPlanned
      });
      plannedUpserted++;

      if (planned.category === 'EVENT') {
        let startTime = null;
        if (planned.start_date_local && planned.start_date_local.includes('T')) {
          const timePart = planned.start_date_local.split('T')[1];
          if (timePart && timePart.length >= 5) {
            startTime = timePart.substring(0, 5);
          }
        }

        const eventData = {
          title: planned.title,
          description: planned.description || '',
          date: new Date(planned.start_date_local),
          startTime,
          type: planned.type || 'Other',
          isVirtual: false,
          isPublic: false,
          distance: planned.distance ? Math.round(planned.distance / 1000) : null,
          expectedDuration: planned.duration ? parseFloat((planned.duration / 3600).toFixed(1)) : null,
          location: planned.location || null
        };

        await eventRepository.upsertExternal(
          userId,
          'intervals',
          planned.id.toString(),
          eventData
        );
        eventsUpserted++;
      }
    }

    return { plannedWorkouts: plannedUpserted, events: eventsUpserted };
  }

  /**
   * Handle activity deletion.
   */
  static async deleteActivity(userId: string, activityId: string) {
    console.log(`[IntervalsService] Deleting activity ${activityId} for user ${userId}`);
    await prisma.workout.deleteMany({
      where: {
        userId,
        source: 'intervals',
        externalId: activityId
      }
    });
  }

  /**
   * Handle planned workout/event deletion.
   */
  static async deletePlannedWorkouts(userId: string, externalIds: string[]) {
    console.log(`[IntervalsService] Deleting ${externalIds.length} planned workouts for user ${userId}`);
    
    await prisma.plannedWorkout.deleteMany({
      where: {
        userId,
        externalId: { in: externalIds }
      }
    });

    await prisma.event.deleteMany({
      where: {
        userId,
        source: 'intervals',
        externalId: { in: externalIds }
      }
    });
  }
}