export const useDataStatus = () => {
  const { getUserLocalDate } = useFormat()

  const getDaysAgo = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null

    const targetDate = new Date(dateStr)
    const today = getUserLocalDate() // User's local "today" at midnight

    // Normalize both to UTC midnight timestamps for accurate day diff
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    const utcTarget = Date.UTC(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    )

    const diffTime = utcToday - utcTarget
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  const checkWellnessStale = (latestWellnessDate: string | null | undefined) => {
    if (!latestWellnessDate) return { isStale: true, label: 'No Data' }

    const wellnessDateObj = new Date(latestWellnessDate)
    const todayObj = getUserLocalDate()

    // Compare dates only (ignoring time)
    const wellnessDateStr = wellnessDateObj.toISOString().split('T')[0]
    const todayStr = todayObj.toISOString().split('T')[0]

    if (wellnessDateStr === todayStr) return { isStale: false, label: 'Up to Date' }

    const daysAgo = getDaysAgo(latestWellnessDate)
    if (daysAgo !== null && daysAgo < 0) {
      return { isStale: true, label: 'Future date detected' }
    }
    if (daysAgo === 1) return { isStale: true, label: 'Yesterday (Sync Needed)' }

    return { isStale: true, label: `${daysAgo} days old` }
  }

  const checkProfileStale = (
    profileLastUpdated: string | null | undefined,
    latestWorkoutDate?: string | null
  ) => {
    if (!profileLastUpdated) return { isStale: true, label: 'Profile not yet generated' }

    // Check if there are newer workouts since the last profile generation
    if (latestWorkoutDate) {
      const profileDate = new Date(profileLastUpdated).getTime()
      const workoutDate = new Date(latestWorkoutDate).getTime()
      if (workoutDate > profileDate) {
        return { isStale: true, label: 'New workouts found (Regenerate Profile)' }
      }
    }

    // Fallback to time-based staleness (7 days)
    const daysAgo = getDaysAgo(profileLastUpdated)
    if (daysAgo !== null && daysAgo > 7) {
      return { isStale: true, label: `Profile is ${daysAgo} days old (Regenerate recommended)` }
    }

    return { isStale: false, label: 'Profile is up to date' }
  }

  return {
    checkWellnessStale,
    checkProfileStale
  }
}
