import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { buildFolderTree } from '../../../utils/folder-utils'
import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../utils/library-access'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const context = getLibraryAccessContext(session.user)
  const scope = parseLibraryScope(getQuery(event).scope, 'athlete')

  const buildPayloadForOwner = async (ownerUserId: string, ownerScope: 'coach' | 'athlete') => {
    const [folders, templates] = await Promise.all([
      prisma.trainingPlanFolder.findMany({
        where: { userId: ownerUserId },
        orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }]
      }),
      prisma.trainingPlan.findMany({
        where: { userId: ownerUserId, isTemplate: true },
        select: { id: true, folderId: true }
      })
    ])

    const directCounts = templates.reduce(
      (acc: Record<string, number>, template: { folderId: string | null }) => {
        if (template.folderId) {
          acc[template.folderId] = (acc[template.folderId] || 0) + 1
        }
        return acc
      },
      {}
    )

    const { tree, flat } = buildFolderTree(folders, directCounts)
    const unfiledCount = templates.filter(
      (template: { folderId: string | null }) => !template.folderId
    ).length

    return {
      ownerScope,
      ownerUserId,
      tree,
      flat: flat.map((folder: any) => ({ ...folder, ownerScope, ownerUserId })),
      counts: {
        total: templates.length,
        unfiled: unfiledCount
      }
    }
  }

  if (scope === 'all' && context.isCoaching) {
    return {
      coach: await buildPayloadForOwner(context.actorUserId, 'coach'),
      athlete: await buildPayloadForOwner(context.effectiveUserId, 'athlete')
    }
  }

  const ownerIds = getReadableLibraryOwnerIds(context, scope)
  const ownerId = ownerIds[0]
  if (!ownerId) {
    throw createError({ statusCode: 400, message: 'Invalid library scope' })
  }
  return await buildPayloadForOwner(ownerId, scope === 'coach' ? 'coach' : 'athlete')
})
