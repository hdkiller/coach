export type CoachCalendarViewMode = 'week-board' | 'month-grid'
export type CoachCalendarPanel = 'primary' | 'secondary'

function toUtcDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function startOfWeekUtc(date: Date) {
  const normalized = toUtcDate(date)
  const day = normalized.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  normalized.setUTCDate(normalized.getUTCDate() + diffToMonday)
  return normalized
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function useCoachCalendar() {
  const today = startOfWeekUtc(new Date())

  const primaryAthleteId = ref<string | null>(null)
  const secondaryAthleteId = ref<string | null>(null)
  const viewMode = ref<CoachCalendarViewMode>('week-board')
  const isSplitView = ref(false)
  const isNavigationSynced = ref(true)
  const panelDates = ref<Record<CoachCalendarPanel, Date>>({
    primary: new Date(today),
    secondary: new Date(today)
  })
  const activeDropPanel = ref<CoachCalendarPanel>('primary')

  const visibleAthleteIds = computed(() =>
    isSplitView.value
      ? [primaryAthleteId.value, secondaryAthleteId.value].filter(Boolean)
      : [primaryAthleteId.value].filter(Boolean)
  )

  function setPrimaryAthlete(athleteId: string | null) {
    primaryAthleteId.value = athleteId
    if (!isSplitView.value && athleteId === secondaryAthleteId.value) {
      secondaryAthleteId.value = null
    }
  }

  function setSecondaryAthlete(athleteId: string | null) {
    secondaryAthleteId.value = athleteId
  }

  function toggleSplitView() {
    isSplitView.value = !isSplitView.value
    if (!isSplitView.value) {
      secondaryAthleteId.value = null
      isNavigationSynced.value = true
    } else if (isNavigationSynced.value) {
      panelDates.value.secondary = new Date(panelDates.value.primary)
    }
  }

  function swapAthletes() {
    const oldPrimary = primaryAthleteId.value
    primaryAthleteId.value = secondaryAthleteId.value
    secondaryAthleteId.value = oldPrimary

    const oldPrimaryDate = panelDates.value.primary
    panelDates.value.primary = panelDates.value.secondary
    panelDates.value.secondary = oldPrimaryDate
  }

  function setPanelDate(panel: CoachCalendarPanel, date: Date) {
    const normalized =
      viewMode.value === 'week-board' ? startOfWeekUtc(date) : startOfMonthUtc(date)
    panelDates.value[panel] = normalized
    if (isNavigationSynced.value) {
      const otherPanel = panel === 'primary' ? 'secondary' : 'primary'
      panelDates.value[otherPanel] = new Date(normalized)
    }
  }

  function movePanel(panel: CoachCalendarPanel, direction: 1 | -1) {
    const next = new Date(panelDates.value[panel])
    if (viewMode.value === 'week-board') {
      next.setUTCDate(next.getUTCDate() + direction * 7)
    } else {
      next.setUTCMonth(next.getUTCMonth() + direction)
    }
    setPanelDate(panel, next)
  }

  function goToToday(panel?: CoachCalendarPanel) {
    setPanelDate(panel || 'primary', new Date())
  }

  watch(viewMode, (mode) => {
    const nextPrimary =
      mode === 'week-board'
        ? startOfWeekUtc(panelDates.value.primary)
        : startOfMonthUtc(panelDates.value.primary)
    panelDates.value.primary = nextPrimary
    panelDates.value.secondary = isNavigationSynced.value
      ? new Date(nextPrimary)
      : mode === 'week-board'
        ? startOfWeekUtc(panelDates.value.secondary)
        : startOfMonthUtc(panelDates.value.secondary)
  })

  return {
    primaryAthleteId,
    secondaryAthleteId,
    visibleAthleteIds,
    viewMode,
    isSplitView,
    isNavigationSynced,
    panelDates,
    activeDropPanel,
    setPrimaryAthlete,
    setSecondaryAthlete,
    toggleSplitView,
    swapAthletes,
    setPanelDate,
    movePanel,
    goToToday
  }
}
