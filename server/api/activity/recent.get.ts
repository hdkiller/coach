import { getServerSession } from '../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Activity'],
    summary: 'Get recent activity',
    description: 'Returns a combined timeline of recent workouts, nutrition, and wellness data.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                count: { type: 'integer' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      type: { type: 'string', enum: ['workout', 'nutrition', 'wellness'] },
                      date: { type: 'string', format: 'date-time' },
                      icon: { type: 'string' },
                      color: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      link: { type: 'string', nullable: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.id) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const userId = session.user.id
  
  // Get date range for the past 5 days
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 5)
  
  try {
    // Fetch workouts from the past 5 days (excluding duplicates)
    const workouts = await workoutRepository.getForUser(userId, {
      startDate,
      endDate,
      limit: 10,
      orderBy: { date: 'desc' }
      // Note: Repository handles duplicate exclusion by default
      // TODO: Filter durationSec > 0 if strictly needed, or trust data quality
    })
    
    // Fetch nutrition from the past 5 days
    const nutrition = await nutritionRepository.getForUser(userId, {
      startDate,
      endDate,
      limit: 10,
      orderBy: { date: 'desc' }
    })
    
    // Fetch wellness data from the past 5 days
    const wellness = await wellnessRepository.getForUser(userId, {
      startDate,
      endDate,
      limit: 10,
      orderBy: { date: 'desc' }
    })
    
    // Format timeline items
    const timelineItems: any[] = []
    
    // Add workouts
    workouts.forEach(workout => {
      const durationMin = Math.round(workout.durationSec / 60)
      const description = []
      
      if (durationMin > 0) {
        description.push(`${durationMin} min`)
      }
      if (workout.tss && workout.tss > 0) {
        description.push(`${Math.round(workout.tss)} TSS`)
      }
      if (workout.averageWatts && workout.averageWatts > 0) {
        description.push(`${Math.round(workout.averageWatts)}W avg`)
      }
      if (workout.averageHr && workout.averageHr > 0) {
        description.push(`${Math.round(workout.averageHr)} bpm`)
      }
      
      timelineItems.push({
        id: `workout-${workout.id}`,
        type: 'workout',
        date: workout.date,
        icon: 'i-heroicons-bolt',
        color: 'primary',
        title: workout.title || 'Workout',
        description: description.join(' • '),
        link: `/workouts/${workout.id}`
      })
    })
    
    // Add nutrition entries (group by day)
    const nutritionByDay = new Map<string, typeof nutrition>()
    nutrition.forEach(entry => {
      const dateKey = entry.date.toISOString().split('T')[0]
      if (dateKey) {
        if (!nutritionByDay.has(dateKey)) {
          nutritionByDay.set(dateKey, [])
        }
        nutritionByDay.get(dateKey)!.push(entry)
      }
    })
    
    nutritionByDay.forEach((entries, dateKey) => {
      const totalCalories = entries.reduce((sum, e) => sum + (e.calories || 0), 0)
      const totalProtein = entries.reduce((sum, e) => sum + (e.protein || 0), 0)
      const totalCarbs = entries.reduce((sum, e) => sum + (e.carbs || 0), 0)
      
      const description = []
      if (totalCalories > 0) {
        description.push(`${Math.round(totalCalories)} kcal`)
      }
      if (totalProtein > 0) {
        description.push(`${Math.round(totalProtein)}g protein`)
      }
      if (totalCarbs > 0) {
        description.push(`${Math.round(totalCarbs)}g carbs`)
      }
      
      // Use the first entry's date for the timeline
      const firstEntry = entries[0]
      if (firstEntry) {
        timelineItems.push({
          id: `nutrition-${dateKey}`,
          type: 'nutrition',
          date: firstEntry.date,
          icon: 'i-heroicons-cake',
          color: 'green',
          title: `Nutrition (${entries.length} meals)`,
          description: description.join(' • '),
          link: `/nutrition/${firstEntry.id}`
        })
      }
    })
    
    // Add wellness entries
    wellness.forEach(entry => {
      const description = []
      
      if (entry.hrv && entry.hrv > 0) {
        description.push(`HRV ${Math.round(entry.hrv)} ms`)
      }
      if (entry.restingHr && entry.restingHr > 0) {
        description.push(`RHR ${Math.round(entry.restingHr)} bpm`)
      }
      if (entry.sleepQuality) {
        description.push(`Sleep: ${entry.sleepQuality}/10`)
      }
      if (entry.stress) {
        description.push(`Stress: ${entry.stress}/10`)
      }
      
      if (description.length > 0) {
        timelineItems.push({
          id: `wellness-${entry.id}`,
          type: 'wellness',
          date: entry.date,
          icon: 'i-heroicons-heart',
          color: 'red',
          title: 'Wellness Check',
          description: description.join(' • '),
          link: `/fitness/${entry.id}`
        })
      }
    })
    
    // Sort all items by date (most recent first)
    timelineItems.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    
    return {
      success: true,
      count: timelineItems.length,
      items: timelineItems
    }
    
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch recent activity'
    })
  }
})