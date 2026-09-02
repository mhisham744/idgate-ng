import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, MessageSquare, Bell, Wrench, Settings, ChevronDown, Check, Plus, Globe } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, useI18n } from '@/i18n'
import { Avatar, Badge, Sheet, cx } from '@/ui/primitives'
import { ActorLine, useResolveActor } from '@/components/identity'
import type { ActiveAccount } from '@/types'

const TABS = [
  { to: '/home', key: 'home', icon: Home },
  { to: '/messages', key: 'messages', icon: MessageSquare },
  { to: '/notifications', key: 'notification', icon: Bell },
  { to: '/tools', key: 'tools', icon: Wrench },
  { to: '/settings', key: 'settings', icon: Settings },
] as const

const keyOf = (a: ActiveAccount | null) =>
  a ? (a.kind === 'normal' ? `n:${a.normalId}` : `v:${a.virtualId}`) : ''

/** Language toggle — used in the desktop sidebar and the mobile top bar. */
function LangToggle({ className }: { className?: string }) {
  const lang = useI18n((s) => s.lang)
  const toggle = useI18n((s) => s.toggle)
  return (
    <button
      onClick={toggle}
      className={cx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition', className)}
      aria-label="Toggle language"
    >
      <Globe size={14} />
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, dir } = useLang()
  const location = useLocation()
  const active = useStore((s) => s.active)
  const resolve = useResolveActor()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // unread badges
  const messages = useStore((s) => s.messages)
  const notifications = useStore((s) => s.notifications)
  const activeKey = keyOf(active)
  const unreadMsgs = messages.filter(
    (m) => !m.readBy.includes(activeKey) && m.to.some((a) => keyOf(a) === activeKey),
  ).length
  const pendingNotes = notifications.filter(
    (n) => n.status === 'pending' && n.to.some((a) => keyOf(a) === activeKey),
  ).length
  const badgeFor = (key: string) => (key === 'messages' ? unreadMsgs : key === 'notification' ? pendingNotes : 0)

  const r = resolve(active)

  return (
    <div className="flex h-dvh w-full bg-slate-100 text-slate-900" dir={dir}>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden w-72 shrink-0 flex-col border-e border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="gate.svg" alt="" className="h-8 w-8" />
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-gate-800">{t('appName')}</div>
            <div className="text-[11px] text-slate-400">{dir === 'rtl' ? 'بوابة الهوية · مصر' : 'Identity Gate · Egypt'}</div>
          </div>
        </div>

        <div className="px-3">
          <button
            onClick={() => setSwitcherOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-start transition hover:bg-slate-100"
          >
            <Avatar name={r.displayName} color={r.color} size={36} square={r.isVirtual} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-800">{r.displayName}</div>
              <div className="truncate font-mono text-[10px] text-slate-500"><bdi>{r.address}</bdi></div>
            </div>
            <ChevronDown size={18} className="text-slate-400" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {TABS.map((tab) => {
            const isActive = location.pathname.startsWith(tab.to)
            const badge = badgeFor(tab.key)
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.key}
                to={tab.to}
                className={cx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-gate-50 text-gate-700' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span>{t(tab.key)}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-[11px] text-slate-400">{dir === 'rtl' ? 'نموذج تجريبي' : 'Interactive demo'}</span>
          <LangToggle className="bg-slate-100 text-slate-600 hover:bg-slate-200" />
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="relative z-30 shrink-0 bg-gradient-to-b from-gate-700 to-gate-600 px-4 pt-9 pb-3 text-white lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSwitcherOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur transition hover:bg-white/15"
            >
              <Avatar name={r.displayName} color={r.color} size={36} square={r.isVirtual} />
              <div className="min-w-0 flex-1 text-start">
                <div className="truncate text-sm font-semibold">{r.displayName}</div>
                <div className="truncate font-mono text-[10px] text-white/70">
                  <bdi>{r.address}</bdi>
                </div>
              </div>
              <ChevronDown size={18} className="text-white/70" />
            </button>
            <LangToggle className="shrink-0 bg-white/10 text-white hover:bg-white/20" />
          </div>
        </header>

        {/* Scrollable content — capped to a comfortable reading column, centered */}
        <main className="relative flex-1 overflow-y-auto thin-scroll">
          <div className="mx-auto w-full max-w-2xl">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="shrink-0 border-t border-slate-200 bg-white/95 px-1 pb-5 pt-1.5 backdrop-blur lg:hidden">
          <div className="flex items-stretch justify-around">
            {TABS.map((tab) => {
              const isActive = location.pathname.startsWith(tab.to)
              const badge = badgeFor(tab.key)
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.key}
                  to={tab.to}
                  className={cx(
                    'relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-colors',
                    isActive ? 'text-gate-600' : 'text-slate-400',
                  )}
                >
                  <div className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{t(tab.key)}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>

      <AccountSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  )
}

function AccountSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const normalId = useStore((s) => s.normalId)
  const active = useStore((s) => s.active)
  const setActive = useStore((s) => s.setActive)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const currentNormal = useStore((s) => s.currentNormal)
  const resolve = useResolveActor()

  if (!normalId) return null
  const person = currentNormal()
  const myVirtuals = virtualsFor(normalId).filter((v) => v.status !== 'blocked')

  const pick = (acc: ActiveAccount) => {
    setActive(acc)
    onClose()
  }
  const activeKey = active ? (active.kind === 'normal' ? `n:${active.normalId}` : `v:${active.virtualId}`) : ''

  return (
    <Sheet open={open} onClose={onClose} title={t('switchAccount')}>
      <div className="space-y-4 pb-2">
        <div>
          <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">{t('personalAccount')}</p>
          <AccountOption
            selected={activeKey === `n:${normalId}`}
            onClick={() => pick({ kind: 'normal', normalId })}
            actor={{ kind: 'normal', normalId }}
          />
        </div>

        <div>
          <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('virtualAccounts')} · {myVirtuals.length}
          </p>
          <div className="space-y-1.5">
            {myVirtuals.map((v) => (
              <AccountOption
                key={v.id}
                selected={activeKey === `v:${v.id}`}
                onClick={() => pick({ kind: 'virtual', virtualId: v.id })}
                actor={{ kind: 'virtual', virtualId: v.id }}
              />
            ))}
            {myVirtuals.length === 0 && (
              <p className="px-1 py-3 text-xs text-slate-400">
                {resolve({ kind: 'normal', normalId }).displayName} — no active virtual identities yet.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            onClose()
            navigate('/settings/entities')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          <Plus size={16} /> {t('registerEntity')}
        </button>
        <p className="px-1 text-[11px] leading-relaxed text-slate-400">{person?.fullName}</p>
      </div>
    </Sheet>
  )
}

function AccountOption({
  selected,
  onClick,
  actor,
}: {
  selected: boolean
  onClick: () => void
  actor: ActiveAccount
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2 rounded-2xl border p-2.5 text-start transition',
        selected ? 'border-gate-300 bg-gate-50/60 ring-1 ring-gate-200' : 'border-slate-100 bg-white hover:bg-slate-50',
      )}
    >
      <ActorLine actor={actor} size={40} />
      {selected && <Check size={18} className="ms-auto shrink-0 text-gate-600" />}
    </button>
  )
}

export { Badge }
