import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

/**
 * Send a WhatsApp text message via the WhatsApp Cloud API, and record it in Redis
 * so the in-app test screen can show the conversation. Server-side only — the token
 * never reaches the browser.
 *
 * Env: WA_TOKEN (access token), WA_PHONE_NUMBER_ID, plus Upstash REST vars.
 */
const GRAPH = 'https://graph.facebook.com/v21.0'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const token = process.env.WA_TOKEN
  const phoneId = process.env.WA_PHONE_NUMBER_ID
  if (!token || !phoneId) {
    return res.status(501).json({ error: 'WhatsApp is not configured. Set WA_TOKEN and WA_PHONE_NUMBER_ID in the Vercel project.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const to = String(body.to ?? '').replace(/[^\d]/g, '')
  const text = String(body.text ?? '').trim()
  if (!to || !text) return res.status(400).json({ error: 'Both "to" (number) and "text" are required.' })

  const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  })
  const data = (await r.json().catch(() => ({}))) as any
  if (!r.ok) {
    return res.status(r.status).json({ error: data?.error?.message ?? 'WhatsApp send failed.', detail: data?.error ?? data })
  }

  // Best-effort: record the outbound message in the per-number thread.
  try {
    const redis = Redis.fromEnv()
    const msg = { id: data?.messages?.[0]?.id ?? `out_${Date.now()}`, dir: 'out', peer: to, text, at: new Date().toISOString() }
    await redis.lpush(`wa:thread:${to}`, msg)
    await redis.ltrim(`wa:thread:${to}`, 0, 199)
  } catch {
    /* store optional — send still succeeded */
  }

  return res.status(200).json({ ok: true, id: data?.messages?.[0]?.id })
}
