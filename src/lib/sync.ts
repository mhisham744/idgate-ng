import { useStore } from '@/store'

/**
 * Cross-device shared-world sync (Strategy edition).
 *
 * The app persists its whole state to each device's localStorage, so two devices
 * that open the same URL diverge. This controller keeps them consistent by syncing
 * the shared data slices through /api/state (Upstash Redis, single shared doc):
 *   • on load: pull the shared world and apply it (or seed it if empty);
 *   • poll every few seconds and apply anything newer;
 *   • push local changes (debounced), last-write-wins by server revision.
 *
 * Device-local bits are intentionally NOT synced: which account you're signed in
 * as (`active`/`normalId`) and binary blobs (photos / CV previews) — those are kept
 * out of the payload to stay small, and a device's own uploaded CV/photo is
 * preserved across incoming syncs so it stays openable locally.
 */

const ENDPOINT = '/api/state'
const POLL_MS = 4000
const DEBOUNCE_MS = 800

// Device-local session keys — never synced.
const LOCAL_KEYS = new Set(['active', 'normalId'])
// Binary-bearing slices whose local blobs we re-attach by id after a remote apply.
type Store = ReturnType<typeof useStore.getState>

let started = false
let enabled = true
let localRev = 0
let applyingRemote = false
let lastSerialized = ''
let pushTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

/** Recursively drop binary preview fields so the shared payload stays small. */
function stripBinaries(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripBinaries)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v)) {
      if (k === 'dataUrl' || k === 'photo' || k === 'image') continue
      out[k] = stripBinaries(val)
    }
    return out
  }
  return v
}

/** The shared snapshot: every serializable data slice except device-local session. */
function snapshot(): Record<string, unknown> {
  const s = useStore.getState() as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, val] of Object.entries(s)) {
    if (typeof val === 'function' || LOCAL_KEYS.has(k)) continue
    out[k] = val
  }
  return stripBinaries(out) as Record<string, unknown>
}

/** Re-attach this device's locally-held binaries (photo / CV / post image / credential photo). */
function keepLocalBinaries(remote: Record<string, any>): Record<string, any> {
  const local = useStore.getState() as any
  const byId = <T extends { id: string }>(arr?: T[]) => new Map((arr ?? []).map((x) => [x.id, x]))
  const out: Record<string, any> = { ...remote }

  if (Array.isArray(remote.normals)) {
    const prev = byId<any>(local.normals)
    out.normals = remote.normals.map((n: any) => {
      const p = prev.get(n.id)
      if (!p) return n
      const merged = { ...n }
      if (p.photo && !n.photo) merged.photo = p.photo
      if (p.career?.cv?.dataUrl && n.career?.cv && !n.career.cv.dataUrl)
        merged.career = { ...n.career, cv: { ...n.career.cv, dataUrl: p.career.cv.dataUrl } }
      return merged
    })
  }
  if (Array.isArray(remote.posts)) {
    const prev = byId<any>(local.posts)
    out.posts = remote.posts.map((p: any) => (prev.get(p.id)?.image && !p.image ? { ...p, image: prev.get(p.id).image } : p))
  }
  if (Array.isArray(remote.credentials)) {
    const prev = byId<any>(local.credentials)
    out.credentials = remote.credentials.map((c: any) => (prev.get(c.id)?.photo && !c.photo ? { ...c, photo: prev.get(c.id).photo } : c))
  }
  return out
}

function applyRemote(data: Record<string, any> | null) {
  if (!data) return
  applyingRemote = true
  try {
    const merged = keepLocalBinaries(data)
    useStore.setState(merged as Partial<Store>)
    // Land a fresh second device inside the app: shared world says onboarded but
    // this device isn't signed in as anyone yet.
    const s = useStore.getState() as any
    if (s.onboarded && !s.active && Array.isArray(s.normals) && s.normals.length > 0) {
      try { s.signIn?.(s.normals[0].id) } catch { /* ignore */ }
    }
    lastSerialized = JSON.stringify(snapshot())
  } finally {
    applyingRemote = false
  }
}

async function pull(): Promise<{ rev: number; data: Record<string, any> | null } | null> {
  try {
    const r = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } })
    const ct = r.headers.get('content-type') ?? ''
    if (!r.ok || !ct.includes('application/json')) return null
    return (await r.json()) as { rev: number; data: Record<string, any> | null }
  } catch {
    return null
  }
}

async function push() {
  if (!enabled || applyingRemote) return
  const snap = snapshot()
  const serialized = JSON.stringify(snap)
  if (serialized === lastSerialized) return // nothing meaningful changed
  try {
    const r = await fetch(ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: snap }),
    })
    if (!r.ok) return
    const { rev } = (await r.json()) as { rev: number }
    localRev = rev
    lastSerialized = serialized
  } catch {
    /* offline — keep working locally, will push on the next change */
  }
}

/** Start syncing. Safe to call once; returns a cleanup function. */
export function startSync(): () => void {
  if (started) return () => {}
  started = true

  void (async () => {
    const remote = await pull()
    if (remote == null) {
      enabled = false // no /api (static build) or offline → local-only, silently
      return
    }
    if (remote.data && Object.keys(remote.data).length > 0) {
      localRev = remote.rev
      applyRemote(remote.data)
    } else {
      // Empty shared world → seed it from this device's current state.
      await push()
    }

    // Push local changes (debounced).
    useStore.subscribe(() => {
      if (!enabled || applyingRemote) return
      if (pushTimer) clearTimeout(pushTimer)
      pushTimer = setTimeout(push, DEBOUNCE_MS)
    })

    // Pull remote changes.
    pollTimer = setInterval(async () => {
      if (!enabled) return
      const r = await pull()
      if (r && r.data && r.rev > localRev) {
        localRev = r.rev
        applyRemote(r.data)
      }
    }, POLL_MS)
  })()

  return () => {
    if (pushTimer) clearTimeout(pushTimer)
    if (pollTimer) clearInterval(pollTimer)
    started = false
  }
}
