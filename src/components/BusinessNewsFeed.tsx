import { useState } from 'react'
import { Newspaper, ExternalLink, RefreshCw, SlidersHorizontal, Power, Share2, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { relativeTime } from '@/lib/identity'
import { useActiveNewsContext, useEgyptNews } from '@/lib/news'
import type { NewsItem } from '@/lib/news'
import { INDUSTRY_LABELS } from '@/data/reference'
import { Badge, Button, Card, Chip, Sheet, Textarea } from '@/ui/primitives'
import { LinkThumb } from '@/components/LinkCard'

/**
 * Egypt business-news service feed (Strategy edition) — Aurora Glass.
 *
 * A free (key-less) external service surfaced at the top of Home, on by default
 * (people can opt out). Headlines are tuned to the identity the person is currently
 * acting as. Each item carries the publisher's logo, links out, and can be shared
 * into the feed as a post. The gear opens the feed's own preferences in place.
 */
export function BusinessNewsFeed() {
  const nav = useNavigate()
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const prefs = useStore((s) => s.newsFeed())
  const setNewsFeedScope = useStore((s) => s.setNewsFeedScope)
  const setNewsFeedEnabled = useStore((s) => s.setNewsFeedEnabled)
  const addPost = useStore((s) => s.addPost)
  const can = useStore((s) => s.can)
  const ctx = useActiveNewsContext()
  const { state, refresh } = useEgyptNews({ enabled: prefs.enabled, scope: prefs.scope, lang, ctx })

  const [prefsOpen, setPrefsOpen] = useState(false)
  const [shareItem, setShareItem] = useState<NewsItem | null>(null)
  const [shareText, setShareText] = useState('')
  const canShare = can('post.send')

  if (!prefs.enabled) return null

  // Relevance label: which personality/industry this feed is tuned to.
  const contextLabel =
    prefs.scope === 'all'
      ? t('newsScopeAll')
      : ctx.industry
        ? (isRtl ? INDUSTRY_LABELS[ctx.industry].ar : INDUSTRY_LABELS[ctx.industry].en)
        : L('General business', 'أعمال عامة')

  const openShare = (item: NewsItem) => {
    setShareText('')
    setShareItem(item)
  }
  const submitShare = () => {
    if (!shareItem || !canShare) return
    // Attach the article as a structured link-card — never dump the raw URL in the body.
    addPost(shareText.trim(), 'news', undefined, undefined, {
      url: shareItem.link,
      title: shareItem.title,
      source: shareItem.source,
      image: shareItem.image,
      domain: shareItem.domain,
    })
    setShareItem(null)
    setShareText('')
  }

  return (
    <Card className="glow-gate overflow-hidden p-0">
      {/* Hero header band */}
      <div className="flex items-start justify-between gap-2 bg-gradient-to-br from-gate-500/10 to-teal-500/5 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gate-500 to-gate-700 text-light shadow-sm shadow-gate-600/40">
            <Newspaper className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold text-slate-800 text-glow">{t('businessNews')}</span>
              <Badge tone="gate">{t('newsServiceLabel')}</Badge>
            </div>
            <div className="truncate text-[11px] font-medium text-slate-500">
              {contextLabel}
              {ctx.isVirtual && ctx.company ? ` · ${ctx.company}` : ''}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton onClick={refresh} label={t('newsRefresh')}>
            <RefreshCw className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton onClick={() => setPrefsOpen(true)} label={t('newsPrefs')}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className="px-2 pb-2 sm:px-3 sm:pb-3">
        {state.status === 'loading' && (
          <p className="py-6 text-center text-xs text-slate-500">{t('newsLoading')}</p>
        )}
        {state.status === 'unavailable' && (
          <p className="py-6 text-center text-xs text-slate-500">{t('newsUnavailable')}</p>
        )}
        {state.status === 'empty' && (
          <p className="py-6 text-center text-xs text-slate-500">{t('newsEmpty')}</p>
        )}

        {state.status === 'ready' && (
          <ul className="space-y-1">
            {state.items.map((item) => (
              <li
                key={item.id}
                className="group flex items-start gap-3 rounded-2xl p-2 ring-1 ring-inset ring-transparent transition hover:bg-slate-500/[0.04] hover:ring-slate-900/5 dark:hover:ring-white/10"
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
                >
                  <Thumb src={item.image} source={item.source} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-slate-800 text-start">
                      {item.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-gate-700">{item.source}</span>
                      {item.publishedAt && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{relativeTime(item.publishedAt, lang)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </a>
                <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                  {canShare && (
                    <IconButton onClick={() => openShare(item)} label={t('newsShare')} small>
                      <Share2 className="h-3.5 w-3.5" aria-hidden />
                    </IconButton>
                  )}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={L('Open article', 'فتح المقال')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-500/10 hover:text-gate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Share a headline into the feed as a post */}
      <Sheet
        open={!!shareItem}
        onClose={() => setShareItem(null)}
        title={t('newsShareTitle')}
        footer={
          <Button full onClick={submitShare}>
            <Send size={16} />
            {t('newsSharePost')}
          </Button>
        }
      >
        <div className="space-y-3">
          {shareItem && (
            <div className="link-card pointer-events-none flex items-stretch overflow-hidden rounded-2xl">
              <LinkThumb src={shareItem.image} source={shareItem.source} />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 py-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gate-700">
                  <span className="truncate">{shareItem.source}</span>
                  {shareItem.domain && (
                    <>
                      <span className="text-slate-300" aria-hidden>·</span>
                      <span className="truncate font-medium normal-case tracking-normal text-slate-500">{shareItem.domain}</span>
                    </>
                  )}
                </div>
                <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-slate-800 text-start">{shareItem.title}</p>
              </div>
            </div>
          )}
          <Textarea value={shareText} onChange={(e) => setShareText(e.target.value)} rows={4} placeholder={t('newsShareCaption')} />
          <p className="text-[11px] text-slate-500">{t('newsShareHint')}</p>
        </div>
      </Sheet>

      {/* Feed preferences — opened from the gear, in place */}
      <Sheet open={prefsOpen} onClose={() => setPrefsOpen(false)} title={t('businessNews')}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700 text-start">{t('newsRelevance')}</div>
            <p className="text-[12px] leading-snug text-slate-500 text-start">{t('businessNewsDesc')}</p>
            <div className="flex gap-2 pt-1">
              <Chip active={prefs.scope === 'auto'} onClick={() => setNewsFeedScope('auto')}>
                {t('newsScopeAuto')}
              </Chip>
              <Chip active={prefs.scope === 'all'} onClick={() => setNewsFeedScope('all')}>
                {t('newsScopeAll')}
              </Chip>
            </div>
            {prefs.scope === 'auto' && (
              <p className="text-[11px] text-slate-400 text-start">
                {L('Now showing: ', 'يظهر الآن: ')}
                {contextLabel}
                {ctx.isVirtual && ctx.company ? ` · ${ctx.company}` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200/60 pt-4">
            <Button
              variant="secondary"
              full
              onClick={() => {
                setPrefsOpen(false)
                nav('/settings')
              }}
            >
              {t('newsOpenSettings')}
            </Button>
            <Button
              variant="ghost"
              full
              onClick={() => {
                setNewsFeedEnabled(false)
                setPrefsOpen(false)
              }}
            >
              <Power size={16} />
              {t('newsTurnOff')}
            </Button>
          </div>
        </div>
      </Sheet>
    </Card>
  )
}

/** Publisher-logo thumbnail with a graceful first-letter fallback. */
function Thumb({ src, source }: { src: string; source: string }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/40 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5">
        <img src={src} alt="" className="h-6 w-6 object-contain" loading="lazy" onError={() => setFailed(true)} />
      </span>
    )
  }
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gate-500/80 to-gate-700/80 text-sm font-bold text-light shadow-sm">
      {source.trim().charAt(0).toUpperCase() || 'N'}
    </span>
  )
}

function IconButton({
  onClick,
  label,
  children,
  small,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cxBtn(small)}
    >
      {children}
    </button>
  )
}

function cxBtn(small?: boolean): string {
  const base =
    'inline-flex items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-500/10 hover:text-gate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400'
  return `${base} ${small ? 'h-7 w-7' : 'h-9 w-9'}`
}
