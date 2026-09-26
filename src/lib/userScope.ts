import { useMemo } from 'react'
import { useStore } from '@/store'
import { actorKey } from '@/lib/identity'
import type { ActorRef, Group, LegalEntity, Message, Notification, NoteRecipient, StructureNode } from '@/types'

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
 * USER-LEVEL aggregation across the signed-in person and ALL their virtual
 * accounts — the single source of truth for the Home status bar.
 */
export function useMyInbox(): MyInbox {
  const normalId = useStore((s) => s.normalId)
  const virtuals = useStore((s) => s.virtuals)
  const messages = useStore((s) => s.messages)
  const notifications = useStore((s) => s.notifications)

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

    return { keys, unreadMessages, nonReactedNotes, senderPending, senderUnread, myDuties, datedItems }
  }, [normalId, virtuals, messages, notifications])
}

// ─────────────────────────────────────────────────────────────────────────────
// Directory — who/what the ACTIVE account can see and communicate with.
// ─────────────────────────────────────────────────────────────────────────────
export interface Directory {
  /** Organizations the account is linked to (normal: via its virtuals; virtual: its own entity). */
  orgs: LegalEntity[]
  /** People the account may reach: accepted contacts + (virtual) same-area active virtuals. */
  people: ActorRef[]
  /** Groups the account is a member of. */
  groups: Group[]
  /** (Virtual only) structure nodes the account is part of. */
  nodes: StructureNode[]
  /** actorKeys of `people` (for gating recipient lists). */
  peopleKeys: Set<string>
}

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
  const groupRecipients = useStore((s) => s.groupRecipients)
  const areaOf = useStore((s) => s.areaOf)

  return useMemo(() => {
    if (!active) return { orgs: [], people: [], groups: [], nodes: [], peopleKeys: new Set<string>() }
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

    // Dedup people, excluding self.
    const seen = new Set<string>()
    const people: ActorRef[] = []
    for (const r of [...contacts, ...areaVirtuals]) {
      const k = actorKey(r)
      if (k !== meKey && !seen.has(k)) {
        seen.add(k)
        people.push(r)
      }
    }

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

    // Scope keys for group membership: normal → person + owned virtuals; virtual → itself.
    const scopeKeys = new Set<string>()
    if (active.kind === 'virtual') scopeKeys.add(`v:${active.virtualId}`)
    else if (normalId) {
      scopeKeys.add(`n:${normalId}`)
      virtualsFor(normalId).forEach((v) => scopeKeys.add(`v:${v.id}`))
    }
    const myGroups = groups.filter((g) => groupRecipients(g.id).some((r) => scopeKeys.has(actorKey(r))))

    // Nodes (virtual only) — the structure nodes the acting virtual is placed in.
    let nodes: StructureNode[] = []
    if (active.kind === 'virtual') {
      const v = virtual(active.virtualId)
      const nodeIds = v ? [v.structure.corporate, v.structure.relation, v.structure.organization, v.structure.geographical] : []
      nodes = nodeIds.filter(Boolean).map((id) => structures.find((n) => n.id === id)).filter(Boolean) as StructureNode[]
    }

    return { orgs, people, groups: myGroups, nodes, peopleKeys: new Set(people.map(actorKey)) }
  }, [active, normalId, entities, virtuals, groups, structures, contactRequests, entity, virtual, virtualsFor, groupRecipients, areaOf])
}
