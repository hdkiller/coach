export function useCoachingMessageAthlete() {
  const router = useRouter()

  function messageAthlete(athlete: { id?: string; name?: string | null; email?: string | null }) {
    const athleteName = athlete.name || athlete.email || 'this athlete'
    const idPart = athlete.id ? ` (id: ${athlete.id})` : ''
    const initialMessage = `I'd like to discuss athlete ${athleteName}${idPart}. What should we focus on?`

    void router.push({
      path: '/chat',
      query: { initialMessage }
    })
  }

  return { messageAthlete }
}
