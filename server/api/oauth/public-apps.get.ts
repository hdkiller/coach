import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['OAuth'],
    summary: 'List Public OAuth Applications',
    description: 'Returns OAuth applications that are marked public.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  logoUrl: { type: 'string', nullable: true },
                  homepageUrl: { type: 'string', nullable: true }
                }
              }
            }
          }
        }
      }
    }
  }
})

export default defineEventHandler(async () => {
  return await prisma.oAuthApp.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      homepageUrl: true,
      createdAt: true
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }]
  })
})
