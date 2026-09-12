import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Bell, ClipboardList, CalendarDays, ListTodo, Check, X as XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Notification, NoteStatus, Presence } from '@/types'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { useMyInbox, myRecipientOf, threadHasUnseen } from '@/lib/userScope'
import { actorKey, relativeTime } from '@/lib/identity'
import { ActorLine, useResolveActor } from '@/components/identity'
import { NOTE_KIND_LABELS } from '@/data/reference'
import { MiniCalendar } from '@/components/MiniCalendar'
import { Badge, Button, Card, EmptyState, Sheet, cx } from '@/ui/primitives'

/** Fixed tints (not remapped in dark mode) so presence reads correctly in both themes. */
const PRESENCE_DOT: Record<Presence, string> = {
  active: 'bg-emerald-500',
  busy: 'bg-amber-500',
  away: 'bg-slate-400',
  closed: 'bg-rose-500',
}

const PRESENCE_KEY: Record<Presence, string> = {
  active: 'presenceActive',
  busy: 'presenceBusy',
  away: 'presenceAway',
  closed: 'presenceClosed',
}

const PRESENCE_ORDER: Presence[] = ['active', 'busy', 'away', 'closed']

const STATUS_TONE: Record<NoteStatus, 'slate' | 'green' | 'amber' | 'red' | 'teal'> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  clarify: 'teal',
  closed: 'slate',
}

/**
 * USER-LEVEL activity bar at the top of Home — aggregates, across the personal
 * account AND every owned virtual: unread messages, non-reacted received notes,
 * sender-side open notes (pending), accepted-not-closed duties, a calendar of
 * dated items, and the signed-in person's presence. Each button opens a filtered
 * list; acting on an item drops it from the list.
 */
export function StatusBar() {
  const { t, lang, isRtl } = useLang()
  const navigate = useNavigate()
  const inbox = useMyInbox()
  const resolve = useResolveActor()

  const messages = useStore((s) => s.messages)
  const markRead = useStore((s) => s.markRead)
  const respondNotification = useStore((s) => s.respondNotification)
  const presence = useStore((s) => s.myPresence())
  const setPresence = useStore((s) => s.setPresence)

  const [sheet, setSheet] = useState<null | 'messages' | 'notes' | 'pending' | 'duties' | 'calendar' | 'status'>(null)
  const close = () => setSheet(null)

  const keys = inbox.keys
  const unreadMsgs = useMemo(
    () =>
      messages
        .filter(
          (m) =>
            (m.to.some((r) => keys.has(actorKey(r))) ||
              (m.cc ?? []).some((r) => keys.has(actorKey(r))) ||
              (m.bcc ?? []).some((r) => keys.has(actorKey(r)))) &&
            !keys.has(actorKey(m.from)) &&
            !m.readBy.some((k) => keys.has(k)) &&
            !(m.deletedBy ?? []).some((k) => keys.has(k)),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [messages, keys],
  )

  const goNote = () => {
    close()
    navigate('/notifications')
  }

  return (
    <>
      <Card className="grid grid-cols-6 gap-0.5 p-1.5">
        <Cell icon={<Mail size={20} />} label={t('messages')} count={unreadMsgs.length} onClick={() => setSheet('messages')} />
        <Cell icon={<Bell size={20} />} label={t('notification')} count={inbox.nonReactedNotes.length} onClick={() => setSheet('notes')} />
        <Cell
          icon={<ClipboardList size={20} />}
          label={t('pending')}
          count={inbox.senderPending.length}
          dot={inbox.senderUnread > 0}
          onClick={() => setSheet('pending')}
        />
        <Cell icon={<ListTodo size={20} />} label={t('duties')} count={inbox.myDuties.length} onClick={() => setSheet('duties')} />
        <Cell icon={<CalendarDays size={20} />} label={t('calendar')} onClick={() => setSheet('calendar')} />
        <Cell
          icon={
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className={cx('h-3.5 w-3.5 rounded-full', PRESENCE_DOT[presence])} />
            </span>
          }
          label={t('status')}
          onClick={() => setSheet('status')}
        />
      </Card>

      {/* Unread messages */}
      <Sheet open={sheet === 'messages'} onClose={close} title={t('messages')}>
        {unreadMsgs.length === 0 ? (
          <EmptyState title={t('messages')} subtitle={t('noUnread')} />
        ) : (
          <div className="space-y-2 py-1">
            {unreadMsgs.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => markRead(m.id)}
                className="flex w-full items-start gap-2 rounded-2xl border border-slate-100 p-3 text-start transition hover:bg-slate-50"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{m.subject}</div>
                  <div className="truncate text-xs text-slate-500">{resolve(m.from).displayName}</div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{m.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">{relativeTime(m.createdAt, lang)}</span>
              </button>
            ))}
          </div>
        )}
      </Sheet>

      {/* Non-reacted received notes — quick react */}
      <Sheet open={sheet === 'notes'} onClose={close} title={t('notification')}>
        {inbox.nonReactedNotes.length === 0 ? (
          <EmptyState title={t('notification')} subtitle={t('noUnread')} />
        ) : (
          <div className="space-y-2 py-1">
            {inbox.nonReactedNotes.map((n) => {
              const rc = myRecipientOf(n, keys)
              const rk = rc ? actorKey(rc.ref) : ''
              return (
                <div key={n.id} className="rounded-2xl border border-slate-100 p-3">
                  <NoteRowHeader note={n} lang={lang} onOpen={goNote} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => respondNotification(n.id, rk, 'accepted')}>
                      <Check size={14} /> {t('accept')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => respondNotification(n.id, rk, 'rejected')}>
                      <XIcon size={14} /> {t('reject')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={goNote}>
                      {t('open')}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Sheet>

      {/* Sender-side open notes */}
      <Sheet open={sheet === 'pending'} onClose={close} title={t('pending')}>
        <NoteList
          notes={inbox.senderPending.map((n) => ({
            note: n,
            dot: (n.recipients ?? []).some((rc) => threadHasUnseen(rc, keys)),
          }))}
          emptyLabel={t('pending')}
          onOpen={goNote}
          lang={lang}
          isRtl={isRtl}
          showStatus
        />
      </Sheet>

      {/* Accepted-not-closed duties */}
      <Sheet open={sheet === 'duties'} onClose={close} title={t('duties')}>
        <NoteList notes={inbox.myDuties.map((n) => ({ note: n, dot: false }))} emptyLabel={t('duties')} onOpen={goNote} lang={lang} isRtl={isRtl} showStatus />
      </Sheet>

      <Sheet open={sheet === 'calendar'} onClose={close} title={t('calendar')}>
        <MiniCalendar items={inbox.datedItems} />
      </Sheet>

      <Sheet open={sheet === 'status'} onClose={close} title={t('status')}>
        <div className="space-y-1.5 py-1">
          {PRESENCE_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPresence(p)
                close()
              }}
              className={cx(
                'flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition',
                presence === p
                  ? 'border-gate-300 bg-gate-50/60 ring-1 ring-gate-200'
                  : 'border-slate-100 bg-white hover:bg-slate-50',
              )}
            >
              <span className={cx('h-3 w-3 shrink-0 rounded-full', PRESENCE_DOT[p])} />
              <span className="flex-1 text-sm font-medium text-slate-800">{t(PRESENCE_KEY[p])}</span>
              {presence === p && <Check size={18} className="shrink-0 text-gate-600" />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

function NoteRowHeader({ note, lang, onOpen }: { note: Notification; lang: 'en' | 'ar'; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full text-start">
      <div className="flex items-center gap-2">
        <Badge tone="gate">{bl(NOTE_KIND_LABELS[note.kind], lang)}</Badge>
        <span className="ms-auto text-[10px] text-slate-400">{relativeTime(note.createdAt, lang)}</span>
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-800">{note.subject}</div>
      <div className="mt-0.5">
        <ActorLine actor={note.from} size={24} />
      </div>
    </button>
  )
}

function NoteList({
  notes,
  emptyLabel,
  onOpen,
  lang,
  isRtl,
  showStatus,
}: {
  notes: { note: Notification; dot: boolean }[]
  emptyLabel: string
  onOpen: () => void
  lang: 'en' | 'ar'
  isRtl: boolean
  showStatus?: boolean
}) {
  if (notes.length === 0) return <EmptyState title={emptyLabel} subtitle={isRtl ? 'لا يوجد شيء.' : 'Nothing here.'} />
  return (
    <div className="space-y-2 py-1">
      {notes.map(({ note, dot }) => (
        <button
          key={note.id}
          type="button"
          onClick={onOpen}
          className="flex w-full items-start gap-2 rounded-2xl border border-slate-100 p-3 text-start transition hover:bg-slate-50"
        >
          {dot && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge tone="gate">{bl(NOTE_KIND_LABELS[note.kind], lang)}</Badge>
              <span className="ms-auto text-[10px] text-slate-400">{relativeTime(note.createdAt, lang)}</span>
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-800">{note.subject}</div>
            {showStatus && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(note.recipients ?? []).map((rc) => (
                  <Badge key={actorKey(rc.ref)} tone={STATUS_TONE[rc.status]}>
                    {rc.status}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function Cell({
  icon,
  label,
  count,
  dot,
  onClick,
}: {
  icon: ReactNode
  label: string
  count?: number
  dot?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
    >
      <span className="relative text-gate-600">
        {icon}
        {count != null && count > 0 && (
          <span className="absolute -top-2 -end-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-light">
            {count > 99 ? '99+' : count}
          </span>
        )}
        {dot && (count == null || count === 0) && (
          <span className="absolute -top-1 -end-1 h-2 w-2 rounded-full bg-rose-500" />
        )}
      </span>
      <span className="truncate text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}
