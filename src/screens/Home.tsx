import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Heart, MessageCircle, Forward, Bookmark, Send, ChevronDown, Globe, UsersRound, Check } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, relativeTime } from '@/lib/identity'
import { ActorLine } from '@/components/identity'
import { useDirectory, useMyInbox } from '@/lib/userScope'

import type { ActorRef, Post } from '@/types'
import {
  cx,
  Button,
  Card,
  Badge,
  Chip,
  Textarea,
  Select,
  EmptyState,
} from '@/ui/primitives'

type Category = Post['category']

const CATEGORIES: Category[] = [
  'friend',
  'news',
  'report',
  'event',
  'advertising',
  'data',
]

export function Home() {
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const catLabel = (c: Category): string => {
    switch (c) {
      case 'friend':
        return L('Friend', 'صديق')
      case 'news':
        return L('News', 'أخبار')
      case 'report':
        return L('Report', 'تقرير')
      case 'event':
        return L('Event', 'فعالية')
      case 'advertising':
        return L('Advertising', 'إعلان')
      case 'data':
        return L('Data', 'بيانات')
    }
  }

  const catTone = (c: Category) => {
    switch (c) {
      case 'friend':
        return 'teal' as const
      case 'news':
        return 'gate' as const
      case 'report':
        return 'amber' as const
      case 'event':
        return 'green' as const
      case 'advertising':
        return 'red' as const
      case 'data':
        return 'violet' as const
    }
  }

  const posts = useStore((s) => s.posts)
  const active = useStore((s) => s.active)
  const can = useStore((s) => s.can)
  const addPost = useStore((s) => s.addPost)
  const reactPost = useStore((s) => s.reactPost)
  const savePost = useStore((s) => s.savePost)
  const groupRecipients = useStore((s) => s.groupRecipients)
  const dir = useDirectory()
  const inbox = useMyInbox()

  const canSend = can('post.send')

  const [body, setBody] = useState('')
  // Audience is a single choice: null = everyone in the directory, or one group id.
  const [toGroup, setToGroup] = useState<string | null>(null)

  const meKey = active ? actorKey(active) : ''

  const audienceGroups = useMemo(
    () => dir.groups.map((g) => ({ id: g.id, name: g.name, count: groupRecipients(g.id).filter((r) => actorKey(r) !== meKey).length })),
    [dir.groups, groupRecipients, meKey],
  )
  const expandGroup = (id: string): ActorRef[] => groupRecipients(id).filter((r) => actorKey(r) !== meKey)

  // A post is visible if I authored it, it's a legacy broadcast (no audience),
  // or its audience includes one of my accounts.
  const visible = useMemo(() => {
    const keys = inbox.keys
    const list = posts.filter((p) => !p.audience || keys.has(actorKey(p.author)) || p.audience.some((k) => keys.has(k)))
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [posts, inbox.keys])

  const submit = () => {
    const text = body.trim()
    if (!text || !canSend) return
    // Audience = the chosen group (expanded), or the whole directory by default.
    // Always include the author so the audience is never empty — an empty audience
    // would collapse to undefined and be treated as a legacy broadcast (leak).
    const recipients = toGroup ? expandGroup(toGroup) : dir.people
    const audienceKeys = Array.from(new Set([...recipients.map(actorKey), meKey].filter(Boolean)))
    addPost(text, 'friend', audienceKeys)
    setBody('')
    setToGroup(null)
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Composer */}
      <Card className="p-4 space-y-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('writePost')}
          rows={3}
          disabled={!canSend}
        />
        {canSend ? (
          <div className="flex items-center justify-end">
            <AudienceSend
              disabled={!body.trim()}
              groups={audienceGroups}
              value={toGroup}
              onChange={setToGroup}
              onSend={submit}
              sendLabel={t('send')}
              L={L}
              isRtl={isRtl}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-start">{t('noPermission')}</p>
        )}
      </Card>

      {/* Feed */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="w-7 h-7" />}
          title={t('empty')}
          subtitle={t('feed')}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((p, i) => (
            <PostCard
              key={p.id}
              post={p}
              index={i}
              meKey={meKey}
              lang={lang}
              L={L}
              onReact={() => reactPost(p.id)}
              onSave={() => savePost(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Split "Send" button: the primary action posts, while the attached caret opens
 * a compact menu to pick the audience — everyone in the directory (default) or
 * a single group. Uses the blur-timer dismissal pattern shared with the app.
 */
function AudienceSend({
  disabled,
  groups,
  value,
  onChange,
  onSend,
  sendLabel,
  L,
  isRtl,
}: {
  disabled: boolean
  groups: { id: string; name: string; count: number }[]
  value: string | null
  onChange: (id: string | null) => void
  onSend: () => void
  sendLabel: string
  L: (en: string, ar: string) => string
  isRtl: boolean
}) {
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const everyone = L('Everyone in your directory', 'كل من في دليلك')
  const selectedGroup = value ? groups.find((g) => g.id === value) : undefined
  const chip = selectedGroup ? selectedGroup.name : L('Everyone', 'الجميع')

  const choose = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <span className="max-w-[10rem] truncate text-xs text-slate-500">
        {L('To', 'إلى')}: <span className="font-medium text-slate-600">{chip}</span>
      </span>

      <div className="inline-flex overflow-hidden rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="bg-gate-600 px-4 py-2.5 text-sm font-medium text-light transition-all hover:bg-gate-700 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
        >
          {sendLabel}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150)
          }}
          aria-label={L('Choose audience', 'اختر الجمهور')}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center border-s border-gate-500/40 bg-gate-600 ps-1.5 pe-2.5 text-light transition-all hover:bg-gate-700 active:scale-[0.97]"
        >
          <ChevronDown size={16} className={cx('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-20 mt-1 max-h-64 w-56 overflow-y-auto thin-scroll rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <AudienceOption
            icon={<Globe size={15} className="shrink-0 text-gate-500" />}
            label={everyone}
            selected={!value}
            onSelect={() => choose(null)}
            isRtl={isRtl}
          />
          {groups.map((g) => (
            <AudienceOption
              key={g.id}
              icon={<UsersRound size={15} className="shrink-0 text-teal-500" />}
              label={g.name}
              count={g.count}
              selected={value === g.id}
              onSelect={() => choose(g.id)}
              isRtl={isRtl}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AudienceOption({
  icon,
  label,
  count,
  selected,
  onSelect,
  isRtl,
}: {
  icon: ReactNode
  label: string
  count?: number
  selected: boolean
  onSelect: () => void
  isRtl: boolean
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={cx(
        'flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition hover:bg-slate-50',
        selected ? 'text-gate-700' : 'text-slate-700',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && <span className="shrink-0 text-[11px] text-slate-400">{count}</span>}
      {selected && <Check size={15} className={cx('shrink-0 text-gate-600', isRtl ? 'me-0' : 'ms-0')} />}
    </button>
  )
}

function PostCard({
  post,
  index,
  meKey,
  lang,
  L,
  onReact,
  onSave,
}: {
  post: Post
  index: number
  meKey: string
  lang: 'en' | 'ar'
  L: (en: string, ar: string) => string
  onReact: () => void
  onSave: () => void
}) {
  const { t } = useLang()
  const can = useStore((s) => s.can)
  const commentPost = useStore((s) => s.commentPost)

  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')

  const reacted = meKey ? post.reactedBy.includes(meKey) : false
  const saved = meKey ? post.savedBy.includes(meKey) : false
  const canComment = can('post.comment')
  const canForward = can('post.forward')

  const submitComment = () => {
    const text = comment.trim()
    if (!text || !canComment) return
    commentPost(post.id, text)
    setComment('')
  }

  return (
    <Card className="p-4 space-y-3 animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <ActorLine actor={post.author} size={40} showAddress />
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[11px] leading-none text-slate-500">
            {relativeTime(post.createdAt, lang)}
          </span>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap text-start">
        {post.body}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 text-slate-500 border-t border-slate-100 -mx-4 px-3 pt-2 mt-1">
        <ActionButton
          active={reacted}
          onClick={onReact}
          icon={<Heart className={cx('w-4 h-4', reacted && 'fill-current')} />}
          label={String(post.reactions)}
          activeClass="text-rose-500 bg-rose-50"
        />
        <ActionButton
          active={open}
          onClick={() => setOpen((v) => !v)}
          icon={<MessageCircle className="w-4 h-4" />}
          label={String(post.comments.length)}
          activeClass="text-gate-600 bg-gate-50"
        />
        <ActionButton
          onClick={() => {}}
          disabled={!canForward}
          icon={<Forward className="w-4 h-4" />}
          label={t('forward')}
        />
        <div className="flex-1" />
        <ActionButton
          active={saved}
          onClick={onSave}
          icon={<Bookmark className={cx('w-4 h-4', saved && 'fill-current')} />}
          activeClass="text-gate-600 bg-gate-50"
        />
      </div>

      {/* Comments */}
      {open && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          {post.comments.length === 0 ? (
            <p className="text-xs text-slate-500 text-start">{t('comments')}</p>
          ) : (
            post.comments.map((c) => {
              return (
                <div key={c.id} className="flex flex-col gap-0.5">
                  <ActorLine actor={c.author} size={28} />
                  <p className="text-sm text-slate-700 ps-[38px] text-start">{c.body}</p>
                  <span className="text-xs text-slate-500 ps-[38px]">
                    {relativeTime(c.createdAt, lang)}
                  </span>
                </div>
              )
            })
          )}

          {canComment ? (
            <div className="flex items-end gap-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('writeComment')}
                rows={1}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={submitComment}
                disabled={!comment.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-start">{t('noPermission')}</p>
          )}
        </div>
      )}
    </Card>
  )
}

function ActionButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  activeClass = 'text-gate-600',
}: {
  icon: ReactNode
  label?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  activeClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        disabled
          ? 'text-slate-300 cursor-not-allowed'
          : active
            ? activeClass
            : 'text-slate-500 hover:bg-slate-100',
      )}
    >
      {icon}
      {label != null && <span>{label}</span>}
    </button>
  )
}
