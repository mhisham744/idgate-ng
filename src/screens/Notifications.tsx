import { useEffect, useMemo, useState } from 'react'
import { Plus, Check, X as XIcon, HelpCircle, CheckCheck, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey, formatDate, relativeTime } from '@/lib/identity'
import { ActorLine, useResolveActor } from '@/components/identity'
import { NOTE_KIND_LABELS } from '@/data/reference'
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
} from '@/ui/primitives'
import type { ActorRef, ActiveAccount, NoteKind, NoteStatus, Notification, TransactionKey } from '@/types'

const L = (isRtl: boolean, en: string, ar: string) => (isRtl ? ar : en)

function activeRef(a: ActiveAccount): ActorRef {
  return a
}

const STATUS_TONE: Record<NoteStatus, 'slate' | 'green' | 'amber' | 'red' | 'teal'> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  clarify: 'teal',
  completed: 'green',
  closed: 'slate',
}

function statusLabel(s: NoteStatus, isRtl: boolean): string {
  const map: Record<NoteStatus, [string, string]> = {
    pending: ['Pending', 'قيد الانتظار'],
    accepted: ['Accepted', 'مقبول'],
    rejected: ['Rejected', 'مرفوض'],
    clarify: ['Clarify', 'توضيح'],
    completed: ['Completed', 'مكتمل'],
    closed: ['Closed', 'مغلق'],
  }
  const [en, ar] = map[s]
  return L(isRtl, en, ar)
}

// Notification kinds the create sheet offers, each with the permission key that gates it.
const CREATABLE_KINDS: { kind: NoteKind; permission: TransactionKey }[] = [
  { kind: 'task', permission: 'note.task' },
  { kind: 'calendar', permission: 'note.calendar' },
  { kind: 'offer', permission: 'note.offer' },
  { kind: 'voting', permission: 'note.voting' },
  { kind: 'event', permission: 'note.event' },
  { kind: 'training', permission: 'note.training' },
  { kind: 'tender', permission: 'note.tender' },
  { kind: 'idgate', permission: 'tool.idgateNote' },
  { kind: 'other', permission: 'note.other' },
]

export function Notifications() {
  const { t, lang, isRtl } = useLang()
  const resolve = useResolveActor()

  const active = useStore((s) => s.active)
  const notifications = useStore((s) => s.notifications)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const can = useStore((s) => s.can)
  const respondNotification = useStore((s) => s.respondNotification)
  const voteNotification = useStore((s) => s.voteNotification)
  const createNotification = useStore((s) => s.createNotification)
  const markNotificationRead = useStore((s) => s.markNotificationRead)

  const [createOpen, setCreateOpen] = useState(false)

  const meKey = active ? actorKey(active) : ''

  const mine = useMemo(() => {
    return notifications
      .filter((n) => n.to.some((r) => actorKey(r) === meKey))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [notifications, meKey])

  // Viewing the list counts as opening: clear the unread flag for this account
  // (feeds the Home status bar's Notification count; Pending is separate).
  const unreadIds = mine
    .filter((n) => !(n.readBy ?? []).includes(meKey))
    .map((n) => n.id)
    .join(',')
  useEffect(() => {
    if (!unreadIds) return
    unreadIds.split(',').forEach((id) => markNotificationRead(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadIds])

  const creatableKinds = useMemo(
    () => CREATABLE_KINDS.filter((c) => can(c.permission)),
    [can],
  )
  const canCreateAny = creatableKinds.length > 0

  const recipientOptions = useMemo<ActorRef[]>(() => {
    const opts: ActorRef[] = []
    normals.forEach((n) => opts.push({ kind: 'normal', normalId: n.id }))
    virtuals
      .filter((v) => v.status === 'active')
      .forEach((v) => opts.push({ kind: 'virtual', virtualId: v.id }))
    return opts.filter((r) => actorKey(r) !== meKey)
  }, [normals, virtuals, meKey])

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
              isRecipient={n.to.some((r) => actorKey(r) === meKey)}
              onRespond={(status) => respondNotification(n.id, status)}
              onVote={(choice) => voteNotification(n.id, choice)}
              resolveName={(r) => resolve(r).displayName}
              isRtl={isRtl}
              lang={lang}
              t={t}
            />
          ))}
        </div>
      )}

      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        kinds={creatableKinds.map((c) => c.kind)}
        options={recipientOptions}
        resolveLabel={(r) => {
          const info = resolve(r)
          return info.address ? `${info.displayName} — ${info.address}` : info.displayName
        }}
        keyOf={actorKey}
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
  isRecipient,
  onRespond,
  onVote,
  isRtl,
  lang,
  t,
}: {
  note: Notification
  isRecipient: boolean
  onRespond: (status: NoteStatus) => void
  onVote: (choice: 'accept' | 'reject') => void
  resolveName: (r: ActorRef) => string
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const showActions = note.needsResponse && note.status === 'pending' && isRecipient
  const isVoting = note.kind === 'voting'

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <Badge tone="gate">{bl(NOTE_KIND_LABELS[note.kind], lang)}</Badge>
        <Badge tone={STATUS_TONE[note.status]}>{statusLabel(note.status, isRtl)}</Badge>
      </div>

      <ActorLine actor={note.from} size={36} />

      <div>
        <div className="text-sm font-semibold text-slate-800">{note.subject}</div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{note.body}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span>{relativeTime(note.createdAt, lang)}</span>
        {note.targetDate && (
          <span className="font-medium text-slate-500">
            {t('targetDate')}: <span dir="ltr">{formatDate(note.targetDate, lang)}</span>
          </span>
        )}
      </div>

      {isVoting && (
        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 px-4 py-2 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <ThumbsUp size={14} /> {note.votes?.accept ?? 0}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <ThumbsDown size={14} /> {note.votes?.reject ?? 0}
          </span>
        </div>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-2">
          {isVoting ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => onVote('accept')}>
                <ThumbsUp size={14} /> {t('accept')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onVote('reject')}>
                <ThumbsDown size={14} /> {t('reject')}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="primary" onClick={() => onRespond('accepted')}>
                <Check size={14} /> {t('accept')}
              </Button>
              <Button size="sm" variant="danger" onClick={() => onRespond('rejected')}>
                <XIcon size={14} /> {t('reject')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onRespond('clarify')}>
                <HelpCircle size={14} /> {t('clarify')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onRespond('completed')}>
                <CheckCheck size={14} /> {t('complete')}
              </Button>
            </>
          )}
        </div>
      )}

      {note.history.length > 0 && (
        <div className="space-y-1 border-t border-slate-100 pt-2">
          {note.history.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate">{h.action}</span>
              <span className="shrink-0 text-slate-400">{relativeTime(h.at, lang)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Create notification sheet ──────────────────────────────────────────────────
function CreateSheet({
  open,
  onClose,
  kinds,
  options,
  resolveLabel,
  keyOf,
  onCreate,
  isRtl,
  lang,
  t,
}: {
  open: boolean
  onClose: () => void
  kinds: NoteKind[]
  options: ActorRef[]
  resolveLabel: (r: ActorRef) => string
  keyOf: (r: ActorRef) => string
  onCreate: (payload: {
    kind: NoteKind
    to: ActorRef[]
    subject: string
    body: string
    targetDate?: string
  }) => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const [kind, setKind] = useState<NoteKind | ''>('')
  const [toKey, setToKey] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const reset = () => {
    setKind('')
    setToKey('')
    setSubject('')
    setBody('')
    setTargetDate('')
  }

  const target = options.find((r) => keyOf(r) === toKey) ?? null
  const valid = !!kind && !!target && subject.trim().length > 0 && body.trim().length > 0

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
            if (!kind || !target) return
            onCreate({
              kind,
              to: [target],
              subject: subject.trim(),
              body: body.trim(),
              targetDate: targetDate || undefined,
            })
            reset()
          }}
        >
          {t('create')}
        </Button>
      }
    >
      <div className="space-y-4 py-2">
        <Field label={L(isRtl, 'Kind', 'النوع')} required>
          <Select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            <option value="">{L(isRtl, 'Select kind…', 'اختر النوع…')}</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {bl(NOTE_KIND_LABELS[k], lang)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('to')} required>
          <Select value={toKey} onChange={(e) => setToKey(e.target.value)}>
            <option value="">{L(isRtl, 'Select recipient…', 'اختر المستلم…')}</option>
            {options.map((r) => (
              <option key={keyOf(r)} value={keyOf(r)}>
                {resolveLabel(r)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('subject')} required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label={t('body')} required>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label={t('targetDate')} hint={t('optional')}>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  )
}
