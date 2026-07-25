import { NuxtAuthHandler } from '#auth'
import AppleProvider from 'next-auth/providers/apple'
import GoogleProvider from 'next-auth/providers/google'
import StravaProvider from 'next-auth/providers/strava'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'
import { getRequestIP, getRequestHeader } from 'h3'
import { logAction } from '../../utils/audit'
import { DEFAULT_TRIAL_DAYS } from '../../../shared/trial-config'
import {
  triggerInitialProviderIngest,
  userHasHealthConsent
} from '../../utils/deferred-provider-ingest'
import { recordAccountCreated } from '../../utils/product-analytics'
import { isAppleSignInConfigured, resolveAppleClientSecret } from '../../utils/apple-client-secret'
import { attributeReferralFromEvent } from '../../utils/referrals'

async function tryAttributeReferralDuringAuth(userId: string) {
  try {
    const { getRequestEvent } = await import('nitropack/runtime')
    const event = getRequestEvent()
    if (!event) return
    await attributeReferralFromEvent(event, userId)
  } catch (error) {
    console.error('[Auth] Referral attribution skipped during auth event:', error)
  }
}

const adapter = PrismaAdapter(prisma)
const originalLinkAccount = adapter.linkAccount
adapter.linkAccount = (account: any) => {
  const sanitizedAccount = { ...account }
  if (sanitizedAccount.athlete) {
    delete sanitizedAccount.athlete
  }
  return originalLinkAccount!(sanitizedAccount)
}
const originalDeleteSession = adapter.deleteSession
adapter.deleteSession = async (sessionToken: string) => {
  try {
    return await originalDeleteSession!(sessionToken)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return null
    }
    throw error
  }
}

const syncIntervalsIntegration = async (user: any, account: any) => {
  try {
    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'intervals'
        }
      },
      update: {
        accessToken: account.access_token!,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
        externalUserId: account.providerAccountId,
        scope: account.scope,
        lastSyncAt: new Date(),
        syncStatus: 'SUCCESS'
      },
      create: {
        userId: user.id,
        provider: 'intervals',
        accessToken: account.access_token!,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
        externalUserId: account.providerAccountId,
        scope: account.scope,
        syncStatus: 'SUCCESS',
        lastSyncAt: new Date(),
        ingestWorkouts: true
      }
    })
    console.log('Successfully synced Intervals.icu integration')

    if (await userHasHealthConsent(user.id)) {
      await triggerInitialProviderIngest(user.id, 'intervals')
      console.log('Triggered initial Intervals.icu sync')
    } else {
      console.log('[Auth] Deferred Intervals.icu ingest until health consent')
    }
  } catch (error) {
    console.error('Failed to sync Intervals.icu integration:', error)
  }
}

const syncStravaIntegration = async (user: any, account: any) => {
  try {
    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'strava'
        }
      },
      update: {
        accessToken: account.access_token!,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
        externalUserId: account.providerAccountId,
        scope: account.scope,
        lastSyncAt: new Date(),
        syncStatus: 'SUCCESS'
      },
      create: {
        userId: user.id,
        provider: 'strava',
        accessToken: account.access_token!,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
        externalUserId: account.providerAccountId,
        scope: account.scope,
        syncStatus: 'SUCCESS',
        lastSyncAt: new Date(),
        ingestWorkouts: true
      }
    })
    console.log('Successfully synced Strava integration')

    if (await userHasHealthConsent(user.id)) {
      await triggerInitialProviderIngest(user.id, 'strava')
      console.log('Triggered initial Strava sync')
    } else {
      console.log('[Auth] Deferred Strava ingest until health consent')
    }
  } catch (error) {
    console.error('Failed to sync Strava integration:', error)
  }
}

function buildAuthProviders() {
  const providers: any[] = []

  // Sign in with Apple first when configured (App Store Guideline 4.8 / equal prominence).
  if (isAppleSignInConfigured()) {
    const appleClientId = process.env.APPLE_ID || process.env.APPLE_CLIENT_ID
    const appleClientSecret = resolveAppleClientSecret()
    if (appleClientId && appleClientSecret) {
      providers.push(
        // @ts-expect-error - Types mismatch between next-auth versions
        AppleProvider.default({
          clientId: appleClientId,
          clientSecret: appleClientSecret,
          allowDangerousEmailAccountLinking: true,
          profile(profile: any) {
            const nameFromObject =
              profile.name && typeof profile.name === 'object'
                ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
                : null
            const name =
              (typeof profile.name === 'string' ? profile.name : null) ||
              nameFromObject ||
              profile.email?.split('@')[0] ||
              'Athlete'
            // Returning Apple sign-ins may omit email; Account.providerAccountId (sub) is the stable key.
            const email = profile.email || `${profile.sub}@apple.coachwatts.com`
            console.log(`[Auth] Apple profile mapping for ${profile.sub}: using email ${email}`)
            return {
              id: profile.sub,
              name,
              email,
              image: null
            }
          }
        })
      )
    } else {
      console.warn('[Auth] Apple Sign In env present but client secret could not be resolved')
    }
  }

  providers.push(
    // @ts-expect-error - Types mismatch between next-auth versions
    GoogleProvider.default({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    }),
    // @ts-expect-error - Types mismatch between next-auth versions
    StravaProvider.default({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read,activity:read_all,profile:read_all'
        }
      },
      async profile(profile: any) {
        // Try to find if this athlete already exists in our system via Integration table
        const existingIntegration = await prisma.integration.findFirst({
          where: {
            provider: 'strava',
            externalUserId: profile.id.toString()
          },
          include: { user: true }
        })

        const email =
          existingIntegration?.user?.email || profile.email || `${profile.id}@strava.coachwatts.com`

        console.log(`[Auth] Strava profile mapping for ${profile.id}: using email ${email}`)

        return {
          id: profile.id.toString(),
          name: `${profile.firstname} ${profile.lastname}`,
          email,
          image: profile.profile
        }
      },
      allowDangerousEmailAccountLinking: true
    }),
    {
      id: 'intervals',
      name: 'Intervals.icu',
      type: 'oauth',
      authorization: {
        url: 'https://intervals.icu/oauth/authorize',
        params: { scope: 'ACTIVITY:WRITE,CALENDAR:WRITE,WELLNESS:WRITE,SETTINGS:WRITE' }
      },
      token: 'https://intervals.icu/api/oauth/token',
      userinfo: 'https://intervals.icu/api/v1/athlete/0',
      clientId: process.env.INTERVALS_CLIENT_ID,
      clientSecret: process.env.INTERVALS_CLIENT_SECRET,
      client: {
        token_endpoint_auth_method: 'client_secret_post'
      },
      allowDangerousEmailAccountLinking: true,
      async profile(profile: any) {
        // Similar lookup for Intervals.icu
        const existingIntegration = await prisma.integration.findFirst({
          where: {
            provider: 'intervals',
            externalUserId: profile.id.toString()
          },
          include: { user: true }
        })

        const email =
          existingIntegration?.user?.email ||
          profile.email ||
          `${profile.id}@intervals.coachwatts.com`

        console.log(`[Auth] Intervals profile mapping for ${profile.id}: using email ${email}`)

        return {
          id: profile.id,
          name: profile.name,
          email,
          image: profile.profile_medium || profile.profile
        }
      }
    }
  )

  return providers
}

export default NuxtAuthHandler({
  adapter,
  providers: buildAuthProviders(),
  secret: process.env.NUXT_AUTH_SECRET,
  // Apple uses response_mode=form_post. Browsers omit SameSite=Lax cookies on that
  // cross-site POST, which drops the PKCE verifier and fails the callback.
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true
      }
    }
  },
  callbacks: {
    async signIn({ user }: any) {
      const existingUser = user?.id
        ? await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              deactivatedAt: true
            }
          })
        : null

      if (existingUser?.deactivatedAt) {
        return false
      }

      return true
    },
    async session({ session, user }: any) {
      if (session.user) {
        ;(session.user as any).id = user.id
        session.user.isAdmin = user.isAdmin || false
        session.user.timezone = user.timezone || null
        session.user.language = user.language || 'English'
        session.user.uiLanguage = user.uiLanguage || 'en'
        session.user.termsAcceptedAt = user.termsAcceptedAt || null
        session.user.deactivatedAt = user.deactivatedAt || null
      }
      return session
    }
  },
  events: {
    async createUser({ user }: any) {
      try {
        const trialDays = DEFAULT_TRIAL_DAYS
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

        await prisma.user.update({
          where: { id: user.id },
          data: { trialEndsAt }
        })

        console.log(`[Auth] New user ${user.id} trial set until ${trialEndsAt.toISOString()}`)

        await tryAttributeReferralDuringAuth(user.id)

        // Trigger Welcome Email
        await tasks.trigger('send-email', {
          userId: user.id,
          templateKey: 'Welcome',
          eventKey: 'USER_SIGNED_UP_FOLLOWUP',
          audience: 'ENGAGEMENT',
          subject: 'Welcome to Coach Watts!',
          props: {
            name: user.name || 'Athlete',
            unsubscribeUrl: `${process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'}/profile/settings?tab=communication`
          }
        })
      } catch (error) {
        console.error('[Auth] Failed to set user trial period or send welcome email:', error)
      }
    },
    async linkAccount({ user, account }: any) {
      console.log(`[Auth] Linking account: ${account.provider} to user ${user.id} (${user.email})`)

      const accountCount = await prisma.account.count({
        where: { userId: user.id }
      })

      if (accountCount === 1) {
        try {
          await recordAccountCreated(user.id, account.provider)
        } catch (error) {
          console.error('[Auth] Failed to record account_created analytics:', error)
        }
        await tryAttributeReferralDuringAuth(user.id)
      }

      if (account.provider === 'intervals') {
        await syncIntervalsIntegration(user, account)
      }
      if (account.provider === 'strava') {
        await syncStravaIntegration(user, account)
      }
    },
    async signIn({ user, account }: any) {
      if (account?.provider === 'intervals') {
        await syncIntervalsIntegration(user, account)
      }
      if (account?.provider === 'strava') {
        await syncStravaIntegration(user, account)
      }

      // Capture login info
      try {
        // Update User model
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date()
          }
        })

        // Log to AuditLog
        await logAction({
          userId: user.id,
          action: 'USER_LOGIN',
          metadata: {
            provider: account?.provider || 'unknown'
          }
        })
      } catch (error) {
        console.error('Failed to update user login info:', error)
      }
    }
  }
})
