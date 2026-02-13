import { prisma } from '../db'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

/**
 * Repository for managing OAuth 2.0 applications and related entities.
 */
export const oauthRepository = {
  /**
   * Lists all OAuth applications owned by a specific user.
   */
  async listAppsForUser(userId: string) {
    return prisma.oAuthApp.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        homepageUrl: true,
        logoUrl: true,
        clientId: true,
        redirectUris: true,
        isTrusted: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tokens: true,
            consents: true
          }
        }
      }
    })
  },

  /**
   * Gets a specific OAuth application by ID.
   */
  async getApp(id: string) {
    return prisma.oAuthApp.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  },

  /**
   * Creates a new OAuth application for a user.
   */
  async createApp(
    userId: string,
    data: { name: string; description?: string; homepageUrl?: string; redirectUris: string[] }
  ) {
    // Generate a high-entropy client secret
    const secret = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '')
    const hashedSecret = await bcrypt.hash(secret, 12)

    const app = await prisma.oAuthApp.create({
      data: {
        name: data.name,
        description: data.description,
        homepageUrl: data.homepageUrl,
        redirectUris: data.redirectUris,
        clientSecret: hashedSecret,
        ownerId: userId
      }
    })

    // Return the app along with the raw secret (ONLY ONCE)
    return {
      ...app,
      clientSecret: secret
    }
  },

  /**
   * Updates an existing OAuth application.
   */
  async updateApp(
    id: string,
    userId: string,
    data: {
      name?: string
      description?: string
      homepageUrl?: string
      logoUrl?: string
      redirectUris?: string[]
      webhookSecret?: string | null
    }
  ) {
    // We use updateMany to ensure ownership
    const result = await prisma.oAuthApp.updateMany({
      where: { id, ownerId: userId },
      data
    })

    if (result.count === 0) {
      throw new Error('App not found or you do not have permission to update it')
    }

    return prisma.oAuthApp.findUnique({ where: { id } })
  },

  /**
   * Deletes an OAuth application.
   */
  async deleteApp(id: string, userId: string) {
    const result = await prisma.oAuthApp.deleteMany({
      where: { id, ownerId: userId }
    })

    if (result.count === 0) {
      throw new Error('App not found or you do not have permission to delete it')
    }

    return true
  },

  /**
   * Regenerates the client secret for an application.
   */
  async regenerateSecret(id: string, userId: string) {
    const secret = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '')
    const hashedSecret = await bcrypt.hash(secret, 12)

    const result = await prisma.oAuthApp.updateMany({
      where: { id, ownerId: userId },
      data: {
        clientSecret: hashedSecret
      }
    })

    if (result.count === 0) {
      throw new Error('App not found or you do not have permission to modify it')
    }

    return secret
  },

  /**
   * Regenerates the webhook secret for an application.
   */
  async regenerateWebhookSecret(id: string, userId: string) {
    const secret = 'wh_' + uuidv4().replace(/-/g, '')

    const result = await prisma.oAuthApp.updateMany({
      where: { id, ownerId: userId },
      data: {
        webhookSecret: secret
      }
    })

    if (result.count === 0) {
      throw new Error('App not found or you do not have permission to modify it')
    }

    return secret
  },

  /**
   * Verifies if a client ID and secret match.
   */
  async verifyClient(clientId: string, clientSecret: string) {
    const app = await prisma.oAuthApp.findUnique({
      where: { clientId }
    })

    if (!app) return null

    const isValid = await bcrypt.compare(clientSecret, app.clientSecret)
    return isValid ? app : null
  },

  /**
   * Creates a new authorization code.
   */
  async createAuthCode(data: {
    appId: string
    userId: string
    redirectUri: string
    scopes: string[]
    codeChallenge?: string
    codeChallengeMethod?: string
  }) {
    const crypto = await import('node:crypto')
    const code = crypto.randomBytes(32).toString('hex')

    return prisma.oAuthAuthCode.create({
      data: {
        code,
        appId: data.appId,
        userId: data.userId,
        redirectUri: data.redirectUri,
        scopes: data.scopes,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod || 'S256',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    })
  },

  /**
   * Gets an authorization code by its value.
   */
  async getAuthCode(code: string) {
    return prisma.oAuthAuthCode.findUnique({
      where: { code },
      include: {
        app: true,
        user: true
      }
    })
  },

  /**
   * Deletes an authorization code.
   */
  async deleteAuthCode(code: string) {
    try {
      return await prisma.oAuthAuthCode.delete({
        where: { code }
      })
    } catch (e) {
      return null
    }
  },

  /**
   * Creates a new access token (and refresh token).
   */
  async createToken(data: { appId: string; userId: string; scopes: string[] }) {
    const crypto = await import('node:crypto')
    const accessToken = crypto.randomBytes(32).toString('hex')
    const refreshToken = crypto.randomBytes(32).toString('hex')

    // Create consent if it doesn't exist
    await prisma.oAuthConsent.upsert({
      where: {
        userId_appId: {
          userId: data.userId,
          appId: data.appId
        }
      },
      create: {
        userId: data.userId,
        appId: data.appId,
        scopes: data.scopes
      },
      update: {
        scopes: data.scopes
      }
    })

    return prisma.oAuthToken.create({
      data: {
        accessToken,
        refreshToken,
        appId: data.appId,
        userId: data.userId,
        scopes: data.scopes,
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) // 30 days
      }
    })
  },

  /**
   * Gets an access token by its value.
   */
  async getAccessToken(token: string) {
    return prisma.oAuthToken.findUnique({
      where: { accessToken: token },
      include: {
        user: true,
        app: true
      }
    })
  },

  /**
   * Rotates a refresh token for a new access token.
   */
  async rotateRefreshToken(refreshToken: string) {
    const oldToken = await prisma.oAuthToken.findUnique({
      where: { refreshToken }
    })

    if (
      !oldToken ||
      (oldToken.refreshTokenExpiresAt && oldToken.refreshTokenExpiresAt < new Date())
    ) {
      return null
    }

    const crypto = await import('node:crypto')
    const accessToken = crypto.randomBytes(32).toString('hex')
    const newRefreshToken = crypto.randomBytes(32).toString('hex')

    return prisma.oAuthToken.update({
      where: { id: oldToken.id },
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        lastUsedAt: new Date()
      }
    })
  },

  /**
   * Revokes a token.
   */
  async revokeToken(token: string) {
    // Check if it's access or refresh token
    const byAccess = await prisma.oAuthToken.findUnique({ where: { accessToken: token } })
    if (byAccess) {
      return prisma.oAuthToken.delete({ where: { id: byAccess.id } })
    }
    const byRefresh = await prisma.oAuthToken.findUnique({ where: { refreshToken: token } })
    if (byRefresh) {
      return prisma.oAuthToken.delete({ where: { id: byRefresh.id } })
    }
    return null
  }
}
