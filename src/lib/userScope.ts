import { useMemo } from 'react'
import { useStore } from '@/store'
import { actorKey } from '@/lib/identity'
import type { ActorRef, Message, Notification, NoteRecipient } from '@/types'

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
