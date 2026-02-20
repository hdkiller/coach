import { Stripe } from 'stripe'
import * as dotenv from 'dotenv'
dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })

async function check() {
  const subs = await stripe.subscriptions.list({
    customer: 'cus_U0tRyOWysugMAt',
    limit: 10,
    status: 'all'
  })
  subs.data.forEach((sub) => {
    console.log(`Sub: ${sub.id}, Status: ${sub.status}, Price: ${sub.items.data[0].price.id}`)
  })
}
check()
