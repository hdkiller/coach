export type FolderRecord = {
  id: string
  userId: string
  parentId: string | null
  name: string
  order: number
  createdAt?: Date
  updatedAt?: Date
}

export type FolderNode = FolderRecord & {
  directCount: number
  subtreeCount: number
  children: FolderNode[]
}

export function buildFolderTree<T extends FolderRecord>(
  folders: T[],
  directCounts: Record<string, number>
) {
  const byParent = new Map<string | null, T[]>()

  for (const folder of folders) {
    const parentId = folder.parentId ?? null
    const siblings = byParent.get(parentId) || []
    siblings.push(folder)
    byParent.set(parentId, siblings)
  }

  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  }

  const buildNode = (folder: T): FolderNode => {
    const children = (byParent.get(folder.id) || []).map(buildNode)
    const directCount = directCounts[folder.id] || 0
    const subtreeCount = directCount + children.reduce((sum, child) => sum + child.subtreeCount, 0)

    return {
      ...folder,
      directCount,
      subtreeCount,
      children
    }
  }

  const roots = (byParent.get(null) || []).map(buildNode)
  const flat = flattenFolders(roots)

  return {
    tree: roots,
    flat
  }
}

export function flattenFolders(nodes: FolderNode[]) {
  const flat: FolderNode[] = []

  const visit = (node: FolderNode) => {
    flat.push(node)
    node.children.forEach(visit)
  }

  nodes.forEach(visit)
  return flat
}

export function collectFolderDescendantIds(folderId: string, folders: FolderNode[]) {
  const descendants: string[] = []

  const visit = (node: FolderNode) => {
    if (node.id === folderId) {
      collect(node)
      return true
    }

    return node.children.some(visit)
  }

  const collect = (node: FolderNode) => {
    descendants.push(node.id)
    node.children.forEach(collect)
  }

  folders.some(visit)
  return descendants
}

export function isFolderDescendant(
  folderId: string,
  potentialAncestorId: string,
  flatFolders: Array<{ id: string; parentId: string | null }>
) {
  let current = flatFolders.find((folder) => folder.id === folderId)

  while (current?.parentId) {
    if (current.parentId === potentialAncestorId) {
      return true
    }

    current = flatFolders.find((folder) => folder.id === current?.parentId)
  }

  return false
}
