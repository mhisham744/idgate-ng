import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

/**
 * Shared-state sync endpoint (Strategy edition).
 *
 * The app is otherwise a local-only prototype: zustand `persist` keeps the whole
 * world in each device's localStorage, so two devices diverge. This route backs a
 * SINGLE shared dataset in Upstash Redis so every device that opens the app sees
 * the same data (last-write-wins).
 *
 *   GET    → { rev, data }      (rev 0 / data null when nothing stored yet)
 *   PUT    { data }  → { rev }  (bumps a monotonic revision, stores the snapshot)
 *   DELETE → { rev: 0 }         (clears the shared world — used by in-app reset)
 *
 * Only deployed on Vercel (the static build has no /api). If the Upstash env vars
 * are missing the route returns 503 and the client silently falls back to
 * local-only mode.
 */

// Persist `version` is baked into the key so a future schema bump can't mix
// incompatible snapshots across clients.
const DATA_KEY = 'idgate:shared:v7'
const REV_KEY = 'idgate:shared:rev'

function redisOrNull(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return Redis.fromEnv()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const redis = redisOrNull()
  if (!redis) {
    res.status(503).json({ error: 'sync-unavailable' })
    return
  }
  // No caching — clients poll this for fresh state.
  res.setHeader('Cache-Control', 'no-store')

  try {
    if (req.method === 'GET') {
      const stored = await redis.get<{ rev: number; data: unknown }>(DATA_KEY)
      res.status(200).json(stored ?? { rev: 0, data: null })
      return
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
      const data = body.data
      if (data == null) {
        res.status(400).json({ error: 'missing-data' })
        return
      }
      const rev = await redis.incr(REV_KEY)
      await redis.set(DATA_KEY, { rev, data })
      res.status(200).json({ rev })
      return
    }

    if (req.method === 'DELETE') {
      await redis.del(DATA_KEY)
      await redis.del(REV_KEY)
      res.status(200).json({ rev: 0 })
      return
    }

    res.setHeader('Allow', 'GET, PUT, POST, DELETE')
    res.status(405).json({ error: 'method-not-allowed' })
  } catch (err) {
    res.status(500).json({ error: 'sync-failed', detail: String((err as Error)?.message ?? err) })
  }
}
