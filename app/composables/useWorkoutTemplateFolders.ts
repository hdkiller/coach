import { useStorage } from '@vueuse/core'

type FolderNode = {
  id: string
  userId: string
  parentId: string | null
  name: string
  order: number
  directCount: number
  subtreeCount: number
  children: FolderNode[]
}

type FolderScope = 'all' | 'unfiled' | string

export function useWorkoutTemplateFolders(storageKey = 'default') {
  const tree = useState<FolderNode[]>('workout-template-folders:tree', () => [])
  const flat = useState<FolderNode[]>('workout-template-folders:flat', () => [])
  const counts = useState<{ total: number; unfiled: number }>(
    'workout-template-folders:counts',
    () => ({
      total: 0,
      unfiled: 0
    })
  )
  const loading = useState('workout-template-folders:loading', () => false)
  const loaded = useState('workout-template-folders:loaded', () => false)

  const selectedScope = useStorage<FolderScope>(
    `workout-template-folders:scope:${storageKey}`,
    'all'
  )
  const expandedFolderIds = useStorage<string[]>(
    `workout-template-folders:expanded:${storageKey}`,
    []
  )

  const expandedSet = computed(() => new Set(expandedFolderIds.value))
  const flatLookup = computed(() =>
    Object.fromEntries(flat.value.map((folder) => [folder.id, folder]))
  )

  const folderPathMap = computed(() => {
    const map: Record<string, FolderNode[]> = {}

    for (const folder of flat.value) {
      const path: FolderNode[] = []
      let current: FolderNode | undefined = folder

      while (current) {
        path.unshift(current)
        current = current.parentId ? flatLookup.value[current.parentId] : undefined
      }

      map[folder.id] = path
    }

    return map
  })

  const selectedFolder = computed(() =>
    selectedScope.value !== 'all' && selectedScope.value !== 'unfiled'
      ? flatLookup.value[selectedScope.value] || null
      : null
  )

  const selectedFolderPath = computed(() =>
    selectedFolder.value ? folderPathMap.value[selectedFolder.value.id] || [] : []
  )

  const selectedFolderLabel = computed(() => {
    if (selectedScope.value === 'all') return 'All workouts'
    if (selectedScope.value === 'unfiled') return 'Unfiled'
    return selectedFolderPath.value.map((folder) => folder.name).join(' / ') || 'All workouts'
  })

  const descendantIdsByFolder = computed(() => {
    const map: Record<string, string[]> = {}

    const visit = (node: FolderNode): string[] => {
      const descendants = [node.id, ...node.children.flatMap(visit)]
      map[node.id] = descendants
      return descendants
    }

    tree.value.forEach(visit)
    return map
  })

  const scopedFolderIds = computed(() => {
    if (selectedScope.value === 'all') return null
    if (selectedScope.value === 'unfiled') return []
    return descendantIdsByFolder.value[selectedScope.value] || []
  })

  async function refreshFolders() {
    loading.value = true
    try {
      const response = await $fetch<any>('/api/library/workout-folders')
      tree.value = response.tree || []
      flat.value = response.flat || []
      counts.value = response.counts || { total: 0, unfiled: 0 }
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function ensureFoldersLoaded() {
    if (!loaded.value && !loading.value) {
      await refreshFolders()
    }
  }

  function setSelectedScope(scope: FolderScope) {
    selectedScope.value = scope
    if (scope !== 'all' && scope !== 'unfiled') {
      expandFolderPath(scope)
    }
  }

  function toggleExpanded(folderId: string) {
    const next = new Set(expandedFolderIds.value)
    if (next.has(folderId)) next.delete(folderId)
    else next.add(folderId)
    expandedFolderIds.value = [...next]
  }

  function expandFolderPath(folderId: string) {
    const path = folderPathMap.value[folderId] || []
    const next = new Set(expandedFolderIds.value)
    path.forEach((folder) => next.add(folder.id))
    expandedFolderIds.value = [...next]
  }

  function clearFolderSelectionIfMissing() {
    if (
      selectedScope.value !== 'all' &&
      selectedScope.value !== 'unfiled' &&
      !flatLookup.value[selectedScope.value]
    ) {
      selectedScope.value = 'all'
    }
  }

  watch(flatLookup, clearFolderSelectionIfMissing, { immediate: true })

  return {
    tree,
    flat,
    counts,
    loading,
    loaded,
    selectedScope,
    selectedFolder,
    selectedFolderLabel,
    selectedFolderPath,
    expandedFolderIds,
    expandedSet,
    scopedFolderIds,
    refreshFolders,
    ensureFoldersLoaded,
    setSelectedScope,
    toggleExpanded,
    expandFolderPath
  }
}
