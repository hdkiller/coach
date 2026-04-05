import coachesHandler from '../coaches/[slug].get'

export default defineEventHandler(async (event) => {
  return coachesHandler(event)
})
