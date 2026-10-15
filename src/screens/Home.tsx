import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { MessageCircle, Forward, Bookmark, Send, ImagePlus, X, BadgeCheck, ThumbsUp, ThumbsDown, Smile, Frown } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, relativeTime } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import { PresenceAvatar } from '@/components/AccountSwitcher'
import { useMyInbox } from '@/lib/userScope'
import { BusinessNewsFeed } from '@/components/BusinessNewsFeed'
import { LinkCard } from '@/components/LinkCard'

import type { ActorRef, Post, PostLink, ReactionKind } from '@/types'
import { REACTION_ORDER } from '@/types'
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

type CatTone = 'teal' | 'gate' | 'amber' | 'green' | 'red' | 'violet'
const CAT_TONE: Record<Category, CatTone> = {
  friend: 'teal',
  news: 'gate',
  report: 'amber',
  event: 'green',
  advertising: 'red',
  data: 'violet',
}
const catLabelFor = (c: Category, L: (en: string, ar: string) => string): string => {
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

/** Reaction kind → lucide line icon (replaces raw system emoji). */
const REACT_ICON: Record<ReactionKind, typeof ThumbsUp> = {
  up: ThumbsUp,
  down: ThumbsDown,
  happy: Smile,
  sad: Frown,
}
const isPositive = (k: ReactionKind) => k === 'up' || k === 'happy'

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
  const presenceOf = useStore((s) => s.presenceOf)
  const resolve = useResolveActor()
  const inbox = useMyInbox()

  const canSend = can('post.send')
  const me = active ? resolve(active) : null

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
      {/* Hero */}
      <div className="flex items-end justify-between gap-3 px-1 pt-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-aurora">{t('home')}</h1>
          <p className="text-[12px] font-medium text-slate-500">
            {L('Your verified network, live.', 'شبكتك الموثّقة، مباشرة.')}
          </p>
        </div>
      </div>

      {/* Composer */}
      <Card className="post-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {me && (
            <span className={cx('avatar-ring mt-0.5 shrink-0', me.isVirtual && 'sq')}>
              <span className="block rounded-full bg-white p-[1.5px] dark:bg-white/10">
                <PresenceAvatar
                  name={me.displayName}
                  color={me.color}
                  size={40}
                  square={me.isVirtual}
                  presence={active ? presenceOf(active) : 'active'}
                  photo={me.photo}
                />
              </span>
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('writePost')}
              rows={3}
              disabled={!canSend}
              className="rounded-2xl border-transparent bg-slate-500/[0.05] ring-1 ring-inset ring-slate-900/[0.06] focus:bg-white focus:ring-gate-200 dark:bg-white/5 dark:ring-white/10 dark:focus:bg-white/10"
            />
            {image && (
              <div className="relative inline-block">
                <img
                  src={image}
                  alt=""
                  className="max-h-48 rounded-2xl object-cover ring-1 ring-slate-900/5 dark:ring-white/10"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  aria-label={t('removeImage')}
                  className="absolute end-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-light backdrop-blur-sm transition hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {canSend ? (
              <div className="flex items-center justify-between gap-2 border-t border-slate-900/[0.06] pt-3 dark:border-white/10">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label={t('addImage')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 py-2 text-slate-500 transition hover:bg-gate-500/10 hover:text-gate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <Button onClick={submit} disabled={!body.trim() && !image} className="gap-1.5">
                  <Send className="h-4 w-4" aria-hidden /> {t('send')}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-start">{t('noPermission')}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Egypt business-news service feed (opt-in; renders nothing when off) */}
      <BusinessNewsFeed />

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

/** Render post body with bare URLs turned into tidy truncated links. */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>
        // Don't fold trailing sentence punctuation / closing brackets into the link.
        const m = part.match(/[).,!?;:\]]+$/)
        const url = m ? part.slice(0, part.length - m[0].length) : part
        const tail = m ? m[0] : ''
        return (
          <span key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="font-medium text-gate-700 underline decoration-gate-300 underline-offset-2 hover:text-gate-800"
            >
              {prettyUrl(url)}
            </a>
            {tail}
          </span>
        )
      })}
    </>
  )
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    return u.pathname.length > 1 ? `${host}${u.pathname.length > 16 ? u.pathname.slice(0, 16) + '…' : u.pathname}` : host
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '…' : url
  }
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
  const presenceOf = useStore((s) => s.presenceOf)
  const resolve = useResolveActor()
  const ra = resolve(post.author)

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
    <Card
      className="post-card p-4 sm:p-5 space-y-3.5 animate-fade-in transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.997]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cx('avatar-ring shrink-0', ra.isVirtual && 'sq')}>
            <span className="block rounded-full bg-white p-[1.5px] dark:bg-white/10">
              <PresenceAvatar
                name={ra.displayName}
                color={ra.color}
                size={44}
                square={ra.isVirtual}
                presence={presenceOf(post.author)}
                photo={ra.photo}
              />
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-[15px] font-semibold leading-tight text-slate-800">{ra.displayName}</span>
              {!ra.isVirtual && <BadgeCheck className="h-4 w-4 shrink-0 text-gate-500" aria-label={L('Verified', 'موثّق')} />}
            </div>
            {ra.address && (
              <div className="truncate font-address text-[11px] leading-tight text-gate-700">
                <bdi>{ra.address}</bdi>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={CAT_TONE[post.category]} className="shadow-sm">{catLabelFor(post.category, L)}</Badge>
          <span className="text-[11px] leading-none text-slate-500 tabular-nums">{relativeTime(post.createdAt, lang)}</span>
        </div>
      </div>

      {post.body && (
        <p className="text-[15px] leading-[1.6] text-slate-700 whitespace-pre-wrap text-start [overflow-wrap:anywhere]">
          <Linkify text={post.body} />
        </p>
      )}

      {post.link && <LinkCard link={post.link} />}

      {post.image && (
        <img
          src={post.image}
          alt={L('Attached image', 'صورة مرفقة')}
          className="max-h-80 w-full rounded-2xl object-cover ring-1 ring-slate-900/5 dark:ring-white/10"
        />
      )}

      {/* Actions */}
      <div className="mt-1 flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-500/[0.04] px-1.5 py-1 ring-1 ring-inset ring-slate-900/5 dark:bg-white/[0.03] dark:ring-white/10">
        <Reactions reactionsBy={post.reactionsBy} mine={myReaction} onReact={onReact} />
        <ActionButton
          active={open}
          onClick={() => setOpen((v) => !v)}
          icon={<MessageCircle className="w-4 h-4" aria-hidden />}
          label={String(post.comments.length)}
          ariaLabel={t('comments')}
          activeClass="text-gate-700 bg-gate-500/10"
        />
        <ActionButton
          onClick={() => {}}
          disabled={!canForward}
          icon={<Forward className="w-4 h-4" aria-hidden />}
          ariaLabel={t('forward')}
        />
        <div className="flex-1" />
        <ActionButton
          active={saved}
          onClick={onSave}
          ariaLabel={saved ? t('saved') : t('save')}
          icon={<Bookmark className={cx('w-4 h-4', saved && 'fill-current')} aria-hidden />}
          activeClass="text-gate-700 bg-gate-500/10"
        />
      </div>

      {/* Comments */}
      {open && (
        <div className="space-y-3 border-t border-slate-900/5 pt-3 dark:border-white/10">
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
                aria-label={t('send')}
              >
                <Send className="w-4 h-4" aria-hidden />
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
  ariaLabel,
  active,
  disabled,
  onClick,
  activeClass = 'text-gate-600',
}: {
  icon: ReactNode
  label?: string
  ariaLabel?: string
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
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cx(
        'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        disabled
          ? 'text-slate-300 cursor-not-allowed'
          : active
            ? activeClass
            : 'text-slate-500 hover:bg-slate-500/10',
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
    <div
      role="group"
      aria-label={t('reactions')}
      className="inline-flex items-center gap-0.5 rounded-full bg-slate-500/5 p-0.5 ring-1 ring-inset ring-slate-900/5 dark:bg-white/5 dark:ring-white/10"
    >
      {REACTION_ORDER.map((kind) => {
        const Icon = REACT_ICON[kind]
        const count = values.filter((v) => v === kind).length
        const active = mine === kind
        const pos = isPositive(kind)
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onReact(kind)}
            aria-label={label(kind)}
            aria-pressed={active}
            title={label(kind)}
            className={cx(
              'inline-flex min-h-[30px] items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
              active
                ? pos
                  ? 'bg-white text-gate-700 shadow-sm ring-1 ring-gate-200 dark:bg-white/10'
                  : 'bg-white text-rose-600 shadow-sm ring-1 ring-rose-200 dark:bg-white/10 dark:text-rose-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-700',
            )}
          >
            <Icon
              className={cx('h-4 w-4', active && (pos ? 'fill-gate-500/15' : 'fill-rose-500/15'))}
              strokeWidth={active ? 2.3 : 2}
              aria-hidden
            />
            {count > 0 && <span className="tabular-nums leading-none">{count}</span>}
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
