import { formatCompactDuration } from '~/utils/duration'

export const useFormatters = () => {
  const { formatDate: baseFormatDate } = useFormat()

  const formatDuration = (seconds: number) => {
    return formatCompactDuration(seconds)
  }

  const formatDate = (date: string | Date) => {
    if (!date) return ''
    return baseFormatDate(date, 'EEEE, MMMM d, yyyy')
  }

  return {
    formatDuration,
    formatDate
  }
}
