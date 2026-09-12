import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  Check,
  X as XIcon,
  HelpCircle,
  CheckCheck,
  Lock,
  Pencil,
  Search,
  Paperclip,
  FileText,
  Send,
} from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey, formatDate, relativeTime, uid } from '@/lib/identity'
import { ActorLine, useResolveActor } from '@/components/identity'
import { NOTE_KIND_LABELS } from '@/data/reference'
import { RecipientPicker } from '@/components/RecipientPicker'
import type { PickerGroup } from '@/components/RecipientPicker'
import {
  Button,
  Card,
  Badge,
  Field,
  Input,
  Textarea,
  Select,
  EmptyState,
  Sheet,
  cx,
} from '@/ui/primitives'
import type {
  ActorRef,
  ActiveAccount,
  AttachmentMeta,
  NoteKind,
  NoteRecipient,
  NoteStatus,
  NoteThreadEntry,
  Notification,
  TransactionKey,
} from '@/types'

const L = (isRtl: boolean, en: string, ar: string) => (isRtl ? ar : en)

function activeRef(a: ActiveAccount): ActorRef {
  return a
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const STATUS_TONE: Record<NoteStatus, 'slate' | 'green' | 'amber' | 'red' | 'teal'> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  clarify: 'teal',
  closed: 'slate',
}

function statusLabel(s: NoteStatus, isRtl: boolean): string {
  const map: Record<NoteStatus, [string, string]> = {
    pending: ['Pending', 'قيد الانتظار'],
    accepted: ['Accepted', 'مقبول'],
    rejected: ['Rejected', 'مرفوض'],
    clarify: ['Clarify', 'توضيح'],
    closed: ['Closed', 'مغلق'],
  }
  const [en, ar] = map[s]
  return L(isRtl, en, ar)
}

// Notification kinds the create sheet offers, each with the permission key that gates it.
// (Voting and IDGate notes are intentionally not creatable.)
const CREATABLE_KINDS: { kind: NoteKind; permission: TransactionKey }[] = [
  { kind: 'task', permission: 'note.task' },
  { kind: 'calendar', permission: 'note.calendar' },
  { kind: 'offer', permission: 'note.offer' },
  { kind: 'event', permission: 'note.event' },
  { kind: 'training', permission: 'note.training' },
  { kind: 'tender', permission: 'note.tender' },
  { kind: 'other', permission: 'note.other' },
]

/** Newest activity timestamp across the envelope and all threads (for sorting). */
function lastActivity(n: Notification): string {
  let t = n.createdAt
  for (const rc of n.recipients ?? [])
    for (const e of rc.thread) if (e.at > t) t = e.at
  return t
}

/** Any thread entry authored by someone else that meKey hasn't read yet. */
function hasUnseen(threads: NoteThreadEntry[], meKey: string): boolean {
  return threads.some((e) => actorKey(e.by) !== meKey && !(e.readBy ?? []).includes(meKey))
}

export function Notifications() {
  const { t, lang, isRtl } = useLang()
  const resolve = useResolveActor()

  const active = useStore((s) => s.active)
  const notifications = useStore((s) => s.notifications)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const groups = useStore((s) => s.groups)
  const virtual = useStore((s) => s.virtual)
  const groupRecipients = useStore((s) => s.groupRecipients)
  const can = useStore((s) => s.can)
  const createNotification = useStore((s) => s.createNotification)

  const [createOpen, setCreateOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const meKey = active ? actorKey(active) : ''

  // Sent + received for the active account, newest activity first.
  const mine = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notifications
      .filter(
        (n) =>
          actorKey(n.from) === meKey ||
          (n.recipients ?? []).some((rc) => actorKey(rc.ref) === meKey),
      )
      .filter((n) => !q || n.subject.toLowerCase().includes(q))
      .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
  }, [notifications, meKey, query])

  const creatableKinds = useMemo(() => CREATABLE_KINDS.filter((c) => can(c.permission)), [can])
  const canCreateAny = creatableKinds.length > 0

  const recipientOptions = useMemo<ActorRef[]>(() => {
    const opts: ActorRef[] = []
    normals.forEach((n) => opts.push({ kind: 'normal', normalId: n.id }))
    virtuals
      .filter((v) => v.status === 'active')
      .forEach((v) => opts.push({ kind: 'virtual', virtualId: v.id }))
    return opts.filter((r) => actorKey(r) !== meKey)
  }, [normals, virtuals, meKey])

  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const pickerGroups = useMemo<PickerGroup[]>(() => {
    const src = activeVirtual ? groups.filter((g) => g.entityId === activeVirtual.entityId) : groups
    return src.map((g) => ({
      id: g.id,
      name: g.name,
      count: groupRecipients(g.id).filter((r) => actorKey(r) !== meKey).length,
    }))
  }, [groups, activeVirtual, groupRecipients, meKey])

  const expandGroup = (id: string): ActorRef[] =>
    groupRecipients(id).filter((r) => actorKey(r) !== meKey)

  const openNote = openId ? notifications.find((n) => n.id === openId) ?? null : null

  if (!active) return null

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('notification')}</h1>
        <Button size="sm" disabled={!canCreateAny} onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> {t('createNotification')}
        </Button>
      </div>

      {!canCreateAny && (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {t('canReceiveOnly')}
        </div>
      )}

      {/* Subject search */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchNotifications')}
          className="ps-9"
        />
      </div>

      {mine.length === 0 ? (
        <EmptyState
          title={t('notification')}
          subtitle={L(isRtl, 'Nothing here yet.', 'لا يوجد شيء بعد.')}
        />
      ) : (
        <div className="space-y-3">
          {mine.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              meKey={meKey}
              onOpen={() => setOpenId(n.id)}
              isRtl={isRtl}
              lang={lang}
              t={t}
            />
          ))}
        </div>
      )}

      <NoteThreadSheet
        note={openNote}
        meKey={meKey}
        onClose={() => setOpenId(null)}
        resolveName={(r) => resolve(r).displayName}
        isRtl={isRtl}
        lang={lang}
        t={t}
      />

      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        kinds={creatableKinds.map((c) => c.kind)}
        options={recipientOptions}
        groups={pickerGroups}
        expandGroup={expandGroup}
        resolveName={(r) => resolve(r).displayName}
        resolveLabel={(r) => {
          const info = resolve(r)
          return info.address ? `${info.displayName} — ${info.address}` : info.displayName
        }}
        onCreate={(payload) => {
          createNotification(payload)
          setCreateOpen(false)
        }}
        isRtl={isRtl}
        lang={lang}
        t={t}
      />
    </div>
  )
}

// ── Single notification card ─────────────────────────────────────────────────────
function NoteCard({
  note,
  meKey,
  onOpen,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  meKey: string
  onOpen: () => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const isSender = actorKey(note.from) === meKey
  const myRec = (note.recipients ?? []).find((rc) => actorKey(rc.ref) === meKey)

  // Unread dot: sender sees recipient-authored updates; recipient sees sender-authored ones.
  const unread = isSender
    ? (note.recipients ?? []).some((rc) => hasUnseen(rc.thread, meKey))
    : myRec
      ? hasUnseen(myRec.thread, meKey)
      : false

  return (
    <Card className="space-y-3 p-4 cursor-pointer transition hover:bg-slate-50" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
          <Badge tone="gate">{bl(NOTE_KIND_LABELS[note.kind], lang)}</Badge>
          <Badge tone={isSender ? 'violet' : 'teal'}>{isSender ? t('sent') : t('received')}</Badge>
          {note.frozen && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Lock size={11} /> {t('frozen')}
            </span>
          )}
        </div>
      </div>

      <ActorLine actor={isSender ? (note.recipients?.[0]?.ref ?? note.from) : note.from} size={36} />

      <div>
        <div className="text-sm font-semibold text-slate-800">{note.subject}</div>
        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">{note.body}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span>{relativeTime(note.createdAt, lang)}</span>
        {note.targetDate && (
          <span className="font-medium text-slate-500">
            {t('targetDate')}: <span dir="ltr">{formatDate(note.targetDate, lang)}</span>
          </span>
        )}
        {note.targetTime && (
          <span className="font-medium text-slate-500">
            {t('targetTime')}: <span dir="ltr">{note.targetTime}</span>
          </span>
        )}
        {note.targetVenue && <span className="font-medium text-slate-500">{note.targetVenue}</span>}
      </div>

      {/* Status: received → my own; sent → roll-up across recipients */}
      <div className="flex flex-wrap items-center gap-1.5">
        {isSender ? (
          <StatusRollup recipients={note.recipients ?? []} isRtl={isRtl} />
        ) : myRec ? (
          <Badge tone={STATUS_TONE[myRec.status]}>{statusLabel(myRec.status, isRtl)}</Badge>
        ) : null}
      </div>
    </Card>
  )
}

function StatusRollup({ recipients, isRtl }: { recipients: NoteRecipient[]; isRtl: boolean }) {
  const counts = new Map<NoteStatus, number>()
  recipients.forEach((rc) => counts.set(rc.status, (counts.get(rc.status) ?? 0) + 1))
  const order: NoteStatus[] = ['pending', 'accepted', 'clarify', 'rejected', 'closed']
  return (
    <>
      {order
        .filter((s) => counts.has(s))
        .map((s) => (
          <Badge key={s} tone={STATUS_TONE[s]}>
            {counts.get(s)} {statusLabel(s, isRtl)}
          </Badge>
        ))}
    </>
  )
}

// ── Note conversation / drill-down ──────────────────────────────────────────────
function NoteThreadSheet({
  note,
  meKey,
  onClose,
  resolveName,
  isRtl,
  lang,
  t,
}: {
  note: Notification | null
  meKey: string
  onClose: () => void
  resolveName: (r: ActorRef) => string
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const respondNotification = useStore((s) => s.respondNotification)
  const postNoteMessage = useStore((s) => s.postNoteMessage)
  const freezeNotification = useStore((s) => s.freezeNotification)
  const editNotification = useStore((s) => s.editNotification)
  const markNoteThreadRead = useStore((s) => s.markNoteThreadRead)

  const [editing, setEditing] = useState(false)

  const isSender = !!note && actorKey(note.from) === meKey
  const myRec = note ? (note.recipients ?? []).find((rc) => actorKey(rc.ref) === meKey) : undefined

  // Mark the threads I'm looking at as read.
  const noteId = note?.id
  useEffect(() => {
    if (!note) return
    if (isSender) (note.recipients ?? []).forEach((rc) => markNoteThreadRead(note.id, actorKey(rc.ref)))
    else if (myRec) markNoteThreadRead(note.id, actorKey(myRec.ref))
    setEditing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  if (!note) return null

  return (
    <Sheet open={!!note} onClose={onClose} title={note.subject}>
      <div className="space-y-4 pb-2">
        {/* Envelope */}
        <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="gate">{bl(NOTE_KIND_LABELS[note.kind], lang)}</Badge>
            {note.frozen && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Lock size={12} /> {t('frozen')}
              </span>
            )}
          </div>
          <ActorLine actor={note.from} size={32} />
          <p className="whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {note.targetDate && (
              <span>
                {t('targetDate')}: <span dir="ltr">{formatDate(note.targetDate, lang)}</span>
              </span>
            )}
            {note.targetTime && (
              <span>
                {t('targetTime')}: <span dir="ltr">{note.targetTime}</span>
              </span>
            )}
            {note.targetVenue && <span>{note.targetVenue}</span>}
          </div>
          {note.attachments && note.attachments.length > 0 && <AttachmentList items={note.attachments} />}
        </div>

        {/* Sender controls */}
        {isSender && !note.frozen && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
              <Pencil size={14} /> {t('editNote')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => freezeNotification(note.id)}>
              <Lock size={14} /> {t('freeze')}
            </Button>
          </div>
        )}

        {isSender && editing && (
          <EditForm
            note={note}
            onSave={(patch) => {
              editNotification(note.id, patch)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
            isRtl={isRtl}
            t={t}
          />
        )}

        {/* Sender: one private section per recipient */}
        {isSender ? (
          <div className="space-y-3">
            {(note.recipients ?? []).map((rc) => (
              <RecipientSection
                key={actorKey(rc.ref)}
                note={note}
                rc={rc}
                meKey={meKey}
                frozen={!!note.frozen}
                onReply={(text) => postNoteMessage(note.id, actorKey(rc.ref), text)}
                resolveName={resolveName}
                isRtl={isRtl}
                lang={lang}
                t={t}
              />
            ))}
          </div>
        ) : myRec ? (
          <RecipientView
            note={note}
            rc={myRec}
            meKey={meKey}
            frozen={!!note.frozen}
            onRespond={(status, text) => respondNotification(note.id, meKey, status, text)}
            onMessage={(text) => postNoteMessage(note.id, meKey, text)}
            isRtl={isRtl}
            lang={lang}
            t={t}
          />
        ) : null}
      </div>
    </Sheet>
  )
}

// Sender-side view of ONE recipient's private thread + reply box.
function RecipientSection({
  rc,
  meKey,
  frozen,
  onReply,
  resolveName,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  rc: NoteRecipient
  meKey: string
  frozen: boolean
  onReply: (text: string) => void
  resolveName: (r: ActorRef) => string
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const locked = frozen || rc.status === 'closed'
  return (
    <div className="rounded-2xl border border-slate-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <ActorLine actor={rc.ref} size={28} />
        <Badge tone={STATUS_TONE[rc.status]}>{statusLabel(rc.status, isRtl)}</Badge>
      </div>
      <ThreadList thread={rc.thread} meKey={meKey} lang={lang} isRtl={isRtl} t={t} resolveName={resolveName} />
      {!locked ? (
        <Composer placeholder={t('replyToClarification')} onSend={onReply} isRtl={isRtl} />
      ) : (
        <LockedNote frozen={frozen} isRtl={isRtl} t={t} />
      )}
    </div>
  )
}

// Recipient-side view: my own thread + reaction bar + follow-up composer.
function RecipientView({
  rc,
  meKey,
  frozen,
  onRespond,
  onMessage,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  rc: NoteRecipient
  meKey: string
  frozen: boolean
  onRespond: (status: NoteStatus, text?: string) => void
  onMessage: (text: string) => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const [clarifyOpen, setClarifyOpen] = useState(false)
  const [clarifyText, setClarifyText] = useState('')
  const words = clarifyText.trim() ? clarifyText.trim().split(/\s+/).length : 0
  const clarifyValid = words > 0 && words <= 20
  const locked = frozen || rc.status === 'closed'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('conversation')}
        </span>
        <Badge tone={STATUS_TONE[rc.status]}>{statusLabel(rc.status, isRtl)}</Badge>
      </div>

      <ThreadList thread={rc.thread} meKey={meKey} lang={lang} isRtl={isRtl} t={t} />

      {locked ? (
        <LockedNote frozen={frozen} isRtl={isRtl} t={t} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => onRespond('accepted')}>
              <Check size={14} /> {t('accept')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => onRespond('rejected')}>
              <XIcon size={14} /> {t('reject')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setClarifyOpen((v) => !v)}>
              <HelpCircle size={14} /> {t('clarify')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onRespond('closed')}>
              <CheckCheck size={14} /> {t('close')}
            </Button>
          </div>

          {clarifyOpen && (
            <div className="space-y-1.5 rounded-2xl bg-slate-50 p-3">
              <Textarea
                rows={2}
                value={clarifyText}
                onChange={(e) => setClarifyText(e.target.value)}
                placeholder={t('clarifyHint')}
              />
              <div className="flex items-center justify-between">
                <span className={cx('text-[11px]', words > 20 ? 'text-rose-500' : 'text-slate-400')}>
                  {words}/20
                </span>
                <Button
                  size="sm"
                  disabled={!clarifyValid}
                  onClick={() => {
                    onRespond('clarify', clarifyText.trim())
                    setClarifyText('')
                    setClarifyOpen(false)
                  }}
                >
                  <Send size={14} /> {t('send')}
                </Button>
              </div>
            </div>
          )}

          <Composer placeholder={t('replyToClarification')} onSend={onMessage} isRtl={isRtl} />
        </>
      )}
    </div>
  )
}

function LockedNote({ frozen, isRtl, t }: { frozen: boolean; isRtl: boolean; t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
      <Lock size={12} />
      {frozen ? L(isRtl, 'The sender froze this note.', 'قام المُرسِل بتجميد هذا التنبيه.') : `${t('closed')} — ${L(isRtl, 'no further changes.', 'لا مزيد من التغييرات.')}`}
    </div>
  )
}

function ThreadList({
  thread,
  meKey,
  lang,
  isRtl,
  t,
  resolveName,
}: {
  thread: NoteThreadEntry[]
  meKey: string
  lang: 'en' | 'ar'
  isRtl: boolean
  t: (k: string) => string
  resolveName?: (r: ActorRef) => string
}) {
  if (thread.length === 0)
    return <p className="py-2 text-center text-[11px] text-slate-400">{L(isRtl, 'No messages yet.', 'لا رسائل بعد.')}</p>
  return (
    <div className="space-y-2 py-1">
      {thread.map((e) => (
        <ThreadEntryView key={e.id} e={e} meKey={meKey} lang={lang} isRtl={isRtl} t={t} resolveName={resolveName} />
      ))}
    </div>
  )
}

function ThreadEntryView({
  e,
  meKey,
  lang,
  isRtl,
  t,
  resolveName,
}: {
  e: NoteThreadEntry
  meKey: string
  lang: 'en' | 'ar'
  isRtl: boolean
  t: (k: string) => string
  resolveName?: (r: ActorRef) => string
}) {
  if (e.type === 'system') {
    const label = e.text === 'frozen' ? t('frozen') : L(isRtl, 'Note updated', 'تم تحديث التنبيه')
    return (
      <div className="text-center text-[11px] text-slate-400">
        {label} · {relativeTime(e.at, lang)}
      </div>
    )
  }
  if (e.type === 'status') {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <Badge tone={STATUS_TONE[e.status ?? 'pending']}>{statusLabel(e.status ?? 'pending', isRtl)}</Badge>
        <span className="text-[11px] text-slate-400">{relativeTime(e.at, lang)}</span>
      </div>
    )
  }
  const mine = actorKey(e.by) === meKey
  return (
    <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[82%] rounded-2xl px-3 py-2 text-sm',
          mine ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-700',
        )}
      >
        {resolveName && !mine && (
          <div className="mb-0.5 text-[10px] font-semibold opacity-70">{resolveName(e.by)}</div>
        )}
        <p className="whitespace-pre-wrap">{e.text}</p>
        {e.attachments && e.attachments.length > 0 && <AttachmentList items={e.attachments} onBubble={mine} />}
        <div className={cx('mt-0.5 text-[10px]', mine ? 'text-light/70' : 'text-slate-400')}>
          {relativeTime(e.at, lang)}
        </div>
      </div>
    </div>
  )
}

function Composer({
  placeholder,
  onSend,
  isRtl,
}: {
  placeholder: string
  onSend: (text: string) => void
  isRtl: boolean
}) {
  const [text, setText] = useState('')
  return (
    <div className="mt-2 flex items-end gap-2">
      <Textarea
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button
        size="sm"
        disabled={!text.trim()}
        onClick={() => {
          onSend(text.trim())
          setText('')
        }}
        aria-label={isRtl ? 'إرسال' : 'Send'}
      >
        <Send size={14} />
      </Button>
    </div>
  )
}

function AttachmentList({ items, onBubble }: { items: AttachmentMeta[]; onBubble?: boolean }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((a) => (
        <span
          key={a.id}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-xl py-1 ps-2 pe-2 text-[11px] font-medium',
            onBubble ? 'bg-light/20 text-light' : 'bg-slate-100 text-slate-600',
          )}
        >
          {a.dataUrl && a.type.startsWith('image/') ? (
            <img src={a.dataUrl} alt="" className="h-4 w-4 rounded object-cover" />
          ) : (
            <FileText size={12} />
          )}
          <span className="max-w-[9rem] truncate">{a.name}</span>
          <span className={onBubble ? 'text-light/70' : 'text-slate-400'}>{humanSize(a.size)}</span>
        </span>
      ))}
    </div>
  )
}

// ── Sender edits the envelope ────────────────────────────────────────────────────
function EditForm({
  note,
  onSave,
  onCancel,
  isRtl,
  t,
}: {
  note: Notification
  onSave: (patch: {
    subject?: string
    body?: string
    targetDate?: string
    targetTime?: string
    targetVenue?: string
  }) => void
  onCancel: () => void
  isRtl: boolean
  t: (k: string) => string
}) {
  const [subject, setSubject] = useState(note.subject)
  const [body, setBody] = useState(note.body)
  const [targetDate, setTargetDate] = useState(note.targetDate ? note.targetDate.slice(0, 10) : '')
  const [targetTime, setTargetTime] = useState(note.targetTime ?? '')
  const [targetVenue, setTargetVenue] = useState(note.targetVenue ?? '')
  const valid = subject.trim().length > 0 && body.trim().length > 0

  return (
    <div className="space-y-3 rounded-2xl border border-gate-100 bg-gate-50/40 p-3">
      <Field label={t('subject')} required>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label={t('body')} required>
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Field label={t('targetDate')}>
        <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </Field>
      <Field label={t('targetTime')} hint={t('optional')}>
        <Input type="time" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
      </Field>
      <Field label={t('targetVenue')} hint={t('optional')}>
        <Input value={targetVenue} onChange={(e) => setTargetVenue(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!valid}
          onClick={() =>
            onSave({
              subject: subject.trim(),
              body: body.trim(),
              targetDate: targetDate || '',
              targetTime: targetTime || '',
              targetVenue: targetVenue || '',
            })
          }
        >
          {t('save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {L(isRtl, 'Cancel', 'إلغاء')}
        </Button>
      </div>
    </div>
  )
}

// ── Create notification sheet ──────────────────────────────────────────────────
function CreateSheet({
  open,
  onClose,
  kinds,
  options,
  groups,
  expandGroup,
  resolveName,
  resolveLabel,
  onCreate,
  isRtl,
  lang,
  t,
}: {
  open: boolean
  onClose: () => void
  kinds: NoteKind[]
  options: ActorRef[]
  groups: PickerGroup[]
  expandGroup: (id: string) => ActorRef[]
  resolveName: (r: ActorRef) => string
  resolveLabel: (r: ActorRef) => string
  onCreate: (payload: {
    kind: NoteKind
    to: ActorRef[]
    subject: string
    body: string
    targetDate?: string
    targetTime?: string
    targetVenue?: string
    attachments?: AttachmentMeta[]
  }) => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const [kind, setKind] = useState<NoteKind | ''>('')
  const [toRefs, setToRefs] = useState<ActorRef[]>([])
  const [toGroups, setToGroups] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [targetTime, setTargetTime] = useState('')
  const [targetVenue, setTargetVenue] = useState('')
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setKind('')
    setToRefs([])
    setToGroups([])
    setSubject('')
    setBody('')
    setTargetDate('')
    setTargetTime('')
    setTargetVenue('')
    setAttachments([])
  }

  const to = useMemo(() => {
    const seen = new Set<string>()
    const out: ActorRef[] = []
    for (const r of [...toRefs, ...toGroups.flatMap(expandGroup)]) {
      const k = actorKey(r)
      if (!seen.has(k)) {
        seen.add(k)
        out.push(r)
      }
    }
    return out
  }, [toRefs, toGroups, expandGroup])

  const valid =
    !!kind &&
    to.length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    targetDate.length > 0

  const onFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => {
      const id = uid('att')
      setAttachments((prev) => [...prev, { id, name: f.name, size: f.size, type: f.type }])
      if (f.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () =>
          setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, dataUrl: reader.result as string } : a)))
        reader.readAsDataURL(f)
      }
    })
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={t('createNotification')}
      footer={
        <Button
          full
          disabled={!valid}
          onClick={() => {
            if (!kind || to.length === 0) return
            onCreate({
              kind,
              to,
              subject: subject.trim(),
              body: body.trim(),
              targetDate: targetDate || undefined,
              targetTime: targetTime || undefined,
              targetVenue: targetVenue.trim() || undefined,
              attachments: attachments.length ? attachments : undefined,
            })
            reset()
          }}
        >
          {t('create')}
        </Button>
      }
    >
      <div className="space-y-4 py-2">
        <Field label={t('type')} required>
          <Select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            <option value="">{L(isRtl, 'Select type…', 'اختر النوع…')}</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {bl(NOTE_KIND_LABELS[k], lang)}
              </option>
            ))}
          </Select>
        </Field>

        <RecipientPicker
          label={t('to')}
          required
          options={options}
          groups={groups}
          refs={toRefs}
          groupIds={toGroups}
          onChangeRefs={setToRefs}
          onChangeGroupIds={setToGroups}
          resolveName={resolveName}
          resolveLabel={resolveLabel}
          placeholder={t('searchRecipients')}
          isRtl={isRtl}
        />

        <Field label={t('subject')} required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label={t('body')} required>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label={t('targetDate')} required>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <Field label={t('targetTime')} hint={t('optional')}>
          <Input type="time" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
        </Field>
        <Field label={t('targetVenue')} hint={t('optional')}>
          <Input value={targetVenue} onChange={(e) => setTargetVenue(e.target.value)} />
        </Field>

        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            <Paperclip size={14} /> {t('addAttachment')}
          </button>
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 py-1.5 ps-2.5 pe-1 text-[11px] font-medium text-slate-600"
                >
                  {a.dataUrl && a.type.startsWith('image/') ? (
                    <img src={a.dataUrl} alt="" className="h-4 w-4 rounded object-cover" />
                  ) : (
                    <FileText size={12} />
                  )}
                  <span className="max-w-[9rem] truncate">{a.name}</span>
                  <span className="text-slate-400">{humanSize(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-300 hover:text-slate-700"
                    aria-label={L(isRtl, 'Remove', 'إزالة')}
                  >
                    <XIcon size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
