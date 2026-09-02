import { BadgeCheck, ShieldCheck, CircleDashed } from 'lucide-react'
import { useLang } from '@/i18n'
import { cx } from '@/ui/primitives'
import type { VerificationInfo, VerificationLevel } from '@/types'

/** Effective assurance tier for a personal account (undefined verification → basic). */
export function levelOf(v: VerificationInfo | undefined): VerificationLevel {
  return v?.level ?? 'basic'
}

const META: Record<
  VerificationLevel,
  { en: string; ar: string; icon: typeof BadgeCheck; cls: string; dot: string }
> = {
  basic: {
    en: 'Basic',
    ar: 'أساسي',
    icon: CircleDashed,
    cls: 'bg-slate-100 text-slate-600',
    dot: 'text-slate-400',
  },
  verified: {
    en: 'Verified',
    ar: 'موثّق',
    icon: BadgeCheck,
    cls: 'bg-emerald-100 text-emerald-700',
    dot: 'text-emerald-600',
  },
  authority: {
    en: 'Authority',
    ar: 'موثّق رسميًا',
    icon: ShieldCheck,
    cls: 'bg-gate-100 text-gate-700',
    dot: 'text-gate-600',
  },
}

/**
 * Assurance-tier badge for a personal account.
 * `variant="icon"` renders just the check glyph (for tight spots like the sidebar);
 * `variant="pill"` renders the labelled pill.
 */
export function VerificationBadge({
  level,
  variant = 'pill',
  className,
}: {
  level: VerificationLevel
  variant?: 'pill' | 'icon'
  className?: string
}) {
  const { isRtl } = useLang()
  const m = META[level]
  const Icon = m.icon
  const label = isRtl ? m.ar : m.en

  if (variant === 'icon') {
    return <Icon size={14} className={cx('shrink-0', m.dot, className)} aria-label={label} />
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        m.cls,
        className,
      )}
    >
      <Icon size={12} />
      {label}
    </span>
  )
}
