/**
 * Strategy edition — cryptographic helpers.
 *
 * These power the credential/receipt/tawkeel integrity model. Hashing is REAL
 * SHA-256 via the Web Crypto API (`crypto.subtle`), so "Verify" genuinely detects
 * tampering. Signatures are intentionally SIMULATED (a labelled HMAC-style string
 * over the real hash), not asymmetric PKI — honest demo trust, consistent with the
 * app's already-simulated KYC. Do not present these as legally binding.
 *
 * IMPORTANT: every function that touches `crypto.subtle` is async. The zustand store
 * is synchronous, so callers must compute `{ serial, hash, signature }` in an async
 * component handler and pass the finished strings to a sync store action.
 */

/**
 * Deterministic canonical JSON: object keys sorted recursively so the same logical
 * value always serializes to the same string (a stable hash input). Arrays keep order.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortDeep(value))
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0')
  return out
}

/** SHA-256 of a string → lowercase hex. Async. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

/** Hash any object by canonicalizing it first. Async. */
export async function hashObject(obj: unknown): Promise<string> {
  return sha256Hex(canonicalJSON(obj))
}

/**
 * Simulated signature over a hash. Clearly labelled so it is never mistaken for
 * real PKI; still deterministic and verifiable within the demo.
 */
export async function simulatedSignature(hash: string, signerKey: string): Promise<string> {
  const sig = await sha256Hex(`${hash}|${signerKey}|idgate-demo-sig`)
  return `IDGATE-SIG:v1:${sig.slice(0, 32)}`
}

/** 64-zero genesis hash for the start of a receipt chain. */
export const GENESIS_HASH = '0'.repeat(64)

/** Human-readable serial, e.g. CRD-UNIV-000123. `scope` is an optional short tag. */
export function makeSerial(prefix: string, seq: number, scope = ''): string {
  const tag = scope ? `${scope.toUpperCase()}-` : ''
  return `${prefix}-${tag}${seq.toString().padStart(6, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical hash payloads — SHARED by issue / backfill / verify so the recomputed
// hash matches. Only the content that defines the credential is hashed; mutable
// lifecycle fields (status, revokedAt, hash, signature) are excluded.
// ─────────────────────────────────────────────────────────────────────────────

import type { Credential, Receipt, Tawkeel } from '@/types'

export function credentialPayload(c: Credential): unknown {
  return {
    serial: c.serial,
    credType: c.credType,
    issuer: c.issuer,
    holder: c.holder,
    title: c.title,
    claims: c.claims,
    issuedAt: c.issuedAt,
    validity: c.validity,
  }
}

export function tawkeelPayload(t: Tawkeel): unknown {
  return {
    serial: t.serial,
    grantor: t.grantor,
    grantee: t.grantee,
    subject: t.subject,
    scopeEntityId: t.scopeEntityId ?? null,
    limitAmount: t.limitAmount ?? null,
    limitText: t.limitText ?? null,
    validity: t.validity,
    grantedAt: t.grantedAt,
  }
}

export function receiptPayload(r: Pick<Receipt, 'serial' | 'noteId' | 'recipientKey' | 'signedBy' | 'statement' | 'signedAt' | 'prevHash'>): unknown {
  return {
    serial: r.serial,
    noteId: r.noteId,
    recipientKey: r.recipientKey,
    signedBy: r.signedBy,
    statement: r.statement,
    signedAt: r.signedAt,
    prevHash: r.prevHash,
  }
}

