import {
  getPartnerCampaignBySlug,
  getUserRedemptionForCampaign,
  normalizePartnerCampaignSlug,
  toPartnerCampaignPublicView
} from '../../utils/partner-campaigns'
import { getServerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Campaign slug is required' })
  }

  const campaign = await getPartnerCampaignBySlug(slug)
  if (!campaign) {
    throw createError({ statusCode: 404, message: 'Partner campaign not found' })
  }

  const session = await getServerSession(event)
  let userState: {
    authenticated: boolean
    alreadyRedeemed: boolean
    redemptionEndsAt: string | null
  } = {
    authenticated: false,
    alreadyRedeemed: false,
    redemptionEndsAt: null
  }

  if (session?.user?.id) {
    const redemption = await getUserRedemptionForCampaign(session.user.id, campaign.id)
    userState = {
      authenticated: true,
      alreadyRedeemed: Boolean(redemption),
      redemptionEndsAt: redemption?.endsAt.toISOString() ?? null
    }
  }

  return {
    campaign: toPartnerCampaignPublicView(campaign),
    userState,
    slug: normalizePartnerCampaignSlug(slug)
  }
})
