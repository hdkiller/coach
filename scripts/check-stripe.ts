import { Stripe } from 'stripe'
import * as dotenv from 'dotenv'
dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })

async function check() {
  const subs = await stripe.subscriptions.list({
    customer: 'cus_U0tRyOWysugMAt',
    limit: 1,
    status: 'all'
  })
  if (subs.data.length > 0) {
    const sub = subs.data[0]
    console.log('Status:', sub.status)
    console.log('Pending Update:', JSON.stringify(sub.pending_update, null, 2))
    console.log('Cancel at period end:', sub.cancel_at_period_end)
  } else {
    console.log('No subs found')
  }
}
check()
