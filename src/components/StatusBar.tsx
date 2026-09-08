import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Bell, ClipboardList, CalendarDays, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Presence } from '@/types'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { useMyInbox } from '@/lib/userScope'
import { MiniCalendar } from '@/components/MiniCalendar'
import { Card, Sheet, cx } from '@/ui/primitives'

/** Fixed tints (not remapped in dark mode) so presence reads correctly in both themes. */
const PRESENCE_DOT: Record<Presence, string> = {
  active: 'bg-emerald-500',
  busy: 'bg-amber-500',
  away: 'bg-slate-400',
  closed: 'bg-rose-500',
}

const PRESENCE_KEY: Record<Presence, string> = {
  active: 'presenceActive',
  busy: 'presenceBusy',
  away: 'presenceAway',
  closed: 'presenceClosed',
}

const PRESENCE_ORDER: Presence[] = ['active', 'busy', 'away', 'closed']

/**
 * USER-LEVEL activity bar at the top of Home — aggregates unread messages,
 * unread notifications, open pending tasks, a calendar of dated items, and the
 * signed-in person's presence, across their personal account AND every virtual
 * account they own. (Nav badges stay account-level; this is deliberately wider.)
 */
export function StatusBar() {
  const { t } = useLang()
  const navigate = useNavigate()
  const inbox = useMyInbox()
  const presence = useStore((s) => s.myPresence())
  const setPresence = useStore((s) => s.setPresence)

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  return (
    <>
      <Card className="flex items-stretch gap-0.5 p-1.5">
        <Cell
          icon={<Mail size={20} />}
          label={t('messages')}
          count={inbox.unreadMessages}
          onClick={() => navigate('/messages')}
        />
        <Cell
          icon={<Bell size={20} />}
          label={t('notification')}
          count={inbox.unreadNotifications}
          onClick={() => navigate('/notifications')}
        />
        <Cell
          icon={<ClipboardList size={20} />}
          label={t('pending')}
          count={inbox.pendingActionables}
          onClick={() => navigate('/notifications')}
        />
        <Cell
          icon={<CalendarDays size={20} />}
          label={t('calendar')}
          onClick={() => setCalendarOpen(true)}
        />
        <Cell
          icon={
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className={cx('h-3.5 w-3.5 rounded-full', PRESENCE_DOT[presence])} />
            </span>
          }
          label={t('status')}
          onClick={() => setStatusOpen(true)}
        />
      </Card>

      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title={t('calendar')}>
        <MiniCalendar items={inbox.datedItems} />
      </Sheet>

      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title={t('status')}>
        <div className="space-y-1.5 py-1">
          {PRESENCE_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPresence(p)
                setStatusOpen(false)
              }}
              className={cx(
                'flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition',
                presence === p
                  ? 'border-gate-300 bg-gate-50/60 ring-1 ring-gate-200'
                  : 'border-slate-100 bg-white hover:bg-slate-50',
              )}
            >
              <span className={cx('h-3 w-3 shrink-0 rounded-full', PRESENCE_DOT[p])} />
              <span className="flex-1 text-sm font-medium text-slate-800">{t(PRESENCE_KEY[p])}</span>
              {presence === p && <Check size={18} className="shrink-0 text-gate-600" />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

function Cell({
  icon,
  label,
  count,
  onClick,
}: {
  icon: ReactNode
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
    >
      <span className="relative text-gate-600">
        {icon}
        {count != null && count > 0 && (
          <span className="absolute -top-2 -end-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-light">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      <span className="truncate text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}
