import { z } from 'zod'
import { requireAuth } from '../../../../../utils/auth-guard'
import { prisma } from '../../../../../utils/db'
import { resolveCoachPublicProfile } from '../../../../../utils/public-presence'
import { coachingRepository } from '../../../../../utils/repositories/coachingRepository'

const answerSchema = z.object({
  fieldId: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  type: z.enum(['shortText', 'longText', 'singleSelect', 'yesNo']),
  answer: z.union([z.string().max(4000), z.boolean()]).nullable()
})

const requestBodySchema = z.object({
  answers: z.array(answerSchema).max(20).default([])
})

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Coach slug is required.' })
  }

  const athlete = await requireAuth(event)
  const body = requestBodySchema.parse(await readBody(event))

  const coachUser = await prisma.user.findFirst({
    where: {
      AND: [
        { OR: [{ coachProfileSlug: slug }, { publicAuthorSlug: slug }] },
        { OR: [{ coachProfileEnabled: true }, { publicAuthorSlug: { not: null } }] }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      visibility: true,
      publicAuthorSlug: true,
      publicDisplayName: true,
      publicBio: true,
      publicLocation: true,
      publicWebsiteUrl: true,
      publicSocialLinks: true,
      publicCoachingBrand: true,
      coachProfileEnabled: true,
      coachProfileSlug: true,
      coachPublicPage: true
    }
  })

  if (!coachUser) {
    throw createError({ statusCode: 404, message: 'Coach profile not found.' })
  }

  const profile = resolveCoachPublicProfile(coachUser)
  if (profile.startPage?.enabled === false) {
    throw createError({ statusCode: 404, message: 'Coach start page not found.' })
  }

  const configuredFields = profile.startPage.form.fields || []
  const answerMap = new Map(body.answers.map((answer) => [answer.fieldId, answer]))

  for (const field of configuredFields) {
    if (!field.required) continue
    const answer = answerMap.get(field.id)
    const hasValue =
      typeof answer?.answer === 'boolean'
        ? true
        : typeof answer?.answer === 'string' && Boolean(answer.answer.trim())
    if (!hasValue) {
      throw createError({
        statusCode: 400,
        message: `${field.label} is required.`
      })
    }
  }

  const answers = configuredFields.map((field) => {
    const answer = answerMap.get(field.id)
    return {
      fieldId: field.id,
      label: field.label,
      type: field.type,
      answer:
        typeof answer?.answer === 'string'
          ? answer.answer.trim()
          : typeof answer?.answer === 'boolean'
            ? answer.answer
            : null
    }
  })

  const createdRequest = await coachingRepository.createCoachingRequestForAthlete({
    coachId: coachUser.id,
    athleteId: athlete.id,
    answers,
    athleteSnapshot: {
      name: athlete.name,
      email: athlete.email,
      image: athlete.image
    }
  })

  return {
    success: true,
    requestId: createdRequest.id,
    status: createdRequest.status
  }
})
