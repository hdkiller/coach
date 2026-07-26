import { z } from 'zod'
import { getCookie, getHeader } from 'h3'
import { prisma } from '../../utils/db'
import { requireAuth } from '../../utils/auth-guard'
import { triggerDeferredProviderIngests } from '../../utils/deferred-provider-ingest'
import { PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '../../../shared/policy-versions'
import {
  aiLanguageForUiLocale,
  isDefaultLanguagePreference,
  LOCALE_COOKIE_NAME,
  resolvePreferredUiLocale
} from '../../../shared/ui-locale'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireAuth(event)

  const body = await readBody(event)
  const { termsVersion, privacyPolicyVersion, healthConsentAccepted, uiLanguage } = body

  if (!termsVersion || !privacyPolicyVersion) {
    throw createError({ statusCode: 400, message: 'Missing version information' })
  }

  if (
    termsVersion !== TERMS_OF_SERVICE_VERSION ||
    privacyPolicyVersion !== PRIVACY_POLICY_VERSION
  ) {
    throw createError({ statusCode: 400, message: 'Outdated policy version' })
  }

  if (healthConsentAccepted !== true) {
    throw createError({ statusCode: 400, message: 'Health consent is required' })
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      uiLanguage: true,
      language: true
    }
  })

  const preferredUiLocale = resolvePreferredUiLocale({
    explicit: uiLanguage,
    cookie: getCookie(event, LOCALE_COOKIE_NAME),
    acceptLanguage: getHeader(event, 'accept-language')
  })

  const shouldAdoptLocale =
    preferredUiLocale != null &&
    isDefaultLanguagePreference(existingUser?.uiLanguage, existingUser?.language)

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      termsAcceptedAt: new Date(),
      healthConsentAcceptedAt: new Date(),
      termsVersion,
      privacyPolicyVersion,
      ...(shouldAdoptLocale
        ? {
            uiLanguage: preferredUiLocale,
            language: aiLanguageForUiLocale(preferredUiLocale)
          }
        : {})
    }
  })

  try {
    await triggerDeferredProviderIngests(user.id)
  } catch (error) {
    console.error('[Consent] Failed to trigger deferred provider ingest:', error)
  }

  return {
    success: true,
    termsAcceptedAt: user.termsAcceptedAt,
    uiLanguage: user.uiLanguage,
    language: user.language
  }
})
