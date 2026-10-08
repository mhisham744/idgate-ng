import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

/**
 * Poll endpoint for the in-app WhatsApp test screen: returns the recent message
 * thread (oldest→newest) for a given peer number from Redis.
 */
type Msg = { id: string; dir: 'in' | 'out'; peer: string; text: string; at: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const to = String(req.query.to ?? '').replace(/[^\d]/g, '')
  if (!to) return res.status(200).json({ messages: [] })
  try {
    const redis = Redis.fromEnv()
    const raw = await redis.lrange(`wa:thread:${to}`, 0, 199)
    const messages = raw
      .map((r) => (typeof r === 'string' ? safeParse(r) : (r as Msg)))
      .filter(Boolean)
      .reverse() // stored newest-first; show oldest-first
    return res.status(200).json({ messages })
  } catch {
    return res.status(501).json({ error: 'Message store is not configured.' })
  }
}

function safeParse(s: string): Msg | null {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
