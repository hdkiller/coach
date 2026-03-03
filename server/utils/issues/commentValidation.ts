import { z } from 'zod'
import {
  ISSUE_COMMENT_MAX_LENGTH,
  ISSUE_COMMENT_MAX_LENGTH_LABEL
} from '../../../app/utils/issue-constants'

export const issueCommentContentSchema = z
  .string()
  .trim()
  .min(1, 'Message cannot be empty.')
  .max(
    ISSUE_COMMENT_MAX_LENGTH,
    `Message must be ${ISSUE_COMMENT_MAX_LENGTH_LABEL} characters or fewer.`
  )

export const issueCommentSchema = z.object({
  content: issueCommentContentSchema
})

export const issueAdminCommentSchema = issueCommentSchema.extend({
  type: z.enum(['NOTE', 'MESSAGE']).default('MESSAGE')
})

export function getZodErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message || 'Invalid input.'
}
