import { requireAuth } from '../../utils/auth-guard'
import { handleWellnessPatch } from '../../utils/wellnessPatch'

export default defineEventHandler(handleWellnessPatch)
