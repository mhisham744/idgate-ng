import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  X as XIcon,
  HelpCircle,
  CheckCheck,
  Lock,
  LockOpen,
  Pencil,
  Search,
  SlidersHorizontal,
  FileText,
  Send,
} from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey, formatDate, relativeTime } from '@/lib/identity'
import { ActorLine, useResolveActor } from '@/components/identity'
import { NOTE_KIND_LABELS, RATING_LABELS, RATING_ORDER, EVAL_TYPE_LABELS } from '@/data/reference'
import type { EvalType } from '@/data/reference'
import { useInboxScopeKeys, myRecipientOf } from '@/lib/userScope'
import {
  Button,
  Card,
  Badge,
  Chip,
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
  RatingKey,
} from '@/types'

const L = (isRtl: boolean, en: string, ar: string) => (isRtl ? ar : en)

/** Assessment note kinds (valuation/voting/election) — reaction is a rating or a ballot, not accept/reject. */
const ASSESSMENT_KINDS: NoteKind[] = ['valuation', 'voting', 'election']
const isAssessment = (k: NoteKind) => ASSESSMENT_KINDS.includes(k)
const isBallotKind = (k: NoteKind) => k === 'voting' || k === 'election'

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

/** Newest activity timestamp across the envelope and all threads (for sorting). */
function lastActivity(n: Notification): string {
  let t = n.createdAt
  for (const rc of n.recipients ?? [])
    for (const e of rc.thread) if (e.at > t) t = e.at
  return t
}

/** Any thread entry authored by someone outside my scope that I haven't read yet. */
function hasUnseen(threads: NoteThreadEntry[], keys: Set<string>): boolean {
  return threads.some((e) => !keys.has(actorKey(e.by)) && !(e.readBy ?? []).some((k) => keys.has(k)))
}

// ── Classification folders (left rail) ──────────────────────────────────────────
type Folder = 'inbox' | 'sent' | 'received' | 'pending' | 'accepted' | 'rejected' | 'closed' | 'freeze'
const FOLDERS: { key: Folder; labelKey: string }[] = [
  { key: 'inbox', labelKey: 'inbox' },
  { key: 'sent', labelKey: 'sent' },
  { key: 'received', labelKey: 'received' },
  { key: 'pending', labelKey: 'pending' },
  { key: 'accepted', labelKey: 'accepted' },
  { key: 'rejected', labelKey: 'rejected' },
  { key: 'closed', labelKey: 'closed' },
  { key: 'freeze', labelKey: 'freeze' },
]
const STATUS_FOLDERS: Record<string, NoteStatus> = {
  pending: 'pending',
  accepted: 'accepted',
  rejected: 'rejected',
  closed: 'closed',
}

/** The empty advanced-search criteria. */
interface AdvCriteria {
  tool: '' | 'notification' | 'valuation' | 'voting' | 'election'
  toolType: string // '' | `kind:<NoteKind>` | `eval:<EvalType>`
  from: string
  to: string
  subject: string
  targetDate: string
  dateFrom: string
  dateTo: string
  venue: string
}
const EMPTY_ADV: AdvCriteria = {
  tool: '',
  toolType: '',
  from: '',
  to: '',
  subject: '',
  targetDate: '',
  dateFrom: '',
  dateTo: '',
  venue: '',
}
const advActive = (c: AdvCriteria) => Object.values(c).some((v) => v !== '')

export function Notifications() {
  const { t, lang, isRtl } = useLang()
  const resolve = useResolveActor()

  const active = useStore((s) => s.active)
  const notifications = useStore((s) => s.notifications)

  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState<Folder>('inbox')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState<AdvCriteria>(EMPTY_ADV)

  // The set of identities that count as "me" for the inbox (per the scope setting).
  const keys = useInboxScopeKeys()

  // Resolved name + address of an actor, lowercased, for substring matching.
  const resolveText = (r: ActorRef) => {
    const info = resolve(r)
    return `${info.displayName} ${info.address ?? ''}`.toLowerCase()
  }

  // Base set: notes I sent or received, newest activity first.
  const mine = useMemo(
    () =>
      notifications
        .filter((n) => keys.has(actorKey(n.from)) || (n.recipients ?? []).some((rc) => keys.has(actorKey(rc.ref))))
        .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))),
    [notifications, keys],
  )

  // Notes needing a response that are still pending for me (Inbox counter badge).
  const inboxPending = useMemo(
    () =>
      mine.filter((n) => {
        const rc = myRecipientOf(n, keys)
        return !!rc && n.needsResponse && rc.status === 'pending' && !n.frozen
      }).length,
    [mine, keys],
  )

  const matchesFolder = (n: Notification): boolean => {
    const isSender = keys.has(actorKey(n.from))
    const myRec = myRecipientOf(n, keys)
    switch (folder) {
      case 'inbox':
      case 'received':
        return !!myRec
      case 'sent':
        return isSender
      case 'freeze':
        return n.frozen === true
      default: {
        const s = STATUS_FOLDERS[folder]
        const asRecipient = !!myRec && myRec.status === s
        const asSender = isSender && (n.recipients ?? []).some((rc) => rc.status === s)
        return asRecipient || asSender
      }
    }
  }

  const matchesAdvanced = (n: Notification): boolean => {
    if (adv.tool) {
      const assessment = n.kind === 'valuation' || n.kind === 'voting' || n.kind === 'election'
      if (adv.tool === 'notification' ? assessment : n.kind !== adv.tool) return false
    }
    if (adv.toolType) {
      if (adv.toolType.startsWith('kind:')) {
        if (n.kind !== adv.toolType.slice(5)) return false
      } else if (adv.toolType.startsWith('eval:')) {
        if (n.evalType !== adv.toolType.slice(5)) return false
      }
    }
    if (adv.from.trim() && !resolveText(n.from).includes(adv.from.trim().toLowerCase())) return false
    if (adv.to.trim()) {
      const q = adv.to.trim().toLowerCase()
      if (!(n.recipients ?? []).some((rc) => resolveText(rc.ref).includes(q))) return false
    }
    if (adv.subject.trim() && !n.subject.toLowerCase().includes(adv.subject.trim().toLowerCase())) return false
    if (adv.venue.trim() && !(n.targetVenue ?? '').toLowerCase().includes(adv.venue.trim().toLowerCase())) return false
    const d = n.targetDate ? n.targetDate.slice(0, 10) : ''
    if (adv.targetDate && d !== adv.targetDate) return false
    if (adv.dateFrom && (!d || d < adv.dateFrom)) return false
    if (adv.dateTo && (!d || d > adv.dateTo)) return false
    return true
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mine
      .filter(matchesFolder)
      .filter(matchesAdvanced)
      .filter((n) => !q || n.subject.toLowerCase().includes(q))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, folder, adv, query, keys])

  const openNote = openId ? notifications.find((n) => n.id === openId) ?? null : null

  if (!active) return null

  return (
    <div className="p-4 pb-8">
      <h1 className="mb-4 min-w-0 truncate text-xl font-bold text-slate-800">{t('notification')}</h1>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {/* Classification rail — vertical column on desktop, scrollable chip row on mobile */}
        <nav className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:w-44 md:flex-col md:overflow-visible md:px-0 md:pb-0">
          {FOLDERS.map((f) => (
            <Chip key={f.key} active={folder === f.key} onClick={() => setFolder(f.key)}>
              <span className="flex items-center gap-1.5">
                {t(f.labelKey)}
                {f.key === 'inbox' && inboxPending > 0 && (
                  <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {inboxPending}
                  </span>
                )}
              </span>
            </Chip>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {/* Subject search + Advanced */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchNotifications')}
                className="ps-9"
              />
            </div>
            <Button
              size="sm"
              variant={advActive(adv) ? 'primary' : 'secondary'}
              onClick={() => setAdvOpen(true)}
              className="shrink-0 whitespace-nowrap"
            >
              <SlidersHorizontal size={14} /> {t('advancedSearch')}
            </Button>
          </div>

          {list.length === 0 ? (
            <EmptyState
              title={t('notification')}
              subtitle={L(isRtl, 'Nothing here yet.', 'لا يوجد شيء بعد.')}
            />
          ) : (
            <div className="space-y-3">
              {list.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  keys={keys}
                  onOpen={() => setOpenId(n.id)}
                  isRtl={isRtl}
                  lang={lang}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NoteThreadSheet
        note={openNote}
        keys={keys}
        onClose={() => setOpenId(null)}
        resolveName={(r) => resolve(r).displayName}
        isRtl={isRtl}
        lang={lang}
        t={t}
      />

      <AdvancedSearchSheet
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        value={adv}
        onApply={(c) => {
          setAdv(c)
          setAdvOpen(false)
        }}
        onReset={() => {
          setAdv(EMPTY_ADV)
          setAdvOpen(false)
        }}
        isRtl={isRtl}
        lang={lang}
        t={t}
      />
    </div>
  )
}

// ── Advanced multi-field search sheet ───────────────────────────────────────────
const ADV_KIND_OPTIONS: NoteKind[] = ['task', 'calendar', 'offer', 'event', 'training', 'tender', 'other']
const ADV_EVAL_OPTIONS: EvalType[] = ['subject', 'event', 'performance', 'person', 'organization']

function AdvancedSearchSheet({
  open,
  onClose,
  value,
  onApply,
  onReset,
  isRtl,
  lang,
  t,
}: {
  open: boolean
  onClose: () => void
  value: AdvCriteria
  onApply: (c: AdvCriteria) => void
  onReset: () => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const [draft, setDraft] = useState<AdvCriteria>(value)

  useEffect(() => {
    if (open) setDraft(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = <K extends keyof AdvCriteria>(k: K, v: AdvCriteria[K]) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('advancedSearch')}
      footer={
        <div className="flex gap-2">
          <Button full onClick={() => onApply(draft)}>
            {t('search')}
          </Button>
          <Button variant="ghost" onClick={onReset}>
            {t('cancel')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <Field label={t('tool')}>
          <Select value={draft.tool} onChange={(e) => set('tool', e.target.value as AdvCriteria['tool'])}>
            <option value="">{t('allItems')}</option>
            <option value="notification">{t('notificationTool')}</option>
            <option value="valuation">{t('valuation')}</option>
            <option value="voting">{t('voting')}</option>
            <option value="election">{t('election')}</option>
          </Select>
        </Field>

        <Field label={t('toolType')}>
          <Select value={draft.toolType} onChange={(e) => set('toolType', e.target.value)}>
            <option value="">{t('allItems')}</option>
            {ADV_KIND_OPTIONS.map((k) => (
              <option key={`kind:${k}`} value={`kind:${k}`}>
                {bl(NOTE_KIND_LABELS[k], lang)}
              </option>
            ))}
            {ADV_EVAL_OPTIONS.map((e) => (
              <option key={`eval:${e}`} value={`eval:${e}`}>
                {bl(EVAL_TYPE_LABELS[e], lang)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('searchFrom')}>
          <Input value={draft.from} onChange={(e) => set('from', e.target.value)} />
        </Field>
        <Field label={t('searchTo')}>
          <Input value={draft.to} onChange={(e) => set('to', e.target.value)} />
        </Field>
        <Field label={t('subject')}>
          <Input value={draft.subject} onChange={(e) => set('subject', e.target.value)} />
        </Field>
        <Field label={t('targetVenue')}>
          <Input value={draft.venue} onChange={(e) => set('venue', e.target.value)} />
        </Field>
        <Field label={t('targetDate')}>
          <Input type="date" value={draft.targetDate} onChange={(e) => set('targetDate', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('dateFrom')}>
            <Input type="date" value={draft.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
          </Field>
          <Field label={t('dateTo')}>
            <Input type="date" value={draft.dateTo} onChange={(e) => set('dateTo', e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  )
}

// ── Single notification card ─────────────────────────────────────────────────────
function NoteCard({
  note,
  keys,
  onOpen,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  keys: Set<string>
  onOpen: () => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const isSender = keys.has(actorKey(note.from))
  const myRec = (note.recipients ?? []).find((rc) => keys.has(actorKey(rc.ref)))

  // Unread dot: sender sees recipient-authored updates; recipient sees sender-authored ones.
  const unread = isSender
    ? (note.recipients ?? []).some((rc) => hasUnseen(rc.thread, keys))
    : myRec
      ? hasUnseen(myRec.thread, keys)
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
  keys,
  onClose,
  resolveName,
  isRtl,
  lang,
  t,
}: {
  note: Notification | null
  keys: Set<string>
  onClose: () => void
  resolveName: (r: ActorRef) => string
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const respondNotification = useStore((s) => s.respondNotification)
  const postNoteMessage = useStore((s) => s.postNoteMessage)
  const freezeNotification = useStore((s) => s.freezeNotification)
  const unfreezeNotification = useStore((s) => s.unfreezeNotification)
  const editNotification = useStore((s) => s.editNotification)
  const markNoteThreadRead = useStore((s) => s.markNoteThreadRead)
  const rateNotification = useStore((s) => s.rateNotification)
  const setBallotChoice = useStore((s) => s.setBallotChoice)

  const [editing, setEditing] = useState(false)

  const isSender = !!note && keys.has(actorKey(note.from))
  const myRec = note ? (note.recipients ?? []).find((rc) => keys.has(actorKey(rc.ref))) : undefined
  // The owned identity acting on this note: its sender if I sent it, else my recipient ref.
  const myKey = myRec ? actorKey(myRec.ref) : ''

  // Mark the threads I'm looking at as read, acting as the owned identity.
  const noteId = note?.id
  useEffect(() => {
    if (!note) return
    if (isSender) (note.recipients ?? []).forEach((rc) => markNoteThreadRead(note.id, actorKey(rc.ref), note.from))
    else if (myRec) markNoteThreadRead(note.id, actorKey(myRec.ref), myRec.ref)
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
          {note.body && <p className="whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>}
          {isAssessment(note.kind) && note.evalType && (
            <Badge tone="violet">{bl(EVAL_TYPE_LABELS[note.evalType as EvalType], lang)}</Badge>
          )}
          {note.ballot && note.ballot.length > 0 && (
            <ol className="ms-4 list-decimal space-y-0.5 text-sm text-slate-700">
              {note.ballot.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          )}
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

        {isSender && note.frozen && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => unfreezeNotification(note.id)}>
              <LockOpen size={14} /> {t('unfreeze')}
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
            {isAssessment(note.kind) && (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('results')}</span>
            )}
            {(note.recipients ?? []).map((rc) =>
              isAssessment(note.kind) ? (
                <AssessmentSenderSection key={actorKey(rc.ref)} note={note} rc={rc} isRtl={isRtl} lang={lang} t={t} />
              ) : (
                <RecipientSection
                  key={actorKey(rc.ref)}
                  note={note}
                  rc={rc}
                  keys={keys}
                  frozen={!!note.frozen}
                  onReply={(text) => postNoteMessage(note.id, actorKey(rc.ref), text, undefined, note.from)}
                  resolveName={resolveName}
                  isRtl={isRtl}
                  lang={lang}
                  t={t}
                />
              ),
            )}
          </div>
        ) : myRec ? (
          isAssessment(note.kind) ? (
            <AssessmentReaction
              note={note}
              rc={myRec}
              frozen={!!note.frozen}
              onRate={(rating) => rateNotification(note.id, myKey, rating)}
              onChoice={(i, choice) => setBallotChoice(note.id, myKey, i, choice)}
              onClose={() => respondNotification(note.id, myKey, 'closed')}
              isRtl={isRtl}
              lang={lang}
              t={t}
            />
          ) : (
            <RecipientView
              note={note}
              rc={myRec}
              keys={keys}
              frozen={!!note.frozen}
              onRespond={(status, text) => respondNotification(note.id, myKey, status, text)}
              onMessage={(text) => postNoteMessage(note.id, myKey, text, undefined, myRec.ref)}
              isRtl={isRtl}
              lang={lang}
              t={t}
            />
          )
        ) : null}
      </div>
    </Sheet>
  )
}

// Sender-side view of ONE recipient's private thread + reply box.
function RecipientSection({
  rc,
  keys,
  frozen,
  onReply,
  resolveName,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  rc: NoteRecipient
  keys: Set<string>
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
      <ThreadList thread={rc.thread} keys={keys} lang={lang} isRtl={isRtl} t={t} resolveName={resolveName} />
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
  keys,
  frozen,
  onRespond,
  onMessage,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  rc: NoteRecipient
  keys: Set<string>
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

      <ThreadList thread={rc.thread} keys={keys} lang={lang} isRtl={isRtl} t={t} />

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

// ── Assessment (valuation / voting / election) ──────────────────────────────────
// Shared result display: a valuation rating, or a per-subject agree/disagree list.
function AssessmentResult({
  note,
  rc,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  rc: NoteRecipient
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  if (isBallotKind(note.kind)) {
    return (
      <div className="space-y-1">
        {(note.ballot ?? []).map((item, i) => {
          const choice = rc.ballotChoices?.[i] ?? null
          return (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 text-slate-700">
                {i + 1}. {item}
              </span>
              {choice ? (
                <Badge tone={choice === 'agree' ? 'green' : 'red'}>{t(choice)}</Badge>
              ) : (
                <Badge tone="amber">{statusLabel('pending', isRtl)}</Badge>
              )}
            </div>
          )
        })}
      </div>
    )
  }
  // valuation
  return rc.rating ? (
    <Badge tone="gate">{bl(RATING_LABELS[rc.rating], lang)}</Badge>
  ) : (
    <Badge tone="amber">{statusLabel('pending', isRtl)}</Badge>
  )
}

// Sender-side: one recipient's assessment result.
function AssessmentSenderSection({
  note,
  rc,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  rc: NoteRecipient
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <ActorLine actor={rc.ref} size={28} />
        <Badge tone={STATUS_TONE[rc.status]}>{statusLabel(rc.status, isRtl)}</Badge>
      </div>
      <AssessmentResult note={note} rc={rc} isRtl={isRtl} lang={lang} t={t} />
    </div>
  )
}

// Recipient-side: rating scale (valuation) or agree/disagree ballot (voting/election) + Close.
function AssessmentReaction({
  note,
  rc,
  frozen,
  onRate,
  onChoice,
  onClose,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  rc: NoteRecipient
  frozen: boolean
  onRate: (rating: RatingKey) => void
  onChoice: (index: number, choice: 'agree' | 'disagree') => void
  onClose: () => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const locked = frozen || rc.status === 'closed'
  const ballot = note.ballot ?? []
  const allChosen = isBallotKind(note.kind) && ballot.every((_, i) => (rc.ballotChoices?.[i] ?? null) != null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('conversation')}</span>
        <Badge tone={STATUS_TONE[rc.status]}>{statusLabel(rc.status, isRtl)}</Badge>
      </div>

      {locked ? (
        <>
          <AssessmentResult note={note} rc={rc} isRtl={isRtl} lang={lang} t={t} />
          <LockedNote frozen={frozen} isRtl={isRtl} t={t} />
        </>
      ) : isBallotKind(note.kind) ? (
        <>
          {ballot.map((item, i) => {
            const choice = rc.ballotChoices?.[i] ?? null
            return (
              <div key={i} className="space-y-2 rounded-2xl border border-slate-100 p-3">
                <div className="text-sm font-medium text-slate-800">
                  {i + 1}. {item}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={choice === 'agree' ? 'primary' : 'secondary'} onClick={() => onChoice(i, 'agree')}>
                    <Check size={14} /> {t('agree')}
                  </Button>
                  <Button size="sm" variant={choice === 'disagree' ? 'danger' : 'secondary'} onClick={() => onChoice(i, 'disagree')}>
                    <XIcon size={14} /> {t('disagree')}
                  </Button>
                </div>
              </div>
            )
          })}
          <Button size="sm" disabled={!allChosen} onClick={onClose}>
            <CheckCheck size={14} /> {t('close')}
          </Button>
        </>
      ) : (
        <>
          <Field label={t('ratingScale')} required>
            <Select value={rc.rating ?? ''} onChange={(e) => onRate(e.target.value as RatingKey)}>
              <option value="">{L(isRtl, 'Select…', 'اختر…')}</option>
              {RATING_ORDER.map((k) => (
                <option key={k} value={k}>
                  {bl(RATING_LABELS[k], lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Button size="sm" disabled={!rc.rating} onClick={onClose}>
            <CheckCheck size={14} /> {t('close')}
          </Button>
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
  keys,
  lang,
  isRtl,
  t,
  resolveName,
}: {
  thread: NoteThreadEntry[]
  keys: Set<string>
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
        <ThreadEntryView key={e.id} e={e} keys={keys} lang={lang} isRtl={isRtl} t={t} resolveName={resolveName} />
      ))}
    </div>
  )
}

function ThreadEntryView({
  e,
  keys,
  lang,
  isRtl,
  t,
  resolveName,
}: {
  e: NoteThreadEntry
  keys: Set<string>
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
  const mine = keys.has(actorKey(e.by))
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
      {items.map((a) => {
        const cls = cx(
          'inline-flex items-center gap-1.5 rounded-xl py-1 ps-2 pe-2 text-[11px] font-medium',
          onBubble ? 'bg-light/20 text-light' : 'bg-slate-100 text-slate-600',
          a.dataUrl && 'cursor-pointer transition hover:brightness-95',
        )
        const inner = (
          <>
            {a.dataUrl && a.type.startsWith('image/') ? (
              <img src={a.dataUrl} alt="" className="h-4 w-4 rounded object-cover" />
            ) : (
              <FileText size={12} />
            )}
            <span className="max-w-[9rem] truncate">{a.name}</span>
            <span className={onBubble ? 'text-light/70' : 'text-slate-400'}>{humanSize(a.size)}</span>
          </>
        )
        return a.dataUrl ? (
          <a key={a.id} href={a.dataUrl} download={a.name} target="_blank" rel="noopener noreferrer" className={cls}>
            {inner}
          </a>
        ) : (
          <span key={a.id} className={cls}>
            {inner}
          </span>
        )
      })}
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
