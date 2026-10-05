import { useNavigate } from 'react-router-dom'
import { Check, Plus, ScrollText } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { Avatar, Badge, Sheet, cx } from '@/ui/primitives'
import { ActorLine, useResolveActor } from '@/components/identity'
import { VerificationBadge } from '@/components/VerificationBadge'
import type { ActiveAccount, ActorRef, Presence } from '@/types'

/** Fixed tints (not remapped in dark mode) — presence reads correctly in both themes. */
export const PRESENCE_DOT: Record<Presence, string> = {
  active: 'bg-emerald-500',
  busy: 'bg-amber-500',
  away: 'bg-slate-400',
  closed: 'bg-rose-500',
}

/** Avatar with a user-level presence dot in the corner. */
export function PresenceAvatar({
  name,
  color,
  size,
  square,
  presence,
  photo,
}: {
  name: string
  color?: string
  size: number
  square?: boolean
  presence: Presence
  photo?: string
}) {
  return (
    <div className="relative shrink-0">
      <Avatar name={name} color={color} size={size} square={square} photo={photo} />
      <span
        className={cx(
          'absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full ring-2 ring-white',
          PRESENCE_DOT[presence],
        )}
      />
    </div>
  )
}

/** Sheet to switch between the person's personal account and their hosted virtual identities. */
export function AccountSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const normalId = useStore((s) => s.normalId)
  const active = useStore((s) => s.active)
  const setActive = useStore((s) => s.setActive)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const currentNormal = useStore((s) => s.currentNormal)
  const activeTawkeelFor = useStore((s) => s.activeTawkeelFor)
  const authorityLevelOf = useStore((s) => s.authorityLevelOf)
  const resolve = useResolveActor()

  if (!normalId) return null
  const person = currentNormal()
  const myVirtuals = virtualsFor(normalId).filter((v) => v.status !== 'blocked')
  const tawkeelBadge = (ref: ActorRef) =>
    activeTawkeelFor(ref) ? (
      <Badge tone="violet"><ScrollText size={10} /> {t('actingUnderTawkeel')}</Badge>
    ) : undefined

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
            trailing={<div className="flex items-center gap-1">{tawkeelBadge({ kind: 'normal', normalId })}<VerificationBadge level={authorityLevelOf(normalId)} /></div>}
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
                trailing={tawkeelBadge({ kind: 'virtual', virtualId: v.id })}
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
  trailing,
}: {
  selected: boolean
  onClick: () => void
  actor: ActiveAccount
  trailing?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2 rounded-2xl border p-2.5 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        selected ? 'border-gate-300 bg-gate-50/60 ring-1 ring-gate-200' : 'border-slate-100 bg-white hover:bg-slate-50',
      )}
    >
      <ActorLine actor={actor} size={40} />
      {trailing}
      {selected && <Check size={18} className="ms-auto shrink-0 text-gate-600" />}
    </button>
  )
}
