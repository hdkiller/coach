import { listPublishedPublicEvents } from '../../utils/public-events'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const includePast =
    query.includePast === '1' || query.includePast === 'true' || query.includePast === true

  const events = await listPublishedPublicEvents({ includePast: Boolean(includePast) })

  return { events }
})
