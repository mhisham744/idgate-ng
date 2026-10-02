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
  Inbox as InboxIcon,
  Star,
  Tag,
  FolderInput,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react'
import { useStore } from '@/store'
import { useDirectory, useInboxScopeKeys } from '@/lib/userScope'
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
  Select,
  Textarea,
  EmptyState,
  Modal,
  Sheet,
  Row,
  cx,
} from '@/ui/primitives'
import type { ActorRef, ActiveAccount, AttachmentMeta, Draft, Label, Message } from '@/types'

// Small bilingual inline helper for labels without an i18n key.
const L = (isRtl: boolean, en: string, ar: string) => (isRtl ? ar : en)

type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward'
type ComposeState = { mode: ComposeMode; source?: Message; me: ActorRef; draft?: Draft }

/** Mailbox folders. Label folders are encoded as `label:<id>`. */
type Folder = 'inbox' | 'sent' | 'starred' | 'drafts' | `label:${string}`

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

const dedupeIds = (ids: string[]): string[] => [...new Set(ids)]

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** A label plus its nesting depth, parents emitted before their children. */
function flattenLabels(labels: Label[]): { label: Label; depth: number }[] {
  const out: { label: Label; depth: number }[] = []
  const seen = new Set<string>()
  const walk = (l: Label, depth: number) => {
    if (seen.has(l.id)) return
    seen.add(l.id)
    out.push({ label: l, depth })
    labels.filter((c) => c.parentId === l.id).forEach((c) => walk(c, depth + 1))
  }
  labels.filter((l) => !l.parentId || !labels.some((p) => p.id === l.parentId)).forEach((r) => walk(r, 0))
  // Safety net for any label not reached above.
  labels.forEach((l) => walk(l, 0))
  return out
}

/** A label id plus every descendant id (for folder filtering). */
function labelAndDescendants(labels: Label[], id: string): Set<string> {
  const ids = new Set<string>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const l of labels) {
      if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) {
        ids.add(l.id)
        changed = true
      }
    }
  }
  return ids
}

export function Messages() {
  const { t, lang, isRtl } = useLang()
  const resolve = useResolveActor()

  const active = useStore((s) => s.active)
  const normalId = useStore((s) => s.normalId)
  const messages = useStore((s) => s.messages)
  const drafts = useStore((s) => s.drafts)
  const labels = useStore((s) => s.labels)
  const groupRecipients = useStore((s) => s.groupRecipients)
  const markRead = useStore((s) => s.markRead)
  const deleteMessage = useStore((s) => s.deleteMessage)
  const toggleStarMessage = useStore((s) => s.toggleStarMessage)
  const setMessageLabels = useStore((s) => s.setMessageLabels)
  const addLabel = useStore((s) => s.addLabel)
  const renameLabel = useStore((s) => s.renameLabel)
  const removeLabel = useStore((s) => s.removeLabel)
  const deleteDraft = useStore((s) => s.deleteDraft)
  const can = useStore((s) => s.can)

  const [folder, setFolder] = useState<Folder>('inbox')
  const [openThread, setOpenThread] = useState<string | null>(null)
  const [compose, setCompose] = useState<ComposeState | null>(null)
  const [moveMsg, setMoveMsg] = useState<Message | null>(null)
  const [labelModal, setLabelModal] = useState<
    { mode: 'create'; assignTo?: Message } | { mode: 'rename'; label: Label } | null
  >(null)

  // Simple + advanced search.
  const [query, setQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fSubject, setFSubject] = useState('')
  const [fDate, setFDate] = useState('')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')

  // Active account key — used only for the active-scoped Directory / recipient picker.
  const meKey = active ? actorKey(active) : ''
  // The set of identities that count as "me" for the inbox (per the scope setting).
  const keys = useInboxScopeKeys()

  // ── Recipients & groups are scoped to the acting account's Directory ─────────
  const dir = useDirectory()
  const recipientOptions = dir.people
  const pickerGroups = useMemo<PickerGroup[]>(
    () =>
      dir.groups.map((g) => ({
        id: g.id,
        name: g.name,
        count: groupRecipients(g.id).filter((r) => actorKey(r) !== meKey).length,
      })),
    [dir.groups, groupRecipients, meKey],
  )

  const expandGroup = (id: string): ActorRef[] =>
    groupRecipients(id).filter((r) => actorKey(r) !== meKey)

  // My labels (shared across my accounts, owned by the signed-in person).
  const myLabels = useMemo(() => labels.filter((l) => l.ownerNormalId === normalId), [labels, normalId])
  const labelTree = useMemo(() => flattenLabels(myLabels), [myLabels])
  const labelName = (id: string) => myLabels.find((l) => l.id === id)?.name ?? id

  // Drafts owned by any of my accounts, newest first.
  const myDrafts = useMemo(
    () =>
      drafts
        .filter((d) => keys.has(actorKey(d.owner)))
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [drafts, keys],
  )

  // Inbox unread counter — messages addressed to me, not from me, not read, not hidden.
  const inboxUnread = useMemo(() => {
    const addressedToMe = (m: Message) =>
      m.to.some((r) => keys.has(actorKey(r))) ||
      (m.cc ?? []).some((r) => keys.has(actorKey(r))) ||
      (m.bcc ?? []).some((r) => keys.has(actorKey(r)))
    return messages.filter(
      (m) =>
        addressedToMe(m) &&
        !keys.has(actorKey(m.from)) &&
        !m.readBy.some((k) => keys.has(k)) &&
        !(m.deletedBy ?? []).some((k) => keys.has(k)),
    ).length
  }, [messages, keys])

  // ── Threads for the current folder (before search) ───────────────────────────
  const folderThreads = useMemo(() => {
    const involves = (m: Message) =>
      keys.has(actorKey(m.from)) ||
      m.to.some((r) => keys.has(actorKey(r))) ||
      (m.cc ?? []).some((r) => keys.has(actorKey(r))) ||
      (m.bcc ?? []).some((r) => keys.has(actorKey(r)))
    const notDeleted = (m: Message) => !(m.deletedBy ?? []).some((k) => keys.has(k))

    let pool = messages.filter((m) => involves(m) && notDeleted(m))
    if (folder === 'sent') {
      pool = pool.filter((m) => keys.has(actorKey(m.from)))
    } else if (folder === 'starred') {
      pool = pool.filter((m) => (m.starredBy ?? []).some((k) => keys.has(k)))
    } else if (folder.startsWith('label:')) {
      const ids = labelAndDescendants(myLabels, folder.slice('label:'.length))
      pool = pool.filter((m) => (m.labelIds ?? []).some((x) => ids.has(x)))
    }

    const byThread = new Map<string, Message[]>()
    pool.forEach((m) => {
      const arr = byThread.get(m.threadId) ?? []
      arr.push(m)
      byThread.set(m.threadId, arr)
    })
    return Array.from(byThread.entries())
      .map(([threadId, msgs]) => {
        const sorted = [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        return { threadId, msgs: sorted, latest: sorted[sorted.length - 1] }
      })
      .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt))
  }, [messages, keys, folder, myLabels])

  if (!active) return null
  const meRef = activeRef(active)

  // ── Search (applied over folder threads; uses resolved names/addresses) ──────
  const qSub = query.trim().toLowerCase()
  const aFrom = fFrom.trim().toLowerCase()
  const aTo = fTo.trim().toLowerCase()
  const aSub = fSubject.trim().toLowerCase()
  const searchActive = !!(qSub || aFrom || aTo || aSub || fDate || fDateFrom || fDateTo)

  const actorMatches = (r: ActorRef, q: string) => {
    const info = resolve(r)
    return info.displayName.toLowerCase().includes(q) || (info.address ?? '').toLowerCase().includes(q)
  }
  const msgMatches = (m: Message): boolean => {
    const day = m.createdAt.slice(0, 10)
    if (qSub && !m.subject.toLowerCase().includes(qSub)) return false
    if (aSub && !m.subject.toLowerCase().includes(aSub)) return false
    if (aFrom && !actorMatches(m.from, aFrom)) return false
    if (aTo && !m.to.some((r) => actorMatches(r, aTo))) return false
    if (fDate && day !== fDate) return false
    if (fDateFrom && day < fDateFrom) return false
    if (fDateTo && day > fDateTo) return false
    return true
  }
  const visibleThreads = searchActive
    ? folderThreads.filter((th) => th.msgs.some(msgMatches))
    : folderThreads

  const otherParty = (m: Message): ActorRef => {
    if (!keys.has(actorKey(m.from))) return m.from
    const other = m.to.find((r) => !keys.has(actorKey(r)))
    return other ?? m.to[0] ?? m.from
  }

  // The owned identity that participates in a message (recipient I own, else its
  // sender if I sent it) — read-marking and replies act *as* this identity.
  const ownedParticipant = (m: Message): ActorRef => {
    const all = [m.from, ...m.to, ...(m.cc ?? []), ...(m.bcc ?? [])]
    return all.find((r) => keys.has(actorKey(r))) ?? meRef
  }

  const isStarred = (m: Message) => (m.starredBy ?? []).some((k) => keys.has(k))

  const activeThread = folderThreads.find((th) => th.threadId === openThread) ?? null

  const openThreadDetail = (threadId: string) => {
    setOpenThread(threadId)
    const th = folderThreads.find((x) => x.threadId === threadId)
    th?.msgs.forEach((m) => {
      if (!m.readBy.some((k) => keys.has(k))) markRead(m.id, ownedParticipant(m))
    })
  }

  const startCompose = (mode: ComposeMode, source?: Message) => {
    setOpenThread(null)
    setCompose({ mode, source, me: source ? ownedParticipant(source) : meRef })
  }

  const openDraft = (d: Draft) => {
    setOpenThread(null)
    setCompose({ mode: 'new', me: d.owner, draft: d })
  }

  // Create / rename label; when `assignTo` is set, also file that message under it.
  const submitLabelModal = (name: string, parentId: string | null) => {
    if (!labelModal) return
    if (labelModal.mode === 'rename') {
      renameLabel(labelModal.label.id, name)
    } else {
      const id = addLabel(name, parentId)
      if (labelModal.assignTo) {
        setMessageLabels(labelModal.assignTo.id, dedupeIds([...(labelModal.assignTo.labelIds ?? []), id]))
        setMoveMsg(null)
      }
    }
    setLabelModal(null)
  }

  const fileUnderLabel = (m: Message, labelId: string) => {
    setMessageLabels(m.id, dedupeIds([...(m.labelIds ?? []), labelId]))
    setMoveMsg(null)
  }

  const clearSearch = () => {
    setQuery('')
    setFFrom('')
    setFTo('')
    setFSubject('')
    setFDate('')
    setFDateFrom('')
    setFDateTo('')
  }

  const folderDefs: { key: Folder; label: string; icon: typeof InboxIcon; badge?: number }[] = [
    { key: 'inbox', label: t('inbox'), icon: InboxIcon, badge: inboxUnread || undefined },
    { key: 'sent', label: t('sent'), icon: SendIcon },
    { key: 'starred', label: t('starred'), icon: Star },
    { key: 'drafts', label: t('drafts'), icon: FileText, badge: myDrafts.length || undefined },
  ]

  const folderTitle =
    folder === 'inbox'
      ? t('inbox')
      : folder === 'sent'
        ? t('sent')
        : folder === 'starred'
          ? t('starred')
          : folder === 'drafts'
            ? t('drafts')
            : labelName(folder.slice('label:'.length))

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t('messages')}</h1>
        <Button size="sm" onClick={() => startCompose('new')}>
          <Plus size={16} /> {t('newMessage')}
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* ── Classification bar ─────────────────────────────────────────────── */}
        <nav className="flex gap-2 overflow-x-auto thin-scroll pb-1 lg:w-44 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
          {folderDefs.map((f) => (
            <FolderButton
              key={f.key}
              icon={f.icon}
              label={f.label}
              badge={f.badge}
              active={folder === f.key}
              onClick={() => setFolder(f.key)}
            />
          ))}

          <div className="hidden h-px bg-slate-100 lg:my-1 lg:block" />

          {/* Labels header + new */}
          <div className="hidden items-center justify-between px-2 pt-1 lg:flex">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('labels')}</span>
            <button
              type="button"
              onClick={() => setLabelModal({ mode: 'create' })}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-gate-600"
              aria-label={t('newLabel')}
            >
              <Plus size={14} />
            </button>
          </div>

          {labelTree.map(({ label, depth }) => {
            const key: Folder = `label:${label.id}`
            return (
              <div key={label.id} className="group/label flex shrink-0 items-center lg:w-full">
                <FolderButton
                  icon={Tag}
                  label={label.name}
                  depth={depth}
                  active={folder === key}
                  onClick={() => setFolder(key)}
                />
                <div className="ms-1 hidden items-center lg:group-hover/label:flex">
                  <button
                    type="button"
                    onClick={() => setLabelModal({ mode: 'rename', label })}
                    className="rounded-full p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={L(isRtl, 'Rename', 'إعادة تسمية')}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeLabel(label.id)
                      if (folder === key) setFolder('inbox')
                    }}
                    className="rounded-full p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Mobile new-label chip */}
          <button
            type="button"
            onClick={() => setLabelModal({ mode: 'create' })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 lg:hidden"
          >
            <Plus size={14} /> {t('newLabel')}
          </button>
        </nav>

        {/* ── Main column ────────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchSubject')}
                  className="ps-9"
                />
              </div>
              <Button
                size="sm"
                variant={showAdvanced ? 'secondary' : 'subtle'}
                onClick={() => setShowAdvanced((v) => !v)}
              >
                <SlidersHorizontal size={15} /> {t('advancedSearch')}
              </Button>
            </div>

            {showAdvanced && (
              <Card className="space-y-3 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t('searchFrom')}>
                    <Input value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
                  </Field>
                  <Field label={t('searchTo')}>
                    <Input value={fTo} onChange={(e) => setFTo(e.target.value)} />
                  </Field>
                  <Field label={t('subject')}>
                    <Input value={fSubject} onChange={(e) => setFSubject(e.target.value)} />
                  </Field>
                  <Field label={L(isRtl, 'Date', 'التاريخ')}>
                    <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
                  </Field>
                  <Field label={t('dateFrom')}>
                    <Input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} />
                  </Field>
                  <Field label={t('dateTo')}>
                    <Input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} />
                  </Field>
                </div>
                {searchActive && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-xs font-semibold text-gate-600 hover:underline"
                  >
                    {t('cancel')}
                  </button>
                )}
              </Card>
            )}
          </div>

          {/* Drafts folder — list of drafts */}
          {folder === 'drafts' ? (
            myDrafts.length === 0 ? (
              <EmptyState title={t('drafts')} subtitle={L(isRtl, 'No drafts yet.', 'لا توجد مسودات بعد.')} />
            ) : (
              <Card className="divide-y divide-slate-100 overflow-hidden p-0">
                {myDrafts.map((d) => (
                  <Row
                    key={d.id}
                    onClick={() => openDraft(d)}
                    leading={<ActorLine actor={d.owner} size={40} showAddress={false} />}
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate">
                          {d.subject || L(isRtl, '(no subject)', '(بدون موضوع)')}
                        </span>
                        <Badge tone="amber">{t('draft')}</Badge>
                      </span>
                    }
                    subtitle={d.body}
                    trailing={
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[11px] text-slate-400">{relativeTime(d.updatedAt, lang)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteDraft(d.id)
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                          aria-label={t('delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    }
                  />
                ))}
              </Card>
            )
          ) : visibleThreads.length === 0 ? (
            <EmptyState
              title={folderTitle}
              subtitle={
                searchActive
                  ? L(isRtl, 'No matching messages.', 'لا توجد رسائل مطابقة.')
                  : L(isRtl, 'No messages yet.', 'لا توجد رسائل بعد.')
              }
            />
          ) : (
            <Card className="divide-y divide-slate-100 overflow-hidden p-0">
              {visibleThreads.map((th) => {
                const other = otherParty(th.latest)
                const unread = !th.latest.readBy.some((k) => keys.has(k))
                const starred = isStarred(th.latest)
                return (
                  <Row
                    key={th.threadId}
                    onClick={() => openThreadDetail(th.threadId)}
                    leading={<ActorLine actor={other} size={40} showAddress={false} />}
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate">{th.latest.subject}</span>
                        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-gate-600" />}
                      </span>
                    }
                    subtitle={th.latest.body}
                    trailing={
                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] text-slate-400">
                            {relativeTime(th.latest.createdAt, lang)}
                          </span>
                          {th.msgs.length > 1 && <Badge tone="slate">{th.msgs.length}</Badge>}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStarMessage(th.latest.id)
                          }}
                          className={cx(
                            'inline-flex h-9 w-9 items-center justify-center rounded-full transition',
                            starred
                              ? 'text-amber-400 hover:bg-amber-50'
                              : 'text-slate-300 hover:bg-slate-100 hover:text-amber-400',
                          )}
                          aria-label={starred ? t('unstar') : t('star')}
                        >
                          <Star size={16} fill={starred ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    }
                  />
                )
              })}
            </Card>
          )}
        </div>
      </div>

      {/* Thread detail */}
      <ThreadSheet
        thread={activeThread}
        keys={keys}
        onClose={() => setOpenThread(null)}
        onReply={() => activeThread && startCompose('reply', activeThread.latest)}
        onReplyAll={() => activeThread && startCompose('replyAll', activeThread.latest)}
        onForward={() => activeThread && startCompose('forward', activeThread.latest)}
        onMove={() => activeThread && setMoveMsg(activeThread.latest)}
        onDelete={(id) => deleteMessage(id)}
        onToggleStar={(id) => toggleStarMessage(id)}
        isStarred={isStarred}
        canReply={can('msg.reply')}
        canReplyAll={can('msg.replyAll')}
        canForward={can('msg.forward')}
        canDelete={can('msg.delete')}
        resolveName={(r) => resolve(r).displayName}
        isRtl={isRtl}
        lang={lang}
        t={t}
      />

      {/* Move → label picker */}
      {moveMsg && (
        <Sheet open onClose={() => setMoveMsg(null)} title={t('moveToLabel')}>
          <div className="py-2">
            <button
              type="button"
              onClick={() => setLabelModal({ mode: 'create', assignTo: moveMsg })}
              className="mb-2 inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
            >
              <Plus size={14} /> {t('newLabel')}
            </button>
            {labelTree.length === 0 ? (
              <EmptyState title={t('noLabels')} />
            ) : (
              <div className="space-y-1">
                {labelTree.map(({ label, depth }) => {
                  const already = (moveMsg.labelIds ?? []).includes(label.id)
                  return (
                    <button
                      key={label.id}
                      type="button"
                      disabled={already}
                      onClick={() => fileUnderLabel(moveMsg, label.id)}
                      style={{ paddingInlineStart: 12 + depth * 16 }}
                      className={cx(
                        'flex w-full items-center gap-2 rounded-2xl py-2 pe-3 text-start text-sm transition',
                        already
                          ? 'cursor-default text-slate-400'
                          : 'text-slate-700 hover:bg-gate-50',
                      )}
                    >
                      <Tag size={15} className="shrink-0 text-gate-500" />
                      <span className="min-w-0 flex-1 truncate">{label.name}</span>
                      {already && <Badge tone="gate">✓</Badge>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Label create / rename modal */}
      {labelModal && (
        <LabelModal
          mode={labelModal.mode}
          initialName={labelModal.mode === 'rename' ? labelModal.label.name : ''}
          labels={myLabels}
          excludeId={labelModal.mode === 'rename' ? labelModal.label.id : undefined}
          onSubmit={submitLabelModal}
          onClose={() => setLabelModal(null)}
          isRtl={isRtl}
          t={t}
        />
      )}

      {/* Compose / reply / forward / draft */}
      {compose && (
        <ComposeEditor
          key={compose.draft ? `draft:${compose.draft.id}` : `${compose.mode}:${compose.source?.id ?? 'new'}`}
          mode={compose.mode}
          source={compose.source}
          draft={compose.draft}
          meKey={actorKey(compose.me)}
          meRef={compose.me}
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

// ── Classification-bar button ──────────────────────────────────────────────────
function FolderButton({
  icon: Icon,
  label,
  badge,
  active,
  depth = 0,
  onClick,
}: {
  icon: typeof InboxIcon
  label: string
  badge?: number
  active?: boolean
  depth?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={depth ? { paddingInlineStart: 12 + depth * 14 } : undefined}
      className={cx(
        'inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition lg:w-full',
        active
          ? 'bg-gate-600 text-light shadow-sm'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:border-transparent lg:bg-transparent lg:hover:bg-slate-100',
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
      {badge != null && (
        <span
          className={cx(
            'ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
            active ? 'bg-light/20 text-light' : 'bg-gate-100 text-gate-700',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Label create / rename modal ─────────────────────────────────────────────────
function LabelModal({
  mode,
  initialName,
  labels,
  excludeId,
  onSubmit,
  onClose,
  isRtl,
  t,
}: {
  mode: 'create' | 'rename'
  initialName: string
  labels: Label[]
  excludeId?: string
  onSubmit: (name: string, parentId: string | null) => void
  onClose: () => void
  isRtl: boolean
  t: (k: string) => string
}) {
  const [name, setName] = useState(initialName)
  const [parentId, setParentId] = useState<string>('')
  const tree = useMemo(() => flattenLabels(labels), [labels])

  const submit = () => {
    if (!name.trim()) return
    onSubmit(name.trim(), parentId || null)
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-4 text-base font-bold text-slate-800">
        {mode === 'rename' ? L(isRtl, 'Rename label', 'إعادة تسمية التصنيف') : t('newLabel')}
      </h2>
      <div className="space-y-4">
        <Field label={t('labelName')} required>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {mode === 'create' && tree.length > 0 && (
          <Field label={t('parentLabel')}>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">—</option>
              {tree
                .filter(({ label }) => label.id !== excludeId)
                .map(({ label, depth }) => (
                  <option key={label.id} value={label.id}>
                    {`${' '.repeat(depth * 2)}${label.name}`}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        <div className="flex gap-2">
          <Button variant="subtle" full onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button full disabled={!name.trim()} onClick={submit}>
            {mode === 'rename' ? t('save') : t('add')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Thread detail sheet ─────────────────────────────────────────────────────────
function ThreadSheet({
  thread,
  keys,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onMove,
  onDelete,
  onToggleStar,
  isStarred,
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
  keys: Set<string>
  onClose: () => void
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
  onMove: () => void
  onDelete: (messageId: string) => void
  onToggleStar: (messageId: string) => void
  isStarred: (m: Message) => boolean
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
  const latestStarred = isStarred(latest)

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
          <Button size="sm" variant="subtle" onClick={onMove}>
            <FolderInput size={15} /> {t('move')}
          </Button>
        </div>
      }
    >
      {/* Header: from / to / cc + star + communication count */}
      <div className="space-y-2 border-b border-slate-100 pb-3 pt-1">
        <ActorLine
          actor={latest.from}
          size={36}
          trailing={
            <button
              type="button"
              onClick={() => onToggleStar(latest.id)}
              className={cx(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
                latestStarred
                  ? 'text-amber-400 hover:bg-amber-50'
                  : 'text-slate-300 hover:bg-slate-100 hover:text-amber-400',
              )}
              aria-label={latestStarred ? t('unstar') : t('star')}
            >
              <Star size={17} fill={latestStarred ? 'currentColor' : 'none'} />
            </button>
          }
        />
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
          const mine = keys.has(actorKey(m.from))
          const starred = isStarred(m)
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
                  {m.system && (
                    <span className={cx('mb-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', mine ? 'bg-light/20 text-light' : 'bg-slate-200 text-slate-500')}>
                      {isRtl ? 'نظامي' : 'System'}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((a) => (
                        <AttachmentChip key={a.id} att={a} onBubble={mine} openLabel={t('openAttachment')} />
                      ))}
                    </div>
                  )}
                </div>
                <div className={cx('mt-1 flex items-center gap-2', mine ? 'justify-end' : 'justify-start')}>
                  <span className="text-[11px] text-slate-400">{relativeTime(m.createdAt, lang)}</span>
                  <button
                    type="button"
                    onClick={() => onToggleStar(m.id)}
                    className={cx(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full transition',
                      starred
                        ? 'text-amber-400 hover:bg-amber-50'
                        : 'text-slate-300 opacity-0 hover:bg-slate-100 hover:text-amber-400 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
                    )}
                    aria-label={starred ? t('unstar') : t('star')}
                  >
                    <Star size={13} fill={starred ? 'currentColor' : 'none'} />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
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
function AttachmentChip({ att, onBubble, openLabel }: { att: AttachmentMeta; onBubble?: boolean; openLabel: string }) {
  // With a dataUrl present, the attachment is openable/downloadable by any viewer.
  if (att.dataUrl && att.type.startsWith('image/')) {
    return (
      <a href={att.dataUrl} target="_blank" rel="noreferrer" download={att.name} title={openLabel}>
        <img
          src={att.dataUrl}
          alt={att.name}
          className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/5 transition hover:ring-2 hover:ring-gate-300"
        />
      </a>
    )
  }
  const content = (
    <>
      <FileText size={13} />
      <span className="max-w-[10rem] truncate">{att.name}</span>
      <span className={onBubble ? 'text-light/70' : 'text-slate-400'}>{humanSize(att.size)}</span>
    </>
  )
  const cls = cx(
    'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium',
    onBubble ? 'bg-white/15 text-light' : 'bg-white text-slate-600 ring-1 ring-slate-200',
  )
  if (att.dataUrl) {
    return (
      <a href={att.dataUrl} target="_blank" rel="noreferrer" download={att.name} title={openLabel} className={cx(cls, 'transition hover:brightness-95')}>
        {content}
      </a>
    )
  }
  // No blob (stripped on reload) — show as a non-clickable preview.
  return <span className={cls}>{content}</span>
}

// ── Unified compose / reply / reply-all / forward / draft editor ────────────────
function ComposeEditor({
  mode,
  source,
  draft,
  meKey,
  meRef,
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
  draft?: Draft
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
  const saveDraftFn = useStore((s) => s.saveDraft)
  const sendDraftFn = useStore((s) => s.sendDraft)

  // Seed the To list + subject from a draft or (when replying) the source message.
  const seedTo = useMemo<ActorRef[]>(() => {
    if (draft) return dedupe(draft.to)
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
  }, [mode, source, meKey, draft])

  const seedSubject = useMemo(() => {
    if (draft) return draft.subject
    if (mode === 'new' || mode === 'forward') return ''
    const s = source?.subject ?? ''
    return s.startsWith('Re: ') ? s : `Re: ${s}`
  }, [mode, source, draft])

  const [toRefs, setToRefs] = useState<ActorRef[]>(seedTo)
  const [toGroups, setToGroups] = useState<string[]>([])
  const [ccRefs, setCcRefs] = useState<ActorRef[]>(draft?.cc ? dedupe(draft.cc) : [])
  const [ccGroups, setCcGroups] = useState<string[]>([])
  const [bccRefs, setBccRefs] = useState<ActorRef[]>(draft?.bcc ? dedupe(draft.bcc) : [])
  const [bccGroups, setBccGroups] = useState<string[]>([])
  const [showCc, setShowCc] = useState(!!draft?.cc?.length)
  const [showBcc, setShowBcc] = useState(!!draft?.bcc?.length)
  const [subject, setSubject] = useState(seedSubject)
  const [body, setBody] = useState(draft?.body ?? '')
  const [attachments, setAttachments] = useState<AttachmentMeta[]>(draft?.attachments ?? [])
  const fileRef = useRef<HTMLInputElement>(null)

  const isForward = mode === 'forward'
  // Drafts make sense for composing/replying, not for forwarding (which carries a source).
  const canDraft = !isForward

  const resolveLevel = (refs: ActorRef[], gids: string[]): ActorRef[] =>
    dedupe([...refs, ...gids.flatMap(expandGroup)]).filter((r) => actorKey(r) !== meKey)

  const to = resolveLevel(toRefs, toGroups)
  const cc = resolveLevel(ccRefs, ccGroups)
  const bcc = resolveLevel(bccRefs, bccGroups)

  const valid =
    to.length > 0 && (isForward || (subject.trim().length > 0 && body.trim().length > 0))

  const canSaveDraft =
    canDraft && (to.length > 0 || subject.trim().length > 0 || body.trim().length > 0 || attachments.length > 0)

  const onFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => {
      const id = uid('att')
      const base: AttachmentMeta = { id, name: f.name, size: f.size, type: f.type }
      setAttachments((prev) => [...prev, base])
      const reader = new FileReader()
      reader.onload = () =>
        setAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, dataUrl: reader.result as string } : a)),
        )
      reader.readAsDataURL(f)
    })
  }

  const saveDraft = () => {
    if (!canSaveDraft) return
    saveDraftFn({
      id: draft?.id,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject: subject.trim(),
      body: body.trim(),
      attachments: attachments.length ? attachments : undefined,
      threadId: draft?.threadId ?? (mode === 'reply' || mode === 'replyAll' ? source?.threadId : undefined),
      as: meRef,
    })
    onClose()
  }

  const send = () => {
    if (!valid) return
    if (draft) {
      // Persist current edits, then hand off to sendDraft (sends + removes the draft).
      const id = saveDraftFn({
        id: draft.id,
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject: subject.trim(),
        body: body.trim(),
        attachments: attachments.length ? attachments : undefined,
        threadId: draft.threadId,
        as: meRef,
      })
      sendDraftFn(id)
    } else if (isForward && source) {
      forwardMessage({
        source,
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        body: body.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
        as: meRef,
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
        as: meRef,
      })
    }
    onClose()
  }

  const title = draft
    ? t('draft')
    : mode === 'reply'
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
          <div className="flex gap-2">
            {canDraft && (
              <Button variant="subtle" disabled={!canSaveDraft} onClick={saveDraft} className="shrink-0">
                <FileText size={16} /> {t('saveDraft')}
              </Button>
            )}
            <Button full disabled={!valid} onClick={send}>
              <SendIcon size={16} /> {to.length > 1 ? `${t('send')} · ${to.length}` : t('send')}
            </Button>
          </div>
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
