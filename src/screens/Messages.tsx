import { useMemo, useRef, useState } from 'react'
import {
  Plus,
  Send as SendIcon,
  X,
  Reply,
  ReplyAll,
  Forward as ForwardIcon,
  Trash2,
  Paperclip,
  Search,
  FileText,
} from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, relativeTime, uid } from '@/lib/identity'
import { useResolveActor, ActorLine } from '@/components/identity'
import { RecipientPicker } from '@/components/RecipientPicker'
import type { PickerGroup } from '@/components/RecipientPicker'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Textarea,
  EmptyState,
  Sheet,
  Row,
  cx,
} from '@/ui/primitives'
import type { ActorRef, ActiveAccount, AttachmentMeta, Message } from '@/types'

// Small bilingual inline helper for labels without an i18n key.
const L = (isRtl: boolean, en: string, ar: string) => (isRtl ? ar : en)

type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward'
type ComposeState = { mode: ComposeMode; source?: Message }

/** ActiveAccount and ActorRef share the same shape — treat the active account as a ref. */
function activeRef(a: ActiveAccount): ActorRef {
  return a
}

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

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
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
  const markRead = useStore((s) => s.markRead)
  const deleteMessage = useStore((s) => s.deleteMessage)
  const can = useStore((s) => s.can)

  const [openThread, setOpenThread] = useState<string | null>(null)
  const [compose, setCompose] = useState<ComposeState | null>(null)
  const [query, setQuery] = useState('')

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

  // ── Threads: latest message per threadId that involves me, minus my soft-deletes ─
  const threads = useMemo(() => {
    const involves = (m: Message) =>
      actorKey(m.from) === meKey ||
      m.to.some((r) => actorKey(r) === meKey) ||
      (m.cc ?? []).some((r) => actorKey(r) === meKey) ||
      (m.bcc ?? []).some((r) => actorKey(r) === meKey)
    const notDeleted = (m: Message) => !(m.deletedBy ?? []).includes(meKey)

    const byThread = new Map<string, Message[]>()
    messages
      .filter((m) => involves(m) && notDeleted(m))
      .forEach((m) => {
        const arr = byThread.get(m.threadId) ?? []
        arr.push(m)
        byThread.set(m.threadId, arr)
      })
    let list = Array.from(byThread.entries()).map(([threadId, msgs]) => {
      const sorted = [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const latest = sorted[sorted.length - 1]
      return { threadId, msgs: sorted, latest }
    })

    const q = query.trim().toLowerCase()
    if (q) list = list.filter((th) => th.msgs.some((m) => m.subject.toLowerCase().includes(q)))

    return list.sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt))
  }, [messages, meKey, query])

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

  const startCompose = (mode: ComposeMode, source?: Message) => {
    setOpenThread(null)
    setCompose({ mode, source })
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('messages')}</h1>
        <Button size="sm" onClick={() => startCompose('new')}>
          <Plus size={16} /> {t('newMessage')}
        </Button>
      </div>

      {/* Subject search */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchSubject')}
          className="ps-9"
        />
      </div>

      {threads.length === 0 ? (
        <EmptyState
          title={t('inbox')}
          subtitle={
            query.trim()
              ? L(isRtl, 'No matching messages.', 'لا توجد رسائل مطابقة.')
              : L(isRtl, 'No messages yet.', 'لا توجد رسائل بعد.')
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden p-0">
          {threads.map((th) => {
            const other = otherParty(th.latest)
            const unread = !th.latest.readBy.includes(meKey)
            return (
              <Row
                key={th.threadId}
                onClick={() => openThreadDetail(th.threadId)}
                leading={<ActorLine actor={other} size={40} showAddress={false} />}
                title={
                  <span className="flex items-center gap-2">
                    <span className="truncate">{th.latest.subject}</span>
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-gate-600" />}
                  </span>
                }
                subtitle={th.latest.body}
                trailing={
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] text-slate-400">
                      {relativeTime(th.latest.createdAt, lang)}
                    </span>
                    {th.msgs.length > 1 && (
                      <Badge tone="slate">{th.msgs.length}</Badge>
                    )}
                  </div>
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
        onClose={() => setOpenThread(null)}
        onReply={() => activeThread && startCompose('reply', activeThread.latest)}
        onReplyAll={() => activeThread && startCompose('replyAll', activeThread.latest)}
        onForward={() => activeThread && startCompose('forward', activeThread.latest)}
        onDelete={(id) => deleteMessage(id)}
        canReply={can('msg.reply')}
        canReplyAll={can('msg.replyAll')}
        canForward={can('msg.forward')}
        canDelete={can('msg.delete')}
        resolveName={(r) => resolve(r).displayName}
        isRtl={isRtl}
        lang={lang}
        t={t}
      />

      {/* Compose / reply / forward */}
      {compose && (
        <ComposeEditor
          key={`${compose.mode}:${compose.source?.id ?? 'new'}`}
          mode={compose.mode}
          source={compose.source}
          meKey={meKey}
          meRef={meRef}
          options={recipientOptions}
          groups={pickerGroups}
          expandGroup={expandGroup}
          canSend={can('msg.send')}
          resolveName={(r) => resolve(r).displayName}
          resolveLabel={(r) => {
            const info = resolve(r)
            return info.address ? `${info.displayName} — ${info.address}` : info.displayName
          }}
          onClose={() => setCompose(null)}
          isRtl={isRtl}
          lang={lang}
          t={t}
        />
      )}
    </div>
  )
}

// ── Thread detail sheet ─────────────────────────────────────────────────────────
function ThreadSheet({
  thread,
  meKey,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  canReply,
  canReplyAll,
  canForward,
  canDelete,
  resolveName,
  isRtl,
  lang,
  t,
}: {
  thread: { threadId: string; msgs: Message[]; latest: Message } | null
  meKey: string
  onClose: () => void
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
  onDelete: (messageId: string) => void
  canReply: boolean
  canReplyAll: boolean
  canForward: boolean
  canDelete: boolean
  resolveName: (r: ActorRef) => string
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  if (!thread) return null
  const latest = thread.latest

  const namesOf = (refs: ActorRef[] | undefined) =>
    (refs ?? []).map((r) => resolveName(r)).join('، ')

  return (
    <Sheet
      open={!!thread}
      onClose={onClose}
      title={latest.subject}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!canReply} onClick={onReply}>
            <Reply size={15} /> {t('reply')}
          </Button>
          <Button size="sm" variant="secondary" disabled={!canReplyAll} onClick={onReplyAll}>
            <ReplyAll size={15} /> {t('replyAll')}
          </Button>
          <Button size="sm" variant="subtle" disabled={!canForward} onClick={onForward}>
            <ForwardIcon size={15} /> {t('forward')}
          </Button>
        </div>
      }
    >
      {/* Header: from / to / cc + communication count */}
      <div className="space-y-2 border-b border-slate-100 pb-3 pt-1">
        <ActorLine actor={latest.from} size={36} />
        <div className="space-y-0.5 text-[11px] text-slate-500">
          <div>
            <span className="font-semibold text-slate-600">{t('to')}: </span>
            <bdi>{namesOf(latest.to)}</bdi>
          </div>
          {latest.cc && latest.cc.length > 0 && (
            <div>
              <span className="font-semibold text-slate-600">{t('cc')}: </span>
              <bdi>{namesOf(latest.cc)}</bdi>
            </div>
          )}
          <div className="flex items-center gap-1 pt-0.5 text-slate-400">
            <span>
              {thread.msgs.length} {t('communications')}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 py-3">
        {thread.msgs.map((m) => {
          const mine = actorKey(m.from) === meKey
          return (
            <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div className="group max-w-[82%]">
                {!mine && (
                  <div className="mb-1">
                    <ActorLine actor={m.from} size={24} showAddress={false} />
                  </div>
                )}
                <div
                  className={
                    mine
                      ? 'rounded-3xl rounded-ee-md bg-gate-600 px-4 py-2.5 text-sm text-light'
                      : 'rounded-3xl rounded-es-md bg-slate-100 px-4 py-2.5 text-sm text-slate-800'
                  }
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((a) => (
                        <AttachmentChip key={a.id} att={a} onBubble={mine} />
                      ))}
                    </div>
                  )}
                </div>
                <div className={cx('mt-1 flex items-center gap-2', mine ? 'justify-end' : 'justify-start')}>
                  <span className="text-[11px] text-slate-400">{relativeTime(m.createdAt, lang)}</span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      className="rounded-full p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={t('delete')}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

// ── Attachment chip (thumbnail for images, file card otherwise) ────────────────
function AttachmentChip({ att, onBubble }: { att: AttachmentMeta; onBubble?: boolean }) {
  if (att.dataUrl && att.type.startsWith('image/')) {
    return (
      <img
        src={att.dataUrl}
        alt={att.name}
        className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/5"
      />
    )
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium',
        onBubble ? 'bg-white/15 text-light' : 'bg-white text-slate-600 ring-1 ring-slate-200',
      )}
    >
      <FileText size={13} />
      <span className="max-w-[10rem] truncate">{att.name}</span>
      <span className={onBubble ? 'text-light/70' : 'text-slate-400'}>{humanSize(att.size)}</span>
    </span>
  )
}

// ── Unified compose / reply / reply-all / forward editor ───────────────────────
function ComposeEditor({
  mode,
  source,
  meKey,
  options,
  groups,
  expandGroup,
  canSend,
  resolveName,
  resolveLabel,
  onClose,
  isRtl,
  t,
}: {
  mode: ComposeMode
  source?: Message
  meKey: string
  meRef: ActorRef
  options: ActorRef[]
  groups: PickerGroup[]
  expandGroup: (id: string) => ActorRef[]
  canSend: boolean
  resolveName: (r: ActorRef) => string
  resolveLabel: (r: ActorRef) => string
  onClose: () => void
  isRtl: boolean
  lang: 'en' | 'ar'
  t: (k: string) => string
}) {
  const sendMessage = useStore((s) => s.sendMessage)
  const forwardMessage = useStore((s) => s.forwardMessage)

  // Seed the To list + subject from the source message when replying.
  const seedTo = useMemo<ActorRef[]>(() => {
    if (!source) return []
    if (mode === 'reply') {
      const base = actorKey(source.from) !== meKey ? [source.from] : source.to
      return dedupe(base).filter((r) => actorKey(r) !== meKey)
    }
    if (mode === 'replyAll') {
      return dedupe([source.from, ...source.to, ...(source.cc ?? [])]).filter(
        (r) => actorKey(r) !== meKey,
      )
    }
    return []
  }, [mode, source, meKey])

  const seedSubject = useMemo(() => {
    if (mode === 'new' || mode === 'forward') return ''
    const s = source?.subject ?? ''
    return s.startsWith('Re: ') ? s : `Re: ${s}`
  }, [mode, source])

  const [toRefs, setToRefs] = useState<ActorRef[]>(seedTo)
  const [toGroups, setToGroups] = useState<string[]>([])
  const [ccRefs, setCcRefs] = useState<ActorRef[]>([])
  const [ccGroups, setCcGroups] = useState<string[]>([])
  const [bccRefs, setBccRefs] = useState<ActorRef[]>([])
  const [bccGroups, setBccGroups] = useState<string[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState(seedSubject)
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const isForward = mode === 'forward'

  const resolveLevel = (refs: ActorRef[], gids: string[]): ActorRef[] =>
    dedupe([...refs, ...gids.flatMap(expandGroup)]).filter((r) => actorKey(r) !== meKey)

  const to = resolveLevel(toRefs, toGroups)
  const cc = resolveLevel(ccRefs, ccGroups)
  const bcc = resolveLevel(bccRefs, bccGroups)

  const valid =
    to.length > 0 && (isForward || (subject.trim().length > 0 && body.trim().length > 0))

  const onFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => {
      const id = uid('att')
      const base: AttachmentMeta = { id, name: f.name, size: f.size, type: f.type }
      setAttachments((prev) => [...prev, base])
      if (f.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () =>
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, dataUrl: reader.result as string } : a)),
          )
        reader.readAsDataURL(f)
      }
    })
  }

  const send = () => {
    if (!valid) return
    if (isForward && source) {
      forwardMessage({
        source,
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        body: body.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
      })
    } else {
      sendMessage({
        to,
        cc,
        bcc,
        subject: subject.trim(),
        body: body.trim(),
        attachments,
        threadId: mode === 'reply' || mode === 'replyAll' ? source?.threadId : undefined,
      })
    }
    onClose()
  }

  const title =
    mode === 'reply'
      ? t('reply')
      : mode === 'replyAll'
        ? t('replyAll')
        : mode === 'forward'
          ? t('forward')
          : t('newMessage')

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        canSend ? (
          <Button full disabled={!valid} onClick={send}>
            <SendIcon size={16} /> {to.length > 1 ? `${t('send')} · ${to.length}` : t('send')}
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
          <div>
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
            {(!showCc || !showBcc) && (
              <div className="mt-2 flex gap-3 ps-1">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs font-semibold text-gate-600 hover:underline"
                  >
                    + {t('cc')}
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-xs font-semibold text-gate-600 hover:underline"
                  >
                    + {t('bcc')}
                  </button>
                )}
              </div>
            )}
          </div>

          {showCc && (
            <RecipientPicker
              label={t('cc')}
              options={options}
              groups={groups}
              refs={ccRefs}
              groupIds={ccGroups}
              onChangeRefs={setCcRefs}
              onChangeGroupIds={setCcGroups}
              resolveName={resolveName}
              resolveLabel={resolveLabel}
              placeholder={t('searchRecipients')}
              isRtl={isRtl}
            />
          )}

          {showBcc && (
            <RecipientPicker
              label={t('bcc')}
              options={options}
              groups={groups}
              refs={bccRefs}
              groupIds={bccGroups}
              onChangeRefs={setBccRefs}
              onChangeGroupIds={setBccGroups}
              resolveName={resolveName}
              resolveLabel={resolveLabel}
              placeholder={t('searchRecipients')}
              isRtl={isRtl}
            />
          )}

          {!isForward && (
            <Field label={t('subject')} required>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          )}

          <Field label={isForward ? L(isRtl, 'Add a note', 'أضف ملاحظة') : t('body')} required={!isForward}>
            <Textarea rows={isForward ? 3 : 5} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>

          {/* Forwarded content preview */}
          {isForward && source && (
            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
              <div className="mb-1 font-semibold text-slate-600">{t('forward')}</div>
              <p className="line-clamp-3 whitespace-pre-wrap">{source.body}</p>
            </div>
          )}

          {/* Attachments */}
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
              <Paperclip size={14} /> {t('attach')}
            </button>

            {(attachments.length > 0 || (isForward && source?.attachments?.length)) && (
              <div className="mt-2 space-y-2">
                {isForward && source?.attachments && source.attachments.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    {source.attachments.length} {t('attachments')} ·{' '}
                    {L(isRtl, 'carried from original', 'منقولة من الأصل')}
                  </p>
                )}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
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
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-4">
          <EmptyState title={t('canReceiveOnly')} subtitle={t('noPermission')} />
        </div>
      )}
    </Sheet>
  )
}
