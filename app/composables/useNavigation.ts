export const useNavigation = () => {
  const { data } = useAuth()

  // Safe role access with a fallback to FREE
  const role = computed(() => data.value?.user?.role || 'FREE')

  // Tier level checks
  const isFree = computed(() => role.value === 'FREE')

  const isUncoverPlus = computed(() =>
    ['UNCOVER', 'UNLOCK', 'UNLEASH', 'ADMIN'].includes(role.value)
  )

  const isUnlockPlus = computed(() => ['UNLOCK', 'UNLEASH', 'ADMIN'].includes(role.value))

  const isUnleash = computed(() => ['UNLEASH', 'ADMIN'].includes(role.value))

  const isAdmin = computed(() => role.value === 'ADMIN')

  return {
    role,
    isFree,
    isUncoverPlus,
    isUnlockPlus,
    isUnleash,
    isAdmin
  }
}
