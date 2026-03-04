import { NuxtAuthHandler } from '#auth'
import GoogleProvider from 'next-auth/providers/google'
import StravaProvider from 'next-auth/providers/strava'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'
import { getRequestIP, getRequestHeader, defineEventHandler } from 'h3'
import { logAction } from '../../utils/audit'

const adapter = PrismaAdapter(prisma)
const originalLinkAccount = adapter.linkAccount
adapter.linkAccount = (account: any) => {
  const sanitizedAccount = { ...account }
  if (sanitizedAccount.athlete) {
    delete sanitizedAccount.athlete
  }
  return originalLinkAccount!(sanitizedAccount)
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

    // Trigger initial sync (last 365 days)
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

    await tasks.trigger(
      'ingest-intervals',
      {
        userId: user.id,
        startDate,
        endDate
      },
      {
        concurrencyKey: user.id,
        tags: [`user:${user.id}`]
      }
    )
    console.log('Triggered initial Intervals.icu sync')

    // Trigger profile auto-detection
    await tasks.trigger(
      'autodetect-intervals-profile',
      { userId: user.id },
      { concurrencyKey: user.id, tags: [`user:${user.id}`] }
    )
    console.log('Triggered Intervals.icu profile auto-detection')
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

    // Trigger initial sync (last 30 days for Strava initially to be safe, or 365 if we want consistency)
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    await tasks.trigger(
      'ingest-strava',
      {
        userId: user.id,
        startDate,
        endDate
      },
      {
        concurrencyKey: user.id,
        tags: [`user:${user.id}`]
      }
    )
    console.log('Triggered initial Strava sync')
  } catch (error) {
    console.error('Failed to sync Strava integration:', error)
  }
}

export default NuxtAuthHandler({
  adapter,
  providers: [
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
        // Try to get current session to see if we are linking an account
        let currentEmail: string | undefined
        try {
          const event = useEvent()
          const { getServerSession: getSession } = await import('../../utils/session')
          const session = await getSession(event)
          if (session?.user?.email) {
            currentEmail = session.user.email
            console.log(`[Auth] Detected active session for ${currentEmail}, forcing Strava link`)
          }
        } catch (e) {
          // No active session or not in H3 context, ignore
        }

        // Try to find if this athlete already exists in our system via Integration table
        const existingIntegration = await prisma.integration.findFirst({
          where: {
            provider: 'strava',
            externalUserId: profile.id.toString()
          },
          include: { user: true }
        })

        const email =
          currentEmail ||
          existingIntegration?.user?.email ||
          profile.email ||
          `${profile.id}@strava.coachwatts.com`

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
        // Try to get current session to see if we are linking an account
        let currentEmail: string | undefined
        try {
          const event = useEvent()
          const { getServerSession: getSession } = await import('../../utils/session')
          const session = await getSession(event)
          if (session?.user?.email) {
            currentEmail = session.user.email
            console.log(
              `[Auth] Detected active session for ${currentEmail}, forcing Intervals link`
            )
          }
        } catch (e) {
          // No active session or not in H3 context, ignore
        }

        // Similar lookup for Intervals.icu
        const existingIntegration = await prisma.integration.findFirst({
          where: {
            provider: 'intervals',
            externalUserId: profile.id.toString()
          },
          include: { user: true }
        })

        const email =
          currentEmail ||
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
  ],
  secret: process.env.NUXT_AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }: any) {
      console.log(`[Auth] Sign-in attempt for ${user.email} via ${account?.provider}`)

      // Try to get current session
      try {
        const event = useEvent()
        const { getServerSession: getSession } = await import('../../utils/session')
        const session = await getSession(event)

        if (session?.user?.email && user.email !== session.user.email) {
          console.log(
            `[Auth] Session mismatch: logged in as ${session.user.email}, but OAuth says ${user.email}. Forcing merge.`
          )
          // Overriding user.email here is the "secret sauce" to make next-auth link
          // the new account to the CURRENTLY logged in user.
          user.email = session.user.email
        }
      } catch (e) {
        // Not in an active session context, normal login
      }

      return true
    },
    async session({ session, user }: any) {
      if (session.user) {
        ;(session.user as any).id = user.id
        session.user.isAdmin = user.isAdmin || false
        session.user.timezone = user.timezone || null
        session.user.termsAcceptedAt = user.termsAcceptedAt || null
      }
      return session
    }
  },
  events: {
    async createUser({ user }: any) {
      try {
        const trialDays = 7
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

        await prisma.user.update({
          where: { id: user.id },
          data: { trialEndsAt }
        })

        console.log(`[Auth] New user ${user.id} trial set until ${trialEndsAt.toISOString()}`)

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
        // Use useEvent() with experimental.asyncContext: true enabled in nuxt.config.ts
        const event = useEvent()
        const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
        const locale = getRequestHeader(event, 'accept-language')

        // Update User model
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            lastLoginIp: ip
          }
        })

        // Log to AuditLog
        await logAction({
          userId: user.id,
          action: 'USER_LOGIN',
          metadata: {
            locale,
            provider: account?.provider || 'unknown'
          },
          event
        })
      } catch (error) {
        console.error('Failed to update user login info:', error)
      }
    }
  }
})
