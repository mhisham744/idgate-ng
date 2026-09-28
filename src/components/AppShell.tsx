import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, MessageSquare, Bell, Wrench, Settings, ChevronDown, Globe, Sun, Moon } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, useI18n } from '@/i18n'
import { useTheme } from '@/theme'
import { Badge, cx } from '@/ui/primitives'
import { useResolveActor } from '@/components/identity'
import { AccountSwitcher, PresenceAvatar } from '@/components/AccountSwitcher'
import { StatusBar } from '@/components/StatusBar'
import { actorKey } from '@/lib/identity'
import { VerificationBadge, levelOf } from '@/components/VerificationBadge'
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
      className={cx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2', className)}
      aria-label="Toggle language"
    >
      <Globe size={14} />
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  )
}

/** Light/dark appearance toggle — paired with LangToggle. */
function ThemeToggle({ className }: { className?: string }) {
  const { isRtl } = useLang()
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      className={cx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2', className)}
      aria-label={isRtl ? 'تبديل المظهر' : 'Toggle appearance'}
      aria-pressed={dark}
      title={dark ? (isRtl ? 'الوضع الفاتح' : 'Light mode') : (isRtl ? 'الوضع الداكن' : 'Dark mode')}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, dir } = useLang()
  const location = useLocation()
  const active = useStore((s) => s.active)
  const me = useStore((s) => s.currentNormal())
  const presence = useStore((s) => s.myPresence())
  const resolve = useResolveActor()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // unread badges
  const messages = useStore((s) => s.messages)
  const notifications = useStore((s) => s.notifications)
  const activeKey = keyOf(active)
  const unreadMsgs = messages.filter(
    (m) =>
      keyOf(m.from) !== activeKey &&
      !m.readBy.includes(activeKey) &&
      !(m.deletedBy ?? []).includes(activeKey) &&
      (m.to.some((a) => keyOf(a) === activeKey) ||
        (m.cc ?? []).some((a) => keyOf(a) === activeKey) ||
        (m.bcc ?? []).some((a) => keyOf(a) === activeKey)),
  ).length
  const pendingNotes = notifications.filter(
    (n) =>
      n.needsResponse &&
      !n.frozen &&
      (n.recipients ?? []).some((rc) => actorKey(rc.ref) === activeKey && rc.status === 'pending'),
  ).length
  const badgeFor = (key: string) => (key === 'messages' ? unreadMsgs : key === 'notification' ? pendingNotes : 0)

  const r = resolve(active)

  // Data-dense org-management screens use the full width; everything else stays
  // in the comfortable phone-style reading column.
  const wide = location.pathname.startsWith('/settings/entity/')

  return (
    <div className="flex h-dvh w-full bg-slate-100 text-slate-900" dir={dir}>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden w-72 shrink-0 flex-col border-e border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <img src="gate.svg" alt="" className="h-8 w-8" />
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-gate-800">{t('appName')}</div>
            <div className="text-[11px] text-slate-400">{dir === 'rtl' ? 'بوابة الهوية · مصر' : 'Identity Gate · Egypt'}</div>
          </div>
        </div>

        <div className="px-3">
          <button
            onClick={() => setSwitcherOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-start transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <PresenceAvatar name={r.displayName} color={r.color} size={36} square={r.isVirtual} presence={presence} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="truncate text-sm font-semibold text-slate-800">{r.displayName}</div>
                {active?.kind === 'normal' && <VerificationBadge level={levelOf(me?.verification)} variant="icon" />}
              </div>
              <div className="truncate font-address text-[11px] text-gate-700"><bdi>{r.address}</bdi></div>
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
                  'flex items-center gap-3 rounded-2xl border-s-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  isActive ? 'border-s-2 border-gate-600 bg-gate-50 text-gate-700 font-semibold' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-light">
                      {badge}
                    </span>
                  )}
                </div>
                <span>{t(tab.key)}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-[11px] text-slate-400">{dir === 'rtl' ? 'نموذج تجريبي' : 'Interactive demo'}</span>
          <div className="flex items-center gap-1.5">
            <ThemeToggle className="bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white" />
            <LangToggle className="bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white" />
          </div>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Scrollable content — full-screen on mobile (no top shellbar); phone-style
            reading column by default, wide for data-dense org-management screens. */}
        <main className="relative flex-1 overflow-y-auto thin-scroll">
          <div className={cx('mx-auto w-full lg:py-4', wide ? 'max-w-[110rem]' : 'max-w-2xl')}>
            <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:px-0 lg:pt-0">
              <StatusBar />
            </div>
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="shrink-0 border-t border-slate-200 bg-white/95 px-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden">
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
                    'relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                    isActive ? 'bg-gate-50 text-gate-600' : 'text-slate-400',
                  )}
                >
                  <div className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-light">
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

export { Badge }
