import { Newspaper, ExternalLink, RefreshCw, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { relativeTime } from '@/lib/identity'
import { useActiveNewsContext, useEgyptNews } from '@/lib/news'
import { INDUSTRY_LABELS } from '@/data/reference'
import { Badge, Card } from '@/ui/primitives'

/**
 * Egypt business-news service feed (Strategy edition).
 *
 * An opt-in, free (key-less) external service surfaced at the top of Home. Headlines
 * are tuned to the identity the person is currently acting as: a virtual personality
 * inherits its entity's industry; a personal account uses its career industry. It
 * renders nothing until the person turns it on in Settings → Preferences.
 */
export function BusinessNewsFeed() {
  const nav = useNavigate()
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const prefs = useStore((s) => s.newsFeed())
  const ctx = useActiveNewsContext()
  const { state, refresh } = useEgyptNews({ enabled: prefs.enabled, scope: prefs.scope, lang, ctx })

  if (!prefs.enabled) return null

  // Relevance label: which personality/industry this feed is tuned to.
  const contextLabel =
    prefs.scope === 'all'
      ? t('newsScopeAll')
      : ctx.industry
        ? (isRtl ? INDUSTRY_LABELS[ctx.industry].ar : INDUSTRY_LABELS[ctx.industry].en)
        : L('General business', 'أعمال عامة')

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gate-50 text-gate-600">
            <Newspaper className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold text-slate-800">{t('businessNews')}</span>
              <Badge tone="gate">{t('newsServiceLabel')}</Badge>
            </div>
            <div className="truncate text-[11px] text-slate-500">
              {contextLabel}
              {ctx.isVirtual && ctx.company ? ` · ${ctx.company}` : ''}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={refresh}
            aria-label={t('newsRefresh')}
            title={t('newsRefresh')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => nav('/settings')}
            aria-label={t('newsManage')}
            title={t('newsManage')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {state.status === 'loading' && (
        <p className="py-3 text-center text-xs text-slate-400">{t('newsLoading')}</p>
      )}

      {state.status === 'unavailable' && (
        <p className="py-3 text-center text-xs text-slate-400">{t('newsUnavailable')}</p>
      )}

      {state.status === 'empty' && (
        <p className="py-3 text-center text-xs text-slate-400">{t('newsEmpty')}</p>
      )}

      {state.status === 'ready' && (
        <ul className="divide-y divide-slate-100">
          {state.items.map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group -mx-1 flex items-start gap-2 rounded-xl px-1 py-2.5 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug text-slate-800 text-start">
                    {item.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-gate-700">{item.source}</span>
                    {item.publishedAt && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{relativeTime(item.publishedAt, lang)}</span>
                      </>
                    )}
                  </div>
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-gate-500" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
