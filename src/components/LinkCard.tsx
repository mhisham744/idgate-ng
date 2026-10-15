import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { PostLink } from '@/types'

/** Elegant link-preview card for a shared article (never a raw URL). */
export function LinkCard({ link }: { link: PostLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${link.title} — ${link.source}`}
      className="link-card group mt-0.5 flex items-stretch overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
    >
      <LinkThumb src={link.image} source={link.source} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 py-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gate-700">
          <span className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-[5px] bg-gate-500/10 text-[9px] leading-none">
            {link.source.trim().charAt(0).toUpperCase() || 'N'}
          </span>
          <span className="truncate">{link.source}</span>
          {link.domain && (
            <>
              <span className="text-slate-300" aria-hidden>·</span>
              <span className="truncate font-medium normal-case tracking-normal text-slate-500">{link.domain}</span>
            </>
          )}
        </div>
        <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-slate-800 text-start">{link.title}</p>
      </div>
      <span className="flex shrink-0 items-center pe-3 ps-1 text-slate-300 transition-colors group-hover:text-gate-600">
        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
      </span>
    </a>
  )
}

/** Centered publisher-logo tile for the link card, with a monogram fallback. */
export function LinkThumb({ src, source }: { src?: string; source: string }) {
  const [failed, setFailed] = useState(false)
  const ok = src && !failed
  return (
    <span className="relative grid w-20 shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-gate-500/10 to-teal-500/10 sm:w-24 dark:from-gate-500/15 dark:to-teal-500/10">
      {ok ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-9 w-9 object-contain drop-shadow-sm" />
      ) : (
        <span className="text-lg font-bold text-gate-700">{source.trim().charAt(0).toUpperCase() || 'N'}</span>
      )}
      <span className="absolute inset-y-0 end-0 w-px bg-slate-900/[0.06] dark:bg-white/10" aria-hidden />
    </span>
  )
}
