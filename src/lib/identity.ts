import type {
  ActiveAccount,
  ActorRef,
  LegalEntity,
  NormalCharacter,
  PermissionSet,
  Profile,
  TransactionKey,
  VirtualCharacter,
} from '@/types'

/** Deterministic id generator (no Date.now in hot paths where reproducibility matters). */
let _seq = 1
export function uid(prefix = 'id'): string {
  _seq += 1
  return `${prefix}_${_seq.toString(36)}_${Math.floor(performance.now() % 1e6).toString(36)}`
}

/** A stable string key for an account/actor (used for readBy / reactedBy sets). */
export function actorKey(a: ActorRef | ActiveAccount): string {
  return a.kind === 'normal' ? `n:${a.normalId}` : `v:${a.virtualId}`
}

export function sameActor(a: ActorRef, b: ActorRef): boolean {
  return actorKey(a) === actorKey(b)
}

// ─────────────────────────────────────────────────────────────────────────────
// The virtual-character ADDRESS — IDGate's core artefact.
//
//  Unlinked (4 parts):   <Position>.<Domain>.<OrgType>.<LegalType>
//  Linked   (5 parts):   <First>.<Last>,<Position>@<Domain>.<OrgType>.<LegalType>
//
//  e.g.  Hossam.Fouad,CEO@Nestle.Com.JSC
//        Mohamed.Hisham,Finance Director@Nestle.Com.JSC
// ─────────────────────────────────────────────────────────────────────────────

export function entitySuffix(entity: LegalEntity): string {
  return `${entity.domain}.${entity.orgType}.${entity.legalEntityType}`
}

export function unlinkedAddress(vc: VirtualCharacter, entity: LegalEntity): string {
  return `${vc.positionName}.${entitySuffix(entity)}`
}

export function virtualAddress(
  vc: VirtualCharacter,
  entity: LegalEntity,
  host: NormalCharacter | null | undefined,
): string {
  if (!host || !vc.linkedNormalId) return unlinkedAddress(vc, entity)
  return `${host.firstName}.${host.surname},${vc.positionName}@${entitySuffix(entity)}`
}

/** The personal-account "address" for a natural person: First.Last */
export function personalAddress(n: NormalCharacter): string {
  return `${n.firstName}.${n.surname}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission resolution — a natural person acting AS an account can do a
// transaction if:
//   • personal account: allowed for any transaction where personalCanCreate is true
//     (personal accounts are ungoverned — full personal features), OR
//   • virtual account: at least one of its profiles grants `create` on that tx.
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY: PermissionSet = { create: false, change: false, display: false, delete: false }

export function mergedPermission(
  profiles: Profile[],
  key: TransactionKey,
): PermissionSet {
  return profiles.reduce<PermissionSet>((acc, p) => {
    const ps = p.permissions[key]
    if (!ps) return acc
    return {
      create: acc.create || ps.create,
      change: acc.change || ps.change,
      display: acc.display || ps.display,
      delete: acc.delete || ps.delete,
    }
  }, { ...EMPTY })
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/[\s.]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministic tint palette for avatars. */
export const AVATAR_COLORS = [
  '#3563f0',
  '#0d9488',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#0891b2',
  '#4f46e5',
  '#16a34a',
]

export function colorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function relativeTime(iso: string, lang: 'en' | 'ar'): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (lang === 'ar') {
    if (min < 1) return 'الآن'
    if (min < 60) return `منذ ${min} د`
    if (hr < 24) return `منذ ${hr} س`
    return `منذ ${day} ي`
  }
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  if (hr < 24) return `${hr}h`
  return `${day}d`
}

/** Absolute date, e.g. "8 Sep 2026" (EN) / "٨ سبتمبر ٢٠٢٦" (AR). */
export function formatDate(iso: string, lang: 'en' | 'ar'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}
