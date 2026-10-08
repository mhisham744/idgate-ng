import { useMemo } from 'react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey } from '@/lib/identity'
import { STRUCTURE_LABELS } from '@/data/reference'
import type { ActorRef, Group, LegalEntity, Message, Notification, NoteRecipient, StructureKind, StructureNode } from '@/types'

const STRUCTURE_KINDS: StructureKind[] = ['corporate', 'relation', 'organization', 'geographical']

export interface MyInbox {
  /** Every actorKey the signed-in person acts through (personal + owned virtuals). */
  keys: Set<string>
  /** Unread messages addressed to any of my accounts (excludes ones I sent or hid). */
  unreadMessages: number
  /** Received notes needing a reaction that I haven't reacted to yet (→ Notification button). */
  nonReactedNotes: Notification[]
  /** Notes I sent where at least one recipient hasn't closed yet (→ Pending button). */
  senderPending: Notification[]
  /** Count of my sent notes carrying an unseen recipient reply/status update. */
  senderUnread: number
  /** Received notes I accepted but haven't closed (→ Duties button). */
  myDuties: Notification[]
  /** Notes I sent OR received that carry a target date (feeds the calendar). */
  datedItems: Notification[]
  /** Contact requests I sent that are still pending (→ Pending button). */
  sentPendingContacts: import('@/types').ContactRequest[]
  /** Link requests I sent (I administer the entity) that are still pending (→ Pending button). */
  sentPendingLinks: import('@/types').LinkRequest[]
  /** Incoming contact requests awaiting MY approval (addressed to any owned account). */
  incomingContacts: import('@/types').ContactRequest[]
  /** Incoming link requests awaiting MY approval (targetNormalId === signed-in person). */
  incomingLinks: import('@/types').LinkRequest[]
}

const anyKey = (refs: ActorRef[] | undefined, keys: Set<string>) =>
  !!refs && refs.some((r) => keys.has(actorKey(r)))

/** The recipient entry addressed to one of my accounts (first match), if any. */
export function myRecipientOf(n: Notification, keys: Set<string>): NoteRecipient | undefined {
  return (n.recipients ?? []).find((rc) => keys.has(actorKey(rc.ref)))
}

/** Does one recipient's thread hold an entry authored by someone else that I haven't read? */
export function threadHasUnseen(rc: NoteRecipient, keys: Set<string>): boolean {
  return rc.thread.some(
    (e) => !keys.has(actorKey(e.by)) && !(e.readBy ?? []).some((k) => keys.has(k)),
  )
}

/**
 * The set of actorKeys that count as "me" for the Messages/Notifications SCREENS,
 * driven by the user's `inboxScope` setting:
 *  - 'unified' → personal account + every owned virtual identity (matches the hub).
 *  - 'active'  → only the currently active account.
 * The single source of truth shared by the screens and the tab badges.
 */
export function useInboxScopeKeys(): Set<string> {
  const scope = useStore((s) => s.inboxScope())
  const normalId = useStore((s) => s.normalId)
  const virtuals = useStore((s) => s.virtuals)
  const active = useStore((s) => s.active)

  return useMemo(() => {
    const keys = new Set<string>()
    if (scope === 'active') {
      if (active) keys.add(actorKey(active))
      return keys
    }
    if (normalId) {
      keys.add(`n:${normalId}`)
      virtuals.filter((v) => v.linkedNormalId === normalId).forEach((v) => keys.add(`v:${v.id}`))
    }
    return keys
  }, [scope, normalId, virtuals, active])
}

/**
 * USER-LEVEL aggregation across the signed-in person and ALL their virtual
 * accounts — the single source of truth for the Home status bar.
 */
export function useMyInbox(): MyInbox {
  const normalId = useStore((s) => s.normalId)
  const virtuals = useStore((s) => s.virtuals)
  const messages = useStore((s) => s.messages)
  const notifications = useStore((s) => s.notifications)
  const contactRequests = useStore((s) => s.contactRequests)
  const linkRequests = useStore((s) => s.linkRequests)
  const entities = useStore((s) => s.entities)

  return useMemo(() => {
    const keys = new Set<string>()
    if (normalId) {
      keys.add(`n:${normalId}`)
      virtuals
        .filter((v) => v.linkedNormalId === normalId)
        .forEach((v) => keys.add(`v:${v.id}`))
    }

    const addressedToMe = (m: Message) =>
      anyKey(m.to, keys) || anyKey(m.cc, keys) || anyKey(m.bcc, keys)
    const unreadMessages = messages.filter(
      (m) =>
        addressedToMe(m) &&
        !keys.has(actorKey(m.from)) &&
        !m.readBy.some((k) => keys.has(k)) &&
        !(m.deletedBy ?? []).some((k) => keys.has(k)),
    ).length

    const nonReactedNotes: Notification[] = []
    const senderPending: Notification[] = []
    const myDuties: Notification[] = []
    const datedItems: Notification[] = []
    let senderUnread = 0

    for (const n of notifications) {
      const iAmSender = keys.has(actorKey(n.from))
      const mine = myRecipientOf(n, keys)

      if (mine && n.needsResponse && mine.status === 'pending' && !n.frozen) nonReactedNotes.push(n)
      if (mine && mine.status === 'accepted') myDuties.push(n)

      if (iAmSender) {
        const open = (n.recipients ?? []).some((rc) => rc.status !== 'closed')
        if (open) senderPending.push(n)
        if ((n.recipients ?? []).some((rc) => threadHasUnseen(rc, keys))) senderUnread++
      }

      if ((iAmSender || !!mine) && n.targetDate) datedItems.push(n)
    }

    const sentPendingContacts = contactRequests.filter((c) => c.status === 'pending' && keys.has(actorKey(c.from)))
    const sentPendingLinks = linkRequests.filter((l) => {
      if (l.status !== 'pending') return false
      const e = entities.find((x) => x.id === l.entityId)
      return !!e && (e.adminNormalId === normalId || e.managingDirectorNormalId === normalId)
    })
    const incomingContacts = contactRequests.filter(
      (c) => c.status === 'pending' && keys.has(actorKey(c.to)) && !keys.has(actorKey(c.from)),
    )
    const incomingLinks = linkRequests.filter((l) => l.status === 'pending' && l.targetNormalId === normalId)

    return { keys, unreadMessages, nonReactedNotes, senderPending, senderUnread, myDuties, datedItems, sentPendingContacts, sentPendingLinks, incomingContacts, incomingLinks }
  }, [normalId, virtuals, messages, notifications, contactRequests, linkRequests, entities])
}

// ─────────────────────────────────────────────────────────────────────────────
// Directory — who/what the ACTIVE account can see and communicate with.
// ─────────────────────────────────────────────────────────────────────────────
export interface Directory {
  /** Organizations the account is linked to (normal: via its virtuals; virtual: its own entity). */
  orgs: LegalEntity[]
  /** People the account may reach: accepted contacts + (virtual) same-area active virtuals. */
  people: ActorRef[]
  /** Origin of each person entry: 'manual' (accepted contact request) or 'auto' (same communication area). */
  peopleOrigin: Map<string, 'auto' | 'manual'>
  /** Groups the active account OWNS (created). */
  groups: Group[]
  /** Structure child nodes (level>0) across all entities in the active account's communication area, by kind. */
  structureNodes: Record<StructureKind, StructureNode[]>
  /** actorKeys of `people` (for gating recipient lists). */
  peopleKeys: Set<string>
}

const emptyStructureNodes = (): Record<StructureKind, StructureNode[]> => ({ corporate: [], relation: [], organization: [], geographical: [] })

/**
 * The active account's Directory. Drives the Directory screen AND gates who can
 * receive posts/messages/notifications/tools (only accounts in the directory).
 */
export function useDirectory(): Directory {
  const active = useStore((s) => s.active)
  const normalId = useStore((s) => s.normalId)
  const entities = useStore((s) => s.entities)
  const virtuals = useStore((s) => s.virtuals)
  const groups = useStore((s) => s.groups)
  const structures = useStore((s) => s.structures)
  const contactRequests = useStore((s) => s.contactRequests)
  const entity = useStore((s) => s.entity)
  const virtual = useStore((s) => s.virtual)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const areaOf = useStore((s) => s.areaOf)

  return useMemo(() => {
    if (!active) return { orgs: [], people: [], peopleOrigin: new Map(), groups: [], structureNodes: emptyStructureNodes(), peopleKeys: new Set<string>() }
    const meKey = actorKey(active)

    // Accepted contacts (both directions) → the other party.
    const contacts: ActorRef[] = []
    for (const c of contactRequests) {
      if (c.status !== 'accepted') continue
      if (actorKey(c.from) === meKey) contacts.push(c.to)
      else if (actorKey(c.to) === meKey) contacts.push(c.from)
    }

    // Virtual accounts sharing the acting virtual's communication area.
    const areaVirtuals: ActorRef[] = []
    if (active.kind === 'virtual') {
      const areaId = areaOf(active)
      if (areaId) {
        for (const v of virtuals) {
          if (v.status !== 'active' || v.id === active.virtualId) continue
          if (entity(v.entityId)?.communicationAreaId === areaId) areaVirtuals.push({ kind: 'virtual', virtualId: v.id })
        }
      }
    }

    // Dedup people, excluding self. Contacts first so 'manual' wins when a person is both.
    const peopleOrigin = new Map<string, 'auto' | 'manual'>()
    const seen = new Set<string>()
    const people: ActorRef[] = []
    const add = (r: ActorRef, origin: 'auto' | 'manual') => {
      const k = actorKey(r)
      if (k === meKey || seen.has(k)) return
      seen.add(k)
      people.push(r)
      peopleOrigin.set(k, origin)
    }
    for (const r of contacts) add(r, 'manual')
    for (const r of areaVirtuals) add(r, 'auto')

    // Orgs.
    let orgs: LegalEntity[] = []
    if (active.kind === 'virtual') {
      const v = virtual(active.virtualId)
      const e = v ? entity(v.entityId) : undefined
      orgs = e ? [e] : []
    } else if (normalId) {
      const ids = new Set(virtualsFor(normalId).map((v) => v.entityId))
      orgs = entities.filter((e) => ids.has(e.id))
    }

    // Groups the active account OWNS (created) — not every group it's a member of.
    const myGroups = groups.filter((g) =>
      active.kind === 'virtual' ? g.ownerVirtualId === active.virtualId : g.ownerNormalId === normalId,
    )

    // Structure child nodes across all entities in the active account's communication area.
    const structureNodes = emptyStructureNodes()
    const areaId = active.kind === 'virtual' ? areaOf(active) : undefined
    if (areaId) {
      const entityIds = new Set(entities.filter((e) => e.communicationAreaId === areaId).map((e) => e.id))
      for (const n of structures) {
        if (!entityIds.has(n.entityId) || n.level <= 0) continue
        structureNodes[n.kind].push(n)
      }
    }

    return { orgs, people, peopleOrigin, groups: myGroups, structureNodes, peopleKeys: new Set(people.map(actorKey)) }
  }, [active, normalId, entities, virtuals, groups, structures, contactRequests, entity, virtual, virtualsFor, areaOf])
}

/**
 * Shared recipient sources for the message / notification / assessment composers:
 * directory people as options, plus pickerGroups = real groups ++ structure-node
 * pseudo-groups (id `node:<nodeId>`). expandGroup resolves either kind to refs.
 */
export function useRecipientSources() {
  const dir = useDirectory()
  const active = useStore((s) => s.active)
  const groupRecipients = useStore((s) => s.groupRecipients)
  const nodeRecipients = useStore((s) => s.nodeRecipients)
  const { lang } = useLang()
  const meKey = active ? actorKey(active) : ''

  return useMemo(() => {
    const options = dir.people
    const pickerGroups = [
      ...dir.groups.map((g) => ({ id: g.id, name: g.name, count: groupRecipients(g.id).filter((r) => actorKey(r) !== meKey).length })),
      ...STRUCTURE_KINDS.flatMap((k) => dir.structureNodes[k]).map((n) => ({
        id: `node:${n.id}`,
        name: `${n.name} · ${bl(STRUCTURE_LABELS[n.kind], lang)}`,
        count: nodeRecipients(n.id).filter((r) => actorKey(r) !== meKey).length,
        node: true,
      })),
    ]
    const expandGroup = (id: string): ActorRef[] =>
      id.startsWith('node:')
        ? nodeRecipients(id.slice(5)).filter((r) => actorKey(r) !== meKey)
        : groupRecipients(id).filter((r) => actorKey(r) !== meKey)
    return { options, pickerGroups, expandGroup }
  }, [dir, meKey, groupRecipients, nodeRecipients, lang])
}
