import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { MessageCircle, Forward, Bookmark, Send, ImagePlus, X } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, relativeTime } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import { PresenceAvatar } from '@/components/AccountSwitcher'
import { useMyInbox } from '@/lib/userScope'

import type { ActorRef, Post, ReactionKind } from '@/types'
import { REACTION_EMOJI, REACTION_ORDER } from '@/types'
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
  const inbox = useMyInbox()

  const canSend = can('post.send')

  const [body, setBody] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const meKey = active ? actorKey(active) : ''

  // A post is visible if I authored it, it's a legacy broadcast (no audience),
  // or its audience includes one of my accounts.
  const visible = useMemo(() => {
    const keys = inbox.keys
    const list = posts.filter((p) => !p.audience || keys.has(actorKey(p.author)) || p.audience.some((k) => keys.has(k)))
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [posts, inbox.keys])

  const pickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  const submit = () => {
    const text = body.trim()
    if ((!text && !image) || !canSend) return
    // Default broadcast audience (undefined = visible to everyone), same as the old "Everyone".
    addPost(text, 'friend', undefined, image ?? undefined)
    setBody('')
    setImage(null)
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
        {image && (
          <div className="relative inline-block">
            <img
              src={image}
              alt=""
              className="max-h-48 rounded-2xl border border-slate-100 object-cover"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label={t('removeImage')}
              className="absolute end-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-light transition hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {canSend ? (
          <div className="flex items-center justify-between gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={pickImage}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={t('addImage')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <Button onClick={submit} disabled={!body.trim() && !image}>
              {t('send')}
            </Button>
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
              onReact={(kind) => reactPost(p.id, kind)}
              onSave={() => savePost(p.id)}
            />
          ))}
        </div>
      )}
    </div>
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
  onReact: (kind: ReactionKind) => void
  onSave: () => void
}) {
  const { t } = useLang()
  const can = useStore((s) => s.can)
  const commentPost = useStore((s) => s.commentPost)
  const reactComment = useStore((s) => s.reactComment)

  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')

  const myReaction = meKey ? post.reactionsBy?.[meKey] : undefined
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
        <PresenceActorLine actor={post.author} size={40} showAddress />
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[11px] leading-none text-slate-500">
            {relativeTime(post.createdAt, lang)}
          </span>
        </div>
      </div>

      {post.body && (
        <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap text-start">
          {post.body}
        </p>
      )}

      {post.image && (
        <img
          src={post.image}
          alt=""
          className="max-h-80 w-full rounded-2xl border border-slate-100 object-cover"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 text-slate-500 border-t border-slate-100 -mx-4 px-3 pt-2 mt-1">
        <Reactions reactionsBy={post.reactionsBy} mine={myReaction} onReact={onReact} />
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
              const myCommentReaction = meKey ? c.reactionsBy?.[meKey] : undefined
              return (
                <div key={c.id} className="flex flex-col gap-0.5">
                  <PresenceActorLine actor={c.author} size={28} />
                  <p className="text-sm text-slate-700 ps-[38px] text-start">{c.body}</p>
                  <span className="text-xs text-slate-500 ps-[38px]">
                    {relativeTime(c.createdAt, lang)}
                  </span>
                  <div className="ps-[34px]">
                    <Reactions
                      reactionsBy={c.reactionsBy}
                      mine={myCommentReaction}
                      onReact={(kind) => reactComment(post.id, c.id, kind)}
                    />
                  </div>
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

/** Compact 4-way emoji reaction control (👍 👎 😊 😢) used on posts and replies. */
function Reactions({
  reactionsBy,
  mine,
  onReact,
}: {
  reactionsBy: Record<string, ReactionKind>
  mine?: ReactionKind
  onReact: (kind: ReactionKind) => void
}) {
  const { t } = useLang()
  const values = Object.values(reactionsBy ?? {})
  const label = (kind: ReactionKind): string => {
    switch (kind) {
      case 'up':
        return t('reactLike')
      case 'down':
        return t('reactDislike')
      case 'happy':
        return t('reactHappy')
      case 'sad':
        return t('reactSad')
    }
  }
  return (
    <div className="flex items-center gap-0.5">
      {REACTION_ORDER.map((kind) => {
        const count = values.filter((v) => v === kind).length
        const active = mine === kind
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onReact(kind)}
            aria-label={label(kind)}
            aria-pressed={active}
            title={label(kind)}
            className={cx(
              'inline-flex min-h-[32px] items-center gap-1 rounded-full px-1.5 py-1 text-xs font-medium transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
              active ? 'bg-gate-50 text-gate-700 ring-1 ring-gate-200' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            <span className="text-sm leading-none">{REACTION_EMOJI[kind]}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Like `ActorLine`, but the avatar carries the author's live presence dot. */
function PresenceActorLine({
  actor,
  size,
  showAddress = true,
}: {
  actor: ActorRef
  size: number
  showAddress?: boolean
}) {
  const resolve = useResolveActor()
  const presenceOf = useStore((s) => s.presenceOf)
  const r = resolve(actor)
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <PresenceAvatar
        name={r.displayName}
        color={r.color}
        size={size}
        square={r.isVirtual}
        presence={presenceOf(actor)}
        photo={r.photo}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800 leading-tight">{r.displayName}</div>
        {showAddress && r.address && (
          <div className="truncate font-address text-[11px] text-gate-700">
            <bdi>{r.address}</bdi>
          </div>
        )}
      </div>
    </div>
  )
}
