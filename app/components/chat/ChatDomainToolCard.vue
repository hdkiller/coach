<script setup lang="ts">
  import { computed, ref } from 'vue'

  interface SummaryStat {
    label: string
    value: string | number
  }

  interface ListItem {
    id?: string
    title: string
    subtitle?: string
    badges?: string[]
    description?: string
  }

  interface DetailRow {
    label: string
    value: string
  }

  const props = defineProps<{
    toolName: string
    args?: Record<string, any>
    response?: any
    status?: 'loading' | 'success' | 'error'
  }>()

  const isExpanded = ref(false)
  const showRaw = ref(false)

  const workoutToolNames = new Set([
    'get_recent_workouts',
    'search_workouts',
    'get_workout_details',
    'get_workout_analysis',
    'analyze_activity',
    'update_workout_notes',
    'update_workout',
    'get_workout_streams',
    'delete_workout'
  ])

  const planningToolNames = new Set([
    'get_planned_workouts',
    'search_planned_workouts',
    'get_current_plan',
    'delete_planned_workout',
    'modify_training_plan_structure'
  ])

  const recommendationToolNames = new Set([
    'recommend_workout',
    'get_recommendation_details',
    'list_pending_recommendations'
  ])

  const nutritionToolNames = new Set([
    'get_nutrition_log',
    'log_nutrition_meal',
    'log_hydration_intake',
    'delete_hydration',
    'delete_nutrition_item',
    'get_fueling_recommendations',
    'get_metabolic_strategy',
    'get_daily_fueling_status',
    'get_meal_recommendations',
    'lock_meal_to_plan'
  ])

  const wellnessToolNames = new Set([
    'get_wellness_metrics',
    'record_wellness_event',
    'get_wellness_events',
    'update_wellness_event',
    'delete_wellness_event'
  ])

  const profileToolNames = new Set([
    'get_user_profile',
    'generate_athlete_profile',
    'update_user_profile',
    'get_sport_settings',
    'update_sport_settings'
  ])

  const availabilityToolNames = new Set([
    'get_training_availability',
    'update_training_availability'
  ])

  const utilityToolNames = new Set(['perform_calculation', 'get_current_time'])

  const payload = computed(() => props.response || {})

  const formatToolName = (name: string) =>
    name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  const formatDateTime = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatDateOnly = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return undefined
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDuration = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return undefined
    if (value >= 3600) {
      const hours = Math.floor(value / 3600)
      const minutes = Math.round((value % 3600) / 60)
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
    if (value >= 60) return `${Math.round(value / 60)} min`
    return `${Math.round(value)} sec`
  }

  const formatBadgeValue = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'number') return `${label} ${Math.round(value)}`
    return `${label} ${value}`
  }

  const asArray = (value: any): any[] => {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items
    return []
  }

  const domain = computed<
    | 'workouts'
    | 'planning'
    | 'recommendations'
    | 'nutrition'
    | 'wellness'
    | 'profile'
    | 'availability'
    | 'utility'
    | 'other'
  >(() => {
    if (workoutToolNames.has(props.toolName)) return 'workouts'
    if (planningToolNames.has(props.toolName)) return 'planning'
    if (recommendationToolNames.has(props.toolName)) return 'recommendations'
    if (nutritionToolNames.has(props.toolName)) return 'nutrition'
    if (wellnessToolNames.has(props.toolName)) return 'wellness'
    if (profileToolNames.has(props.toolName)) return 'profile'
    if (availabilityToolNames.has(props.toolName)) return 'availability'
    if (utilityToolNames.has(props.toolName)) return 'utility'
    return 'other'
  })

  const iconName = computed(() => {
    switch (domain.value) {
      case 'workouts':
        return 'i-heroicons-bolt'
      case 'planning':
        return 'i-heroicons-calendar-days'
      case 'recommendations':
        return 'i-heroicons-light-bulb'
      case 'nutrition':
        return 'i-heroicons-cake'
      case 'wellness':
        return 'i-heroicons-heart'
      case 'profile':
        return 'i-heroicons-user-circle'
      case 'availability':
        return 'i-heroicons-clock'
      case 'utility':
        return 'i-heroicons-calculator'
      default:
        return 'i-heroicons-wrench-screwdriver'
    }
  })

  const accentClass = computed(() => {
    switch (domain.value) {
      case 'workouts':
        return 'text-sky-600 dark:text-sky-300'
      case 'planning':
        return 'text-indigo-600 dark:text-indigo-300'
      case 'recommendations':
        return 'text-amber-600 dark:text-amber-300'
      case 'nutrition':
        return 'text-emerald-600 dark:text-emerald-300'
      case 'wellness':
        return 'text-rose-600 dark:text-rose-300'
      case 'profile':
        return 'text-violet-600 dark:text-violet-300'
      case 'availability':
        return 'text-cyan-600 dark:text-cyan-300'
      case 'utility':
        return 'text-gray-600 dark:text-gray-300'
      default:
        return 'text-primary-600 dark:text-primary-300'
    }
  })

  const hasError = computed(() => {
    return (
      props.status === 'error' ||
      !!payload.value?.error ||
      !!payload.value?.message?.toLowerCase?.().includes('failed')
    )
  })

  const isCancelled = computed(() => {
    const errorMsg = String(payload.value?.error || '')
    const responseMsg = String(payload.value?.message || '')
    return (
      errorMsg.toLowerCase().includes('cancelled') ||
      errorMsg.toLowerCase().includes('declined') ||
      responseMsg.toLowerCase().includes('cancelled') ||
      responseMsg.toLowerCase().includes('declined')
    )
  })

  const summaryText = computed(() => {
    if (props.status === 'loading') return 'Working on this request...'
    if (isCancelled.value)
      return payload.value?.error || payload.value?.message || 'Action cancelled'
    if (hasError.value)
      return payload.value?.error || payload.value?.message || 'Tool execution failed'

    if (typeof payload.value?.message === 'string' && payload.value.message.trim()) {
      return payload.value.message
    }

    switch (props.toolName) {
      case 'get_recent_workouts':
        return `Fetched ${payload.value?.count ?? 0} recent workout${payload.value?.count === 1 ? '' : 's'}.`
      case 'search_workouts':
      case 'get_planned_workouts':
      case 'search_planned_workouts':
        return `Found ${items.value.length} result${items.value.length === 1 ? '' : 's'}.`
      case 'get_current_plan':
        return payload.value?.plan?.summary || 'Current plan loaded.'
      case 'recommend_workout':
        return payload.value?.recommendation?.description || 'Recommendation ready.'
      case 'list_pending_recommendations':
        return `Loaded ${payload.value?.count ?? items.value.length} active recommendation${items.value.length === 1 ? '' : 's'}.`
      case 'get_nutrition_log':
        return `Loaded ${payload.value?.count ?? 0} nutrition day${payload.value?.count === 1 ? '' : 's'}.`
      case 'get_wellness_metrics':
        return `Loaded ${payload.value?.count ?? 0} wellness entr${payload.value?.count === 1 ? 'y' : 'ies'}.`
      case 'get_wellness_events':
        return `Loaded ${payload.value?.count ?? 0} wellness event${payload.value?.count === 1 ? '' : 's'}.`
      case 'get_training_availability':
        return items.value.length > 0
          ? `Loaded ${items.value.length} availability day${items.value.length === 1 ? '' : 's'}.`
          : payload.value?.suggestion || 'Training availability loaded.'
      case 'get_user_profile':
        return 'Profile details loaded.'
      case 'get_sport_settings':
        return `Loaded ${payload.value?.count ?? 0} sport profile${payload.value?.count === 1 ? '' : 's'}.`
      case 'perform_calculation':
        return payload.value?.result !== undefined
          ? `Result: ${payload.value.result}`
          : 'Calculation completed.'
      case 'get_current_time':
        return (
          payload.value?.context_hint || payload.value?.local_formatted || 'Current time loaded.'
        )
      default:
        if (payload.value?.success) return 'Operation completed successfully.'
        if (payload.value?.count !== undefined) return `${payload.value.count} item(s) returned.`
        if (items.value.length > 0) return `${items.value.length} item(s) available.`
        return 'Structured response available.'
    }
  })

  const stats = computed<SummaryStat[]>(() => {
    const response = payload.value
    const values: SummaryStat[] = []

    switch (props.toolName) {
      case 'get_nutrition_log':
        values.push(
          { label: 'Days', value: response.count ?? 0 },
          { label: 'Calories', value: Math.round(response.totals?.calories || 0) },
          { label: 'Protein', value: `${Math.round(response.totals?.protein || 0)} g` },
          { label: 'Carbs', value: `${Math.round(response.totals?.carbs || 0)} g` },
          { label: 'Water', value: `${Math.round(response.totals?.water_ml || 0)} ml` }
        )
        break
      case 'log_nutrition_meal':
        values.push(
          {
            label: 'Items',
            value: Array.isArray(response.current_meal_items)
              ? response.current_meal_items.length
              : 0
          },
          { label: 'Calories', value: Math.round(response.totals?.calories || 0) },
          { label: 'Protein', value: `${Math.round(response.totals?.protein || 0)} g` },
          { label: 'Carbs', value: `${Math.round(response.totals?.carbs || 0)} g` }
        )
        break
      case 'get_wellness_metrics':
      case 'get_wellness_events':
        values.push({ label: 'Entries', value: response.count ?? items.value.length })
        break
      case 'get_recent_workouts':
      case 'get_planned_workouts':
        values.push({ label: 'Count', value: response.count ?? items.value.length })
        break
      case 'get_current_plan':
        values.push(
          { label: 'Days', value: response.plan?.days_planned ?? response.plan?.days?.length ?? 0 },
          { label: 'Workouts', value: response.plan?.workout_count ?? 0 },
          { label: 'TSS', value: response.plan?.total_tss ?? 0 }
        )
        break
      case 'recommend_workout':
        values.push(
          { label: 'Duration', value: `${response.recommendation?.duration_minutes ?? 0} min` },
          { label: 'TSS', value: response.recommendation?.tss ?? 0 }
        )
        break
      case 'list_pending_recommendations':
        values.push({ label: 'Active', value: response.count ?? items.value.length })
        break
      case 'get_sport_settings':
        values.push({ label: 'Profiles', value: response.count ?? 0 })
        break
      case 'get_current_time':
        values.push(
          { label: 'Local time', value: response.local_time || '--:--' },
          { label: 'Timezone', value: response.timezone || 'Unknown' },
          { label: 'Context', value: response.time_of_day || 'n/a' }
        )
        break
      case 'perform_calculation':
        if (response.result !== undefined)
          values.push({ label: 'Result', value: String(response.result) })
        break
      default:
        if (response.count !== undefined) values.push({ label: 'Count', value: response.count })
        if (response.success !== undefined)
          values.push({ label: 'Success', value: response.success ? 'Yes' : 'No' })
    }

    return values.filter(
      (item) => item.value !== undefined && item.value !== null && item.value !== ''
    )
  })

  const items = computed<ListItem[]>(() => {
    const response = payload.value

    if (props.toolName === 'get_recent_workouts') {
      return asArray(response.workouts).map((workout: any) => ({
        id: workout.id,
        title: workout.title || 'Workout',
        subtitle: [workout.date, workout.sport].filter(Boolean).join(' • '),
        badges: [
          formatDuration(workout.duration),
          formatBadgeValue('TSS', workout.tss),
          formatBadgeValue('RPE', workout.rpe),
          workout.intensity || workout.feel
        ].filter(Boolean) as string[]
      }))
    }

    if (props.toolName === 'search_workouts') {
      return asArray(response).map((workout: any) => ({
        id: workout.id,
        title: workout.title || 'Workout',
        subtitle: [workout.date, workout.sport].filter(Boolean).join(' • '),
        badges: [formatDuration(workout.duration), formatBadgeValue('TSS', workout.tss)].filter(
          Boolean
        ) as string[]
      }))
    }

    if (props.toolName === 'get_workout_details') {
      return [
        {
          id: response.id,
          title: response.title || 'Workout details',
          subtitle: [response.date, response.type].filter(Boolean).join(' • '),
          badges: [
            formatDuration(response.durationSec),
            formatBadgeValue('TSS', response.tss),
            formatBadgeValue('IF', response.intensityFactor),
            formatBadgeValue('Score', response.overallScore)
          ].filter(Boolean) as string[],
          description: response.description || response.summary
        }
      ].filter((item) => item.title || item.description)
    }

    if (props.toolName === 'get_workout_analysis') {
      return [
        {
          id: response.id,
          title: response.title || 'Workout analysis',
          subtitle: response.date,
          badges: [
            formatBadgeValue('Overall', response.overallScore),
            formatBadgeValue('Technical', response.technicalScore),
            formatBadgeValue('Effort', response.effortScore),
            formatBadgeValue('Pacing', response.pacingScore)
          ].filter(Boolean) as string[],
          description:
            response.overallQualityExplanation ||
            response.aiAnalysis ||
            response.executionConsistencyExplanation
        }
      ]
    }

    if (props.toolName === 'get_workout_streams') {
      return [
        {
          title: 'Workout streams',
          badges: [
            response.avgPacePerKm ? `Avg pace ${response.avgPacePerKm}` : undefined,
            response.paceVariability ? `Pace var ${response.paceVariability}` : undefined,
            Array.isArray(response.hrZoneTimes)
              ? `${response.hrZoneTimes.length} HR zones`
              : undefined,
            Array.isArray(response.powerZoneTimes)
              ? `${response.powerZoneTimes.length} power zones`
              : undefined
          ].filter(Boolean) as string[],
          description: response.pacingStrategy
            ? `Pacing: ${JSON.stringify(response.pacingStrategy)}`
            : undefined
        }
      ]
    }

    if (props.toolName === 'get_planned_workouts') {
      return asArray(response.workouts).map((workout: any) => ({
        id: workout.id,
        title: workout.title || 'Planned workout',
        subtitle: [workout.date, workout.time, workout.type].filter(Boolean).join(' • '),
        badges: [workout.duration, formatBadgeValue('TSS', workout.tss)].filter(
          Boolean
        ) as string[],
        description: workout.description
      }))
    }

    if (props.toolName === 'search_planned_workouts') {
      return asArray(response).map((workout: any) => ({
        id: workout.id,
        title: workout.title || 'Planned workout',
        subtitle: [workout.date, workout.time, workout.type].filter(Boolean).join(' • '),
        badges: [workout.duration].filter(Boolean) as string[],
        description: workout.description
      }))
    }

    if (props.toolName === 'get_current_plan') {
      return asArray(response.plan?.days).map((day: any, index: number) => {
        const workouts = asArray(day.workouts || day.sessions)
        const firstTitles = workouts
          .map((item: any) => item?.title || item?.name)
          .filter(Boolean)
          .slice(0, 2)
          .join(', ')

        return {
          id: `${day.date || day.day || index}`,
          title: day.day || day.date || `Day ${index + 1}`,
          subtitle: day.date,
          badges: [
            workouts.length > 0
              ? `${workouts.length} workout${workouts.length === 1 ? '' : 's'}`
              : 'Rest / open',
            formatBadgeValue('TSS', day.tss || day.totalTss)
          ].filter(Boolean) as string[],
          description: firstTitles || day.notes || day.summary
        }
      })
    }

    if (props.toolName === 'recommend_workout') {
      return response.recommendation
        ? [
            {
              title: response.recommendation.title || 'Workout recommendation',
              badges: [
                response.recommendation.duration_minutes
                  ? `${response.recommendation.duration_minutes} min`
                  : undefined,
                formatBadgeValue('TSS', response.recommendation.tss)
              ].filter(Boolean) as string[],
              description: response.recommendation.description
            }
          ]
        : []
    }

    if (props.toolName === 'get_recommendation_details') {
      return response && !response.error
        ? [
            {
              id: response.id,
              title: response.title || response.name || 'Recommendation details',
              subtitle: [response.status, response.priority].filter(Boolean).join(' • '),
              badges: [
                response.metric || undefined,
                response.kind || undefined,
                formatBadgeValue('Score', response.score)
              ].filter(Boolean) as string[],
              description: response.description || response.summary || response.rationale
            }
          ]
        : []
    }

    if (props.toolName === 'list_pending_recommendations') {
      return asArray(response.recommendations).map((recommendation: any) => ({
        id: recommendation.id,
        title: recommendation.title || recommendation.name || 'Recommendation',
        subtitle: [recommendation.status, recommendation.priority].filter(Boolean).join(' • '),
        badges: [
          recommendation.metric || undefined,
          recommendation.kind || undefined,
          formatBadgeValue('Score', recommendation.score)
        ].filter(Boolean) as string[],
        description:
          recommendation.description || recommendation.summary || recommendation.rationale
      }))
    }

    if (props.toolName === 'get_nutrition_log') {
      return asArray(response.entries).map((entry: any) => {
        const mealCount = Object.values(entry.meals || {}).reduce((sum: number, meal: any) => {
          return sum + (Array.isArray(meal) ? meal.length : 0)
        }, 0)

        return {
          id: entry.id,
          title: entry.date || 'Nutrition day',
          badges: [
            formatBadgeValue('kcal', entry.macros?.calories),
            formatBadgeValue('P', entry.macros?.protein ? `${entry.macros.protein}g` : undefined),
            formatBadgeValue('C', entry.macros?.carbs ? `${entry.macros.carbs}g` : undefined),
            mealCount > 0 ? `${mealCount} items` : undefined
          ].filter(Boolean) as string[],
          description: entry.ai_analysis
        }
      })
    }

    if (props.toolName === 'log_nutrition_meal') {
      return asArray(response.current_meal_items).map((item: any) => ({
        id: item.id,
        title: item.name || 'Meal item',
        subtitle: formatDateTime(item.logged_at),
        badges: [
          formatBadgeValue('kcal', item.calories),
          formatBadgeValue('P', item.protein ? `${item.protein}g` : undefined),
          formatBadgeValue('C', item.carbs ? `${item.carbs}g` : undefined),
          formatBadgeValue('Water', item.water_ml ? `${item.water_ml}ml` : undefined)
        ].filter(Boolean) as string[],
        description: item.quantity || item.absorptionType
      }))
    }

    if (props.toolName === 'log_hydration_intake') {
      return response
        ? [
            {
              title: 'Hydration updated',
              badges: [
                formatBadgeValue(
                  'Water',
                  `${response.total_water_ml || response.water_ml || response.volume_ml || 0} ml`
                )
              ].filter(Boolean) as string[],
              description: response.date || props.args?.date
            }
          ]
        : []
    }

    if (props.toolName === 'get_wellness_metrics') {
      return asArray(response.metrics).map((metric: any) => ({
        title: metric.date || 'Wellness entry',
        badges: [
          formatBadgeValue('Recovery', metric.recovery?.recovery_score),
          formatBadgeValue('HRV', metric.recovery?.hrv),
          formatBadgeValue('Sleep', metric.sleep?.hours ? `${metric.sleep.hours}h` : undefined),
          formatBadgeValue('Readiness', metric.recovery?.readiness)
        ].filter(Boolean) as string[],
        description: [
          formatBadgeValue('Fatigue', metric.subjective?.fatigue),
          formatBadgeValue('Stress', metric.subjective?.stress),
          formatBadgeValue('Mood', metric.subjective?.mood)
        ]
          .filter(Boolean)
          .join(' • ')
      }))
    }

    if (props.toolName === 'record_wellness_event' || props.toolName === 'update_wellness_event') {
      return response.event
        ? [
            {
              id: response.event.id,
              title: response.event.category || 'Wellness event',
              subtitle: formatDateTime(response.event.timestamp),
              badges: [formatBadgeValue('Severity', response.event.severity)].filter(
                Boolean
              ) as string[],
              description:
                response.remediation || response.analysis?.summary || response.analysis?.rootCause
            }
          ]
        : []
    }

    if (props.toolName === 'get_wellness_events') {
      return asArray(response.events).map((event: any) => ({
        id: event.id,
        title: event.category || 'Wellness event',
        subtitle: [event.event_type, formatDateTime(event.timestamp)].filter(Boolean).join(' • '),
        badges: [formatBadgeValue('Severity', event.severity)].filter(Boolean) as string[],
        description: event.description
      }))
    }

    if (props.toolName === 'get_training_availability') {
      return asArray(response.availability).map((day: any) => ({
        id: String(day.day_of_week ?? day.day),
        title: day.day || 'Day',
        badges: [
          day.morning ? 'Morning' : undefined,
          day.afternoon ? 'Afternoon' : undefined,
          day.evening ? 'Evening' : undefined,
          Array.isArray(day.slots) ? `${day.slots.length} slots` : undefined
        ].filter(Boolean) as string[],
        description: day.notes
      }))
    }

    if (props.toolName === 'update_training_availability') {
      return response.availability
        ? [
            {
              title: response.availability.day || 'Availability updated',
              badges: [
                response.availability.morning ? 'Morning' : undefined,
                response.availability.afternoon ? 'Afternoon' : undefined,
                response.availability.evening ? 'Evening' : undefined,
                Array.isArray(response.availability.slots)
                  ? `${response.availability.slots.length} slots`
                  : undefined
              ].filter(Boolean) as string[]
            }
          ]
        : []
    }

    if (props.toolName === 'get_user_profile') {
      return [
        {
          title: response.name || 'Athlete profile',
          subtitle: [response.city, response.state, response.country].filter(Boolean).join(', '),
          badges: [
            formatBadgeValue('FTP', response.ftp),
            formatBadgeValue('Max HR', response.maxHr),
            formatBadgeValue(
              'Weight',
              response.weight
                ? `${response.weight} ${response.weightUnits || ''}`.trim()
                : undefined
            )
          ].filter(Boolean) as string[],
          description: [response.timezone, response.language, response.aiPersona]
            .filter(Boolean)
            .join(' • ')
        }
      ]
    }

    if (props.toolName === 'get_sport_settings') {
      return asArray(response.profiles).map((profile: any) => ({
        id: profile.id,
        title: profile.name || 'Sport profile',
        subtitle: Array.isArray(profile.sports) ? profile.sports.join(', ') : undefined,
        badges: [
          profile.is_default ? 'Default' : undefined,
          formatBadgeValue('FTP', profile.ftp),
          formatBadgeValue('Max HR', profile.max_hr),
          formatBadgeValue('LTHR', profile.lthr)
        ].filter(Boolean) as string[],
        description: profile.source
      }))
    }

    if (props.toolName === 'update_sport_settings') {
      return response.profile
        ? [
            {
              id: response.profile.id,
              title: response.profile.name || 'Sport profile updated',
              badges: [
                formatBadgeValue('FTP', response.profile.ftp),
                formatBadgeValue('Max HR', response.profile.max_hr)
              ].filter(Boolean) as string[]
            }
          ]
        : []
    }

    if (props.toolName === 'get_current_time' && payload.value?.active_workout) {
      return [
        {
          id: payload.value.active_workout.id,
          title: payload.value.active_workout.title || 'Active workout',
          subtitle: payload.value.active_workout.type,
          badges: [
            payload.value.active_workout.startTime || undefined,
            payload.value.active_workout.endTime
              ? `Ends ${payload.value.active_workout.endTime}`
              : undefined,
            formatBadgeValue(
              'Left',
              payload.value.active_workout.remainingMinutes
                ? `${payload.value.active_workout.remainingMinutes} min`
                : undefined
            )
          ].filter(Boolean) as string[]
        }
      ]
    }

    if (props.toolName === 'perform_calculation' && payload.value?.result !== undefined) {
      return [
        {
          title: String(payload.value.expression || props.args?.expression || 'Expression'),
          badges: [`= ${payload.value.result}`]
        }
      ]
    }

    if (payload.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) {
      const title =
        payload.value.title ||
        payload.value.name ||
        payload.value.category ||
        payload.value.status ||
        formatToolName(props.toolName)

      return [
        {
          title,
          subtitle: formatDateOnly(payload.value.date || payload.value.timestamp),
          description: payload.value.description || payload.value.summary || payload.value.rationale
        }
      ]
    }

    return []
  })

  const detailRows = computed<DetailRow[]>(() => {
    const response = payload.value

    if (props.toolName === 'get_user_profile') {
      return [
        response.height
          ? { label: 'Height', value: `${response.height} ${response.heightUnits || ''}`.trim() }
          : undefined,
        response.restingHr
          ? { label: 'Resting HR', value: `${response.restingHr} bpm` }
          : undefined,
        response.distanceUnits ? { label: 'Distance', value: response.distanceUnits } : undefined,
        response.temperatureUnits
          ? { label: 'Temperature', value: response.temperatureUnits }
          : undefined
      ].filter(Boolean) as DetailRow[]
    }

    if (props.toolName === 'get_current_plan') {
      return [
        response.plan?.week_start
          ? { label: 'Week start', value: response.plan.week_start }
          : undefined,
        response.plan?.week_end ? { label: 'Week end', value: response.plan.week_end } : undefined,
        response.plan?.status ? { label: 'Status', value: response.plan.status } : undefined,
        response.plan?.model_version
          ? { label: 'Model', value: response.plan.model_version }
          : undefined
      ].filter(Boolean) as DetailRow[]
    }

    if (props.toolName === 'get_current_time') {
      return [
        response.local_formatted ? { label: 'Local', value: response.local_formatted } : undefined,
        response.local_date ? { label: 'Date', value: response.local_date } : undefined,
        response.time_of_day ? { label: 'Time of day', value: response.time_of_day } : undefined
      ].filter(Boolean) as DetailRow[]
    }

    if (props.toolName === 'update_user_profile' && Array.isArray(response.updated_fields)) {
      return response.updated_fields.map((field: string) => ({
        label: 'Updated',
        value: field
      }))
    }

    return []
  })

  const rawJson = computed(() => {
    if (payload.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) {
      const { _system_note, ...rest } = payload.value
      return JSON.stringify(rest, null, 2)
    }
    return JSON.stringify(payload.value, null, 2)
  })
</script>

<template>
  <div
    class="my-3 overflow-hidden rounded-lg border"
    :class="
      hasError
        ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
        : isCancelled
          ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
          : 'border-gray-200 bg-white/70 dark:border-gray-800 dark:bg-gray-950/40'
    "
  >
    <button
      type="button"
      class="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50/70 dark:hover:bg-gray-900/30"
      :class="{ 'border-b border-gray-200 dark:border-gray-800': isExpanded }"
      @click="isExpanded = !isExpanded"
    >
      <div class="min-w-0 flex items-start gap-2">
        <UIcon
          :name="
            hasError
              ? 'i-heroicons-exclamation-circle'
              : isCancelled
                ? 'i-heroicons-minus-circle'
                : iconName
          "
          class="mt-0.5 size-5 shrink-0"
          :class="hasError ? 'text-red-500' : isCancelled ? 'text-amber-500' : accentClass"
        />
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ formatToolName(toolName) }}
          </p>
          <p
            class="mt-1 text-xs whitespace-pre-wrap break-words"
            :class="
              hasError
                ? 'text-red-700 dark:text-red-300'
                : isCancelled
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-gray-600 dark:text-gray-300'
            "
          >
            {{ summaryText }}
          </p>
        </div>
      </div>

      <div class="flex items-start gap-2">
        <UBadge
          v-if="status"
          :color="
            hasError
              ? 'error'
              : isCancelled
                ? 'warning'
                : status === 'success'
                  ? 'success'
                  : 'neutral'
          "
          variant="soft"
          size="sm"
          class="shrink-0"
        >
          {{ isCancelled ? 'cancelled' : status }}
        </UBadge>
        <UIcon
          :name="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="mt-0.5 size-4 shrink-0 text-gray-400"
        />
      </div>
    </button>

    <div v-if="isExpanded" class="space-y-4 px-4 py-3">
      <div
        v-if="stats.length > 0"
        class="grid gap-2"
        :class="stats.length > 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'"
      >
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-md border border-gray-200 bg-white/80 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/60"
        >
          <p class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {{ stat.label }}
          </p>
          <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ stat.value }}
          </p>
        </div>
      </div>

      <div v-if="items.length > 0" class="space-y-2">
        <div
          v-for="item in items.slice(0, 5)"
          :key="item.id || item.title"
          class="rounded-md border border-gray-200 bg-white/80 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/60"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ item.title }}
              </p>
              <p v-if="item.subtitle" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ item.subtitle }}
              </p>
            </div>
          </div>

          <div v-if="item.badges?.length" class="mt-2 flex flex-wrap gap-2">
            <UBadge
              v-for="badge in item.badges"
              :key="badge"
              color="neutral"
              variant="soft"
              size="sm"
            >
              {{ badge }}
            </UBadge>
          </div>

          <p
            v-if="item.description"
            class="mt-2 text-xs whitespace-pre-wrap break-words text-gray-600 dark:text-gray-300"
          >
            {{ item.description }}
          </p>
        </div>

        <p v-if="items.length > 5" class="text-xs text-gray-500 dark:text-gray-400">
          Showing 5 of {{ items.length }} items.
        </p>
      </div>

      <div
        v-if="detailRows.length > 0"
        class="rounded-md border border-gray-200 bg-white/80 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/60"
      >
        <div
          v-for="row in detailRows"
          :key="`${row.label}-${row.value}`"
          class="flex items-center justify-between gap-3 py-1 text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">{{ row.label }}</span>
          <span class="text-right text-gray-900 dark:text-gray-100">{{ row.value }}</span>
        </div>
      </div>

      <div class="flex items-center justify-end">
        <button
          type="button"
          class="text-xs font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          @click="showRaw = !showRaw"
        >
          {{ showRaw ? 'Hide raw response' : 'Show raw response' }}
        </button>
      </div>

      <pre
        v-if="showRaw"
        class="max-h-96 overflow-auto rounded-md border border-gray-200 bg-gray-950 px-3 py-3 text-xs text-gray-100 dark:border-gray-800"
      ><code>{{ rawJson }}</code></pre>
    </div>
  </div>
</template>
