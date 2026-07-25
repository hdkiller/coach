import { getQuery, getRequestURL } from 'h3'
import {
  normalizeReferralCode,
  normalizeReferralSource,
  setReferralViaCookie
} from '../utils/referrals'

/**
 * Persist personal referral codes across OAuth for /join and related signup entry points.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  if (path !== '/join' && !path.startsWith('/join/')) {
    return
  }

  const query = getQuery(event)
  const code = normalizeReferralCode(query.via)
  if (!code) return

  const source = normalizeReferralSource(query.utm_medium ?? query.source)
  setReferralViaCookie(event, code, source)
})
