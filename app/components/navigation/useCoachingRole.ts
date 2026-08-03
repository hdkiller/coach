export interface CoachingRoleSignals {
  /** Active coaching relationships where the current user is the coach. */
  coachedAthletesCount: number
  /** Pending requests where the current user is being asked to coach someone. */
  pendingCoachRequestsCount: number
  /** Active coaching relationships where the current user is the athlete. */
  ownCoachesCount: number
}

export interface CoachingRoleResult {
  /** The user actively coaches at least one athlete, or has a pending request to. */
  isCoachForAnyone: boolean
  /**
   * CW-103: the user is connected to at least one coach of their own, but has
   * never coached anyone themselves. Brand-new users with no coaching
   * relationships at all (neither as coach nor as athlete) are NOT considered
   * pure athletes here, so the "Add Athlete" onboarding path stays reachable.
   */
  isPureAthlete: boolean
  /** Whether the full coach-oriented nav suite should be shown. */
  showFullCoachingSuite: boolean
}

/**
 * Pure decision logic for CW-103: decide whether the sidebar/coaching pages
 * should render the full coach-oriented suite (Overview, Calendar, Athletes,
 * Analytics, My Coaches) or the simplified athlete view ("My Coaches" only).
 *
 * Kept side-effect free and independent from data fetching so it can be unit
 * tested without a Nuxt runtime. See `useCoachingRole` below for the wiring.
 */
export function resolveCoachingRole(signals: CoachingRoleSignals): CoachingRoleResult {
  const isCoachForAnyone = signals.coachedAthletesCount > 0 || signals.pendingCoachRequestsCount > 0
  const isPureAthlete = signals.ownCoachesCount > 0 && !isCoachForAnyone

  return {
    isCoachForAnyone,
    isPureAthlete,
    showFullCoachingSuite: !isPureAthlete
  }
}

/**
 * Nuxt composable wiring `resolveCoachingRole` to the existing coaching
 * endpoints (`/api/coaching/athletes`, `/api/coaching/athletes/requests`,
 * `/api/coaching/coaches` - all already used elsewhere in the app). Fetches
 * run client-side only (`server: false`) so they never block SSR/navigation,
 * and are cached by key so they execute once per session rather than on
 * every route change.
 */
export function useCoachingRole() {
  const { data: coachedAthletes } = useLazyFetch<any[], Error, string & {}>(
    '/api/coaching/athletes',
    {
      server: false,
      default: () => [],
      key: 'nav-coaching-role-athletes'
    }
  )

  const { data: pendingCoachRequests } = useLazyFetch<any[], Error, string & {}>(
    '/api/coaching/athletes/requests',
    {
      server: false,
      default: () => [],
      key: 'nav-coaching-role-pending-requests'
    }
  )

  const { data: ownCoaches } = useLazyFetch<any[], Error, string & {}>('/api/coaching/coaches', {
    server: false,
    default: () => [],
    key: 'nav-coaching-role-own-coaches'
  })

  const role = computed(() =>
    resolveCoachingRole({
      coachedAthletesCount: Array.isArray(coachedAthletes.value) ? coachedAthletes.value.length : 0,
      pendingCoachRequestsCount: Array.isArray(pendingCoachRequests.value)
        ? pendingCoachRequests.value.length
        : 0,
      ownCoachesCount: Array.isArray(ownCoaches.value) ? ownCoaches.value.length : 0
    })
  )

  return {
    isCoachForAnyone: computed(() => role.value.isCoachForAnyone),
    isPureAthlete: computed(() => role.value.isPureAthlete),
    showFullCoachingSuite: computed(() => role.value.showFullCoachingSuite)
  }
}
