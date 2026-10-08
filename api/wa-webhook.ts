import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

/**
 * WhatsApp Cloud API webhook.
 *   GET  — Meta's subscription verification (echoes hub.challenge when the token matches).
 *   POST — incoming messages; each is pushed into the sender's Redis thread so the
 *          in-app test screen can poll and display replies.
 *
 * Env: WA_VERIFY_TOKEN (a string you choose and also enter in the Meta dashboard),
 *      plus the Upstash REST vars.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }
    return res.status(403).send('forbidden')
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
      const redis = Redis.fromEnv()
      for (const entry of body?.entry ?? []) {
        for (const change of entry?.changes ?? []) {
          for (const m of change?.value?.messages ?? []) {
            const from = String(m.from ?? '')
            if (!from) continue
            const text = m.text?.body ?? `[${m.type ?? 'message'}]`
            const at = new Date((Number(m.timestamp) || Date.now() / 1000) * 1000).toISOString()
            await redis.lpush(`wa:thread:${from}`, { id: m.id ?? `in_${Date.now()}`, dir: 'in', peer: from, text, at })
            await redis.ltrim(`wa:thread:${from}`, 0, 199)
          }
        }
      }
    } catch {
      /* never 5xx the webhook — Meta would retry-storm */
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
