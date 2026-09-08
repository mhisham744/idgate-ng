import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import type { Notification } from '@/types'
import { formatDate } from '@/lib/identity'
import { bl, useLang } from '@/i18n'
import { NOTE_KIND_LABELS } from '@/data/reference'
import { Badge, cx } from '@/ui/primitives'
import { ActorLine } from '@/components/identity'

const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

const WEEKDAYS: Record<'en' | 'ar', string[]> = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
}

/** A compact month grid dotting the days that carry dated notifications. */
export function MiniCalendar({ items }: { items: Notification[] }) {
  const { t, lang, isRtl } = useLang()
  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate())

  // Map YYYY-MM-DD → notifications targeting that day.
  const byDay = useMemo(() => {
    const map = new Map<string, Notification[]>()
    for (const n of items) {
      if (!n.targetDate) continue
      const k = n.targetDate.slice(0, 10)
      const arr = map.get(k) ?? []
      arr.push(n)
      map.set(k, arr)
    }
    return map
  }, [items])

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selectedItems = selectedKey ? byDay.get(selectedKey) ?? [] : []

  const shift = (delta: number) => {
    setSelectedKey(null)
    setView((v) => {
      const m = v.month + delta
      const year = v.year + Math.floor(m / 12)
      const month = ((m % 12) + 12) % 12
      return { year, month }
    })
  }

  const monthLabel = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(view.year, view.month, 1))

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
          aria-label={isRtl ? 'الشهر السابق' : 'Previous month'}
        >
          {isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <div className="text-sm font-semibold text-slate-800">{monthLabel}</div>
        <button
          type="button"
          onClick={() => shift(1)}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
          aria-label={isRtl ? 'الشهر التالي' : 'Next month'}
        >
          {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS[lang].map((w) => (
          <div key={w} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />
          const k = dayKey(view.year, view.month, d)
          const has = byDay.has(k)
          const isToday = k === todayKey
          const isSelected = k === selectedKey
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSelectedKey(has || isSelected ? (isSelected ? null : k) : null)}
              disabled={!has}
              className={cx(
                'relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm transition',
                isSelected
                  ? 'bg-gate-600 font-semibold text-light'
                  : isToday
                    ? 'font-bold text-gate-700 ring-1 ring-gate-200'
                    : has
                      ? 'font-medium text-slate-700 hover:bg-slate-100'
                      : 'text-slate-400',
              )}
            >
              {d}
              {has && (
                <span
                  className={cx(
                    'absolute bottom-1 h-1 w-1 rounded-full',
                    isSelected ? 'bg-light' : 'bg-gate-500',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {selectedKey && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {selectedItems.length === 0 ? (
            <p className="text-xs text-slate-500">{t('noDayItems')}</p>
          ) : (
            selectedItems.map((n) => (
              <div key={n.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Badge tone="gate">{bl(NOTE_KIND_LABELS[n.kind], lang)}</Badge>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <CalendarDays size={12} />
                    {n.targetDate ? formatDate(n.targetDate, lang) : ''}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-800">{n.subject}</div>
                <div className="mt-1.5">
                  <ActorLine actor={n.from} size={24} showAddress={false} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
