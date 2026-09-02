import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Heart, MessageCircle, Forward, Bookmark, Send } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, relativeTime } from '@/lib/identity'
import { ActorLine, useResolveActor } from '@/components/identity'

import type { Post } from '@/types'
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

  const canSend = can('post.send')

  const [body, setBody] = useState('')
  const [composerCat, setComposerCat] = useState<Category>('friend')
  const [filter, setFilter] = useState<Category | 'all'>('all')

  const meKey = active ? actorKey(active) : ''

  const visible = useMemo(() => {
    const list = filter === 'all' ? posts : posts.filter((p) => p.category === filter)
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [posts, filter])

  const submit = () => {
    const text = body.trim()
    if (!text || !canSend) return
    addPost(text, composerCat)
    setBody('')
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
        <div className="flex items-center gap-2">
          <Select
            value={composerCat}
            onChange={(e) => setComposerCat(e.target.value as Category)}
            disabled={!canSend}
            className="w-auto min-w-[8rem]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {catLabel(c)}
              </option>
            ))}
          </Select>
          <div className="flex-1" />
          <Button
            variant="primary"
            onClick={submit}
            disabled={!canSend || !body.trim()}
          >
            {t('send')}
          </Button>
        </div>
        {!canSend && (
          <p className="text-xs text-slate-500 text-start">{t('noPermission')}</p>
        )}
      </Card>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          {L('All', 'الكل')}
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {catLabel(c)}
          </Chip>
        ))}
      </div>

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
              catLabel={catLabel(p.category)}
              catTone={catTone(p.category)}
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

function PostCard({
  post,
  index,
  meKey,
  lang,
  catLabel,
  catTone,
  L,
  onReact,
  onSave,
}: {
  post: Post
  index: number
  meKey: string
  lang: 'en' | 'ar'
  catLabel: string
  catTone: 'slate' | 'green' | 'amber' | 'red' | 'gate' | 'teal' | 'violet'
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
          <Badge tone={catTone}>{catLabel}</Badge>
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
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
