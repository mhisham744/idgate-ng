import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/store'
import type { Industry } from '@/types'

/** One headline from the Egypt business-news service. Mirrors api/egypt-news.ts. */
export interface NewsItem {
  id: string
  title: string
  link: string
  source: string
  publishedAt: string
  snippet: string
  /** Publisher-logo thumbnail (may be empty). */
  image: string
  /** Publisher display domain, e.g. "ahram.org.eg". */
  domain: string
}

/** Per-person preference for the business-news service feed. */
export interface NewsFeedPrefs {
  /** On by default; the person can opt out in Settings. */
  enabled: boolean
  /** 'auto' tailors headlines to the active identity's industry; 'all' = general Egypt business. */
  scope: 'auto' | 'all'
}

export const DEFAULT_NEWS_PREFS: NewsFeedPrefs = { enabled: true, scope: 'auto' }

const INDUSTRIES: Industry[] = [
  'Manufacturing',
  'Education',
  'Energy',
  'IT',
  'Sports',
  'Governmental',
  'Finance',
]

const asIndustry = (v: string | undefined): Industry | undefined =>
  v && (INDUSTRIES as string[]).includes(v) ? (v as Industry) : undefined

export interface NewsContext {
  /** Industry the feed is tailored to (from the active personality), if any. */
  industry?: Industry
  /** Company name to bias company-specific headlines (virtual accounts). */
  company?: string
  /** Whether the acting account is a virtual personality. */
  isVirtual: boolean
}

/**
 * Derive the news-relevance context from the ACTIVE account (the virtual
 * personality in play): a virtual account inherits its entity's industry and
 * commercial name; a personal account uses its career industry if set.
 */
export function useActiveNewsContext(): NewsContext {
  const active = useStore((s) => s.active)
  const entity = useStore((s) => s.entity)
  const virtual = useStore((s) => s.virtual)
  const currentNormal = useStore((s) => s.currentNormal)

  if (active?.kind === 'virtual') {
    const v = virtual(active.virtualId)
    const e = v ? entity(v.entityId) : undefined
    return { industry: e?.mainIndustry, company: e?.commercialName, isVirtual: true }
  }
  const n = currentNormal()
  return { industry: asIndustry(n?.career?.industry), isVirtual: false }
}

type NewsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; items: NewsItem[] }
  | { status: 'empty' }
  | { status: 'unavailable' } // no /api in this build (static host) or source unreachable

/**
 * Fetch the Egypt business-news service feed when enabled, re-fetching whenever the
 * active personality (and therefore the relevance context) or language changes.
 */
export function useEgyptNews(opts: {
  enabled: boolean
  scope: 'auto' | 'all'
  lang: 'en' | 'ar'
  ctx: NewsContext
}): { state: NewsState; refresh: () => void } {
  const { enabled, scope, lang, ctx } = opts
  const [state, setState] = useState<NewsState>({ status: 'idle' })
  const [nonce, setNonce] = useState(0)

  const key = `${enabled}|${scope}|${lang}|${ctx.industry ?? ''}|${ctx.company ?? ''}|${nonce}`

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })

    const params = new URLSearchParams({ lang, scope })
    if (scope === 'auto') {
      if (ctx.industry) params.set('industry', ctx.industry)
      if (ctx.company) params.set('company', ctx.company)
    }

    fetch(`/api/egypt-news?${params.toString()}`, { headers: { Accept: 'application/json' } })
      .then(async (r) => {
        // A static build (no /api) serves index.html → not JSON → treat as unavailable.
        const ct = r.headers.get('content-type') ?? ''
        if (!r.ok || !ct.includes('application/json')) throw new Error('unavailable')
        return r.json() as Promise<{ items?: NewsItem[] }>
      })
      .then((data) => {
        if (cancelled) return
        const items = Array.isArray(data.items) ? data.items.filter((i) => i.title && i.link) : []
        setState(items.length ? { status: 'ready', items } : { status: 'empty' })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { state, refresh }
}
