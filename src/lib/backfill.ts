import { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { actorKey } from '@/lib/identity'
import { credentialPayload, hashObject, simulatedSignature, tawkeelPayload } from '@/lib/crypto'

/**
 * One-time, idempotent backfill of integrity hashes/signatures for SEEDED
 * credentials and tawkeels. The seed is built synchronously so it cannot compute
 * SHA-256 inline; this effect fills any empty `hash` once, using REAL hashing, so
 * Verify works on seeded data too. Guarded so it only runs when empty hashes exist.
 */
export function useSeedHashBackfill() {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const s = useStore.getState()
    const pendingCreds = s.credentials.filter((c) => !c.hash)
    const pendingTawkeels = s.tawkeels.filter((t) => !t.hash)
    if (!pendingCreds.length && !pendingTawkeels.length) return
    void (async () => {
      for (const c of pendingCreds) {
        const hash = await hashObject(credentialPayload(c))
        const signature = await simulatedSignature(hash, actorKey(c.issuer))
        useStore.getState().updateCredential(c.id, { hash, signature })
      }
      for (const t of pendingTawkeels) {
        const hash = await hashObject(tawkeelPayload(t))
        const signature = await simulatedSignature(hash, actorKey(t.grantor))
        useStore.getState().updateTawkeel(t.id, { hash, signature })
      }
    })()
  }, [])
}
