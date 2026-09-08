import { useMemo } from 'react'
import { useStore } from '@/store'
import { actorKey } from '@/lib/identity'
import type { ActorRef, Message, Notification } from '@/types'

export interface MyInbox {
  /** Every actorKey the signed-in person acts through (personal + owned virtuals). */
  keys: Set<string>
  /** Unread messages addressed to any of my accounts (excludes ones I sent or hid). */
  unreadMessages: number
  /** Notifications addressed to me that I have not yet opened. */
  unreadNotifications: number
  /** Open actionable notifications (need a response, still pending). */
  pendingActionables: number
  /** Notifications addressed to me that carry a target date (feeds the calendar). */
  datedItems: Notification[]
}

const anyKey = (refs: ActorRef[] | undefined, keys: Set<string>) =>
  !!refs && refs.some((r) => keys.has(actorKey(r)))

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

    const mineNotes = notifications.filter((n) => anyKey(n.to, keys))
    const unreadNotifications = mineNotes.filter(
      (n) => !(n.readBy ?? []).some((k) => keys.has(k)),
    ).length
    const pendingActionables = mineNotes.filter(
      (n) => n.needsResponse && n.status === 'pending',
    ).length
    const datedItems = mineNotes.filter((n) => !!n.targetDate)

    return { keys, unreadMessages, unreadNotifications, pendingActionables, datedItems }
  }, [normalId, virtuals, messages, notifications])
}
