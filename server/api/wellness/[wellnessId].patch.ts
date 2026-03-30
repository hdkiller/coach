import { handleWellnessPatch } from '../../utils/wellnessPatch'

defineRouteMeta({
  openAPI: {
    tags: ['Wellness'],
    summary: 'Update wellness record',
    description:
      'Updates editable fields on a specific wellness record. Fields may be set to null to clear bad data.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'wellnessId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Wellness record ID'
      }
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      404: { description: 'Wellness record not found' },
      409: { description: 'Date conflict' }
    }
  }
})

export default defineEventHandler(async (event) => {
  return handleWellnessPatch(event)
})
