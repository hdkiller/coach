import type { FolderRecord, FolderNode } from './folder-utils'
import {
  buildFolderTree,
  flattenFolders,
  collectFolderDescendantIds,
  isFolderDescendant
} from './folder-utils'

export type WorkoutTemplateFolderRecord = FolderRecord
export type WorkoutTemplateFolderNode = FolderNode

export function buildWorkoutTemplateFolderTree(
  folders: WorkoutTemplateFolderRecord[],
  directCounts: Record<string, number>
) {
  return buildFolderTree(folders, directCounts)
}

export function flattenWorkoutTemplateFolders(nodes: WorkoutTemplateFolderNode[]) {
  return flattenFolders(nodes)
}

export function collectWorkoutTemplateFolderDescendantIds(
  folderId: string,
  folders: WorkoutTemplateFolderNode[]
) {
  return collectFolderDescendantIds(folderId, folders)
}

export function isWorkoutTemplateFolderDescendant(
  folderId: string,
  potentialAncestorId: string,
  flatFolders: Array<{ id: string; parentId: string | null }>
) {
  return isFolderDescendant(folderId, potentialAncestorId, flatFolders)
}
