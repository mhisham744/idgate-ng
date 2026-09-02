import { useMemo, useState } from 'react'
import { Plus, Send as SendIcon, Users, User, X, UsersRound } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, relativeTime } from '@/lib/identity'
import { useResolveActor, ActorLine } from '@/components/identity'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Select,
  EmptyState,
  Sheet,
  Row,
  cx,
} from '@/ui/primitives'
import type { ActorRef, ActiveAccount, Message } from '@/types'

// Small bilingual inline helper for labels without an i18n key.
const L = (isRtl: boolean, en: string, ar: string) => (isRtl ? ar : en)

/** ActiveAccount and ActorRef share the same shape — treat the active account as a ref. */
function activeRef(a: ActiveAccount): ActorRef {
  return a
}

export function Messages() {
  const { t, lang, isRtl } = useLang()
  const resolve = useResolveActor()

  const active = useStore((s) => s.active)
  const messages = useStore((s) => s.messages)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const groups = useStore((s) => s.groups)
  const virtual = useStore((s) => s.virtual)
  const groupRecipients = useStore((s) => s.groupRecipients)
  const sendMessage = useStore((s) => s.sendMessage)
  const markRead = useStore((s) => s.markRead)
  const can = useStore((s) => s.can)

  const [openThread, setOpenThread] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  const meKey = active ? actorKey(active) : ''

  // ── Recipient options: active virtuals + all persons, excluding self ─────────
  const recipientOptions = useMemo<ActorRef[]>(() => {
    const opts: ActorRef[] = []
    normals.forEach((n) => opts.push({ kind: 'normal', normalId: n.id }))
    virtuals
      .filter((v) => v.status === 'active')
      .forEach((v) => opts.push({ kind: 'virtual', virtualId: v.id }))
    return opts.filter((r) => actorKey(r) !== meKey)
  }, [normals, virtuals, meKey])

  // ── Group options: groups from the active virtual's entity (or all when personal) ─
  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const groupOptions = useMemo(
    () => {
      const src = activeVirtual ? groups.filter((g) => g.entityId === activeVirtual.entityId) : groups
      return src.map((g) => ({
        id: g.id,
        name: g.name,
        recipients: groupRecipients(g.id).filter((r) => actorKey(r) !== meKey),
      }))
    },
    [groups, activeVirtual, groupRecipients, meKey],
  )

  // ── Threads: latest message per threadId that involves me ────────────────────
  const threads = useMemo(() => {
    const involves = (m: Message) =>
      actorKey(m.from) === meKey ||
      m.to.some((r) => actorKey(r) === meKey) ||
      (m.cc ?? []).some((r) => actorKey(r) === meKey)
    const byThread = new Map<string, Message[]>()
    messages.filter(involves).forEach((m) => {
      const arr = byThread.get(m.threadId) ?? []
      arr.push(m)
      byThread.set(m.threadId, arr)
    })
    const list = Array.from(byThread.entries()).map(([threadId, msgs]) => {
      const sorted = [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const latest = sorted[sorted.length - 1]
      return { threadId, msgs: sorted, latest }
    })
    return list.sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt))
  }, [messages, meKey])

  if (!active) return null
  const meRef = activeRef(active)

  const otherParty = (m: Message): ActorRef => {
    if (actorKey(m.from) !== meKey) return m.from
    const other = m.to.find((r) => actorKey(r) !== meKey)
    return other ?? m.to[0] ?? m.from
  }

  const activeThread = threads.find((th) => th.threadId === openThread) ?? null

  const openThreadDetail = (threadId: string) => {
    setOpenThread(threadId)
    const th = threads.find((x) => x.threadId === threadId)
    th?.msgs.forEach((m) => {
      if (!m.readBy.includes(meKey)) markRead(m.id)
    })
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('messages')}</h1>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Plus size={16} /> {t('newMessage')}
        </Button>
      </div>

      {threads.length === 0 ? (
        <EmptyState title={t('inbox')} subtitle={L(isRtl, 'No messages yet.', 'لا توجد رسائل بعد.')} />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden p-0">
          {threads.map((th) => {
            const other = otherParty(th.latest)
            const unread = !th.latest.readBy.includes(meKey)
            return (
              <Row
                key={th.threadId}
                onClick={() => openThreadDetail(th.threadId)}
                leading={
                  <div className="relative">
                    <ActorLine actor={other} size={40} showAddress={false} />
                  </div>
                }
                title={
                  <span className="flex items-center gap-2">
                    <span className="truncate">{th.latest.subject}</span>
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-gate-600" />}
                  </span>
                }
                subtitle={th.latest.body}
                trailing={
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {relativeSafe(th.latest.createdAt, lang)}
                  </span>
                }
              />
            )
          })}
        </Card>
      )}

      {/* Thread detail */}
      <ThreadSheet
        thread={activeThread}
        meKey={meKey}
        meRef={meRef}
        onClose={() => setOpenThread(null)}
        canReply={can('msg.reply')}
        onReply={(body) => {
          if (!activeThread) return
          const latest = activeThread.latest
          // Reply to everyone on the latest message except me.
          const parties: ActorRef[] = [
            latest.from,
            ...latest.to,
            ...(latest.cc ?? []),
          ].filter((r) => actorKey(r) !== meKey)
          const uniq = dedupe(parties)
          const subject = latest.subject.startsWith('Re: ') ? latest.subject : `Re: ${latest.subject}`
          sendMessage(uniq.length ? uniq : [latest.from], subject, body, latest.threadId)
        }}
        resolveName={(r) => resolve(r).displayName}
        isRtl={isRtl}
        lang={lang}
        t={t}
      />

      {/* Compose */}
      <ComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        options={recipientOptions}
        groups={groupOptions}
        canSend={can('msg.send')}
        resolveLabel={(r) => {
          const info = resolve(r)
          return info.address ? `${info.displayName} — ${info.address}` : info.displayName
        }}
        resolveName={(r) => resolve(r).displayName}
        keyOf={actorKey}
        onSend={(to, subject, body) => {
          sendMessage(to, subject, body)
          setComposeOpen(false)
        }}
        isRtl={isRtl}
        t={t}
      />
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────────
function dedupe(refs: ActorRef[]): ActorRef[] {
  const seen = new Set<string>()
  const out: ActorRef[] = []
  refs.forEach((r) => {
    const k = actorKey(r)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(r)
    }
  })
  return out
}

function relativeSafe(iso: string, lang: 'en' | 'ar'): string {
  return relativeTime(iso, lang)
}

// ── Thread detail sheet ─────────────────────────────────────────────────────────
function ThreadSheet({
  thread,
  meKey,
  onClose,
  canReply,
  onReply,
  isRtl,
  lang,
  t,
}: {
  thread: { threadId: string; msgs: Message[]; latest: Message } | null
  meKey: string
  meRef: ActorRef
  onClose: () => void
  canReply: boolean
  onReply: (body: string) => void
  resolveName: (r: ActorRef) => string
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const [body, setBody] = useState('')
  if (!thread) return null

  const submit = () => {
    if (!body.trim()) return
    onReply(body.trim())
    setBody('')
  }

  return (
    <Sheet
      open={!!thread}
      onClose={() => {
        setBody('')
        onClose()
      }}
      title={thread.latest.subject}
      footer={
        canReply ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('reply')}
              />
            </div>
            <Button onClick={submit} disabled={!body.trim()}>
              <SendIcon size={16} /> {t('send')}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
            {t('noPermission')}
          </div>
        )
      }
    >
      <div className="space-y-3 py-2">
        {thread.msgs.map((m) => {
          const mine = actorKey(m.from) === meKey
          return (
            <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div className={mine ? 'max-w-[80%]' : 'max-w-[80%]'}>
                {!mine && (
                  <div className="mb-1">
                    <ActorLine actor={m.from} size={28} showAddress={false} />
                  </div>
                )}
                <div
                  className={
                    mine
                      ? 'rounded-3xl rounded-ee-md bg-gate-600 px-4 py-2.5 text-sm text-light'
                      : 'rounded-3xl rounded-es-md bg-slate-100 px-4 py-2.5 text-sm text-slate-800'
                  }
                >
                  {m.body}
                </div>
                <div className={mine ? 'mt-1 text-end' : 'mt-1 text-start'}>
                  <span className="text-[11px] text-slate-400">{relativeSafe(m.createdAt, lang)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

// ── Compose sheet ────────────────────────────────────────────────────────────────
type GroupOption = { id: string; name: string; recipients: ActorRef[] }

function ComposeSheet({
  open,
  onClose,
  options,
  groups,
  canSend,
  resolveLabel,
  resolveName,
  keyOf,
  onSend,
  isRtl,
  t,
}: {
  open: boolean
  onClose: () => void
  options: ActorRef[]
  groups: GroupOption[]
  canSend: boolean
  resolveLabel: (r: ActorRef) => string
  resolveName: (r: ActorRef) => string
  keyOf: (r: ActorRef) => string
  onSend: (to: ActorRef[], subject: string, body: string) => void
  isRtl: boolean
  t: (k: string) => string
}) {
  const [mode, setMode] = useState<'people' | 'group'>('people')
  const [selected, setSelected] = useState<ActorRef[]>([])
  const [groupId, setGroupId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const reset = () => {
    setMode('people')
    setSelected([])
    setGroupId('')
    setSubject('')
    setBody('')
  }

  const selectedKeys = new Set(selected.map(keyOf))
  const addable = options.filter((r) => !selectedKeys.has(keyOf(r)))
  const addRecipient = (k: string) => {
    const r = options.find((o) => keyOf(o) === k)
    if (r) setSelected((prev) => [...prev, r])
  }
  const removeRecipient = (k: string) => setSelected((prev) => prev.filter((r) => keyOf(r) !== k))

  const chosenGroup = groups.find((g) => g.id === groupId) ?? null
  const recipients = mode === 'people' ? selected : chosenGroup?.recipients ?? []
  const valid = recipients.length > 0 && subject.trim().length > 0 && body.trim().length > 0

  const send = () => {
    if (!valid) return
    onSend(recipients, subject.trim(), body.trim())
    reset()
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={t('newMessage')}
      footer={
        canSend ? (
          <Button full disabled={!valid} onClick={send}>
            <SendIcon size={16} />{' '}
            {recipients.length > 1
              ? `${t('send')} · ${recipients.length}`
              : t('send')}
          </Button>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
            {t('canReceiveOnly')}
          </div>
        )
      }
    >
      {canSend ? (
        <div className="space-y-4 py-2">
          {/* mode toggle */}
          <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setMode('people')}
              className={cx(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                mode === 'people' ? 'bg-white text-gate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <User size={14} /> {L(isRtl, 'People', 'أشخاص')}
            </button>
            <button
              onClick={() => setMode('group')}
              className={cx(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                mode === 'group' ? 'bg-white text-gate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Users size={14} /> {L(isRtl, 'Group', 'مجموعة')}
            </button>
          </div>

          {mode === 'people' ? (
            <Field label={t('to')} required>
              {selected.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {selected.map((r) => (
                    <span
                      key={keyOf(r)}
                      className="inline-flex items-center gap-1 rounded-full bg-gate-50 py-1 ps-2.5 pe-1 text-xs font-medium text-gate-700"
                    >
                      {resolveName(r)}
                      <button
                        onClick={() => removeRecipient(keyOf(r))}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-gate-400 transition hover:bg-gate-200 hover:text-gate-700"
                        aria-label={L(isRtl, 'Remove', 'إزالة')}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) addRecipient(e.target.value)
                }}
                disabled={addable.length === 0}
              >
                <option value="">
                  {addable.length === 0
                    ? L(isRtl, 'No more recipients', 'لا مزيد من المستلمين')
                    : selected.length === 0
                      ? L(isRtl, 'Select recipient…', 'اختر المستلم…')
                      : L(isRtl, 'Add another…', 'إضافة آخر…')}
                </option>
                {addable.map((r) => (
                  <option key={keyOf(r)} value={keyOf(r)}>
                    {resolveLabel(r)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label={L(isRtl, 'Group', 'المجموعة')} required>
              {groups.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                  {L(isRtl, 'No groups available.', 'لا توجد مجموعات متاحة.')}
                </p>
              ) : (
                <>
                  <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                    <option value="">{L(isRtl, 'Select group…', 'اختر مجموعة…')}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · {g.recipients.length}
                      </option>
                    ))}
                  </Select>
                  {chosenGroup && (
                    <div className="mt-2 rounded-2xl bg-teal-50/60 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                        <UsersRound size={13} />
                        {chosenGroup.recipients.length}{' '}
                        {L(isRtl, 'recipients reached', 'مستلم')}
                      </div>
                      {chosenGroup.recipients.length === 0 ? (
                        <p className="mt-1 text-[11px] text-amber-600">
                          {L(isRtl, 'This group currently resolves to no active recipients.', 'لا تشمل هذه المجموعة حاليًا أي مستلمين نشطين.')}
                        </p>
                      ) : (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {chosenGroup.recipients.slice(0, 6).map((r) => (
                            <Badge key={keyOf(r)} tone="teal">{resolveName(r)}</Badge>
                          ))}
                          {chosenGroup.recipients.length > 6 && (
                            <Badge tone="slate">+{chosenGroup.recipients.length - 6}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Field>
          )}

          <Field label={t('subject')} required>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label={t('body')} required>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="py-4">
          <EmptyState title={t('canReceiveOnly')} subtitle={t('noPermission')} />
        </div>
      )}
    </Sheet>
  )
}
