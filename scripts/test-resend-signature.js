import { Webhook } from 'svix'

const secret = 'whsec_TYrvGy9WoWSLcYg0srtdJqiLgiQBu71C'
const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: 'test_id' } })
const svixId = 'msg_' + Math.random().toString(36).substring(2)
const svixTimestamp = new Date()

const wh = new Webhook(secret)
const signature = wh.sign(svixId, svixTimestamp, payload)

console.log(
  JSON.stringify({
    id: svixId,
    timestamp: Math.floor(svixTimestamp.getTime() / 1000).toString(),
    signature: signature,
    payload: payload
  })
)
