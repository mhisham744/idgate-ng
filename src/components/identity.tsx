import type { ActiveAccount, ActorRef } from '@/types'
import { useStore } from '@/store'
import { personalAddress, virtualAddress } from '@/lib/identity'
import { Avatar } from '@/ui/primitives'

export interface Resolved {
  displayName: string
  address: string
  color: string
  isVirtual: boolean
  positionName?: string
  entityName?: string
}

/** Resolve any actor/account reference into display fields. */
export function useResolveActor() {
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const entities = useStore((s) => s.entities)

  return (ref: ActorRef | ActiveAccount | null | undefined): Resolved => {
    if (!ref) return { displayName: '—', address: '', color: '#94a3b8', isVirtual: false }
    if (ref.kind === 'normal') {
      const n = normals.find((x) => x.id === ref.normalId)
      if (!n) return { displayName: '—', address: '', color: '#94a3b8', isVirtual: false }
      return { displayName: n.fullName, address: personalAddress(n), color: n.avatarColor, isVirtual: false }
    }
    const v = virtuals.find((x) => x.id === ref.virtualId)
    if (!v) return { displayName: '—', address: '', color: '#94a3b8', isVirtual: true }
    const entity = entities.find((e) => e.id === v.entityId)
    const host = v.linkedNormalId ? normals.find((n) => n.id === v.linkedNormalId) : null
    const addr = entity ? virtualAddress(v, entity, host) : v.positionName
    return {
      displayName: host ? `${host.fullName} · ${v.positionName}` : v.positionName,
      address: addr,
      color: entity?.logoColor ?? '#4f46e5',
      isVirtual: true,
      positionName: v.positionName,
      entityName: entity?.commercialName,
    }
  }
}

/** Compact identity chip: avatar + name + address. */
export function ActorLine({
  actor,
  size = 40,
  showAddress = true,
  trailing,
}: {
  actor: ActorRef | ActiveAccount | null | undefined
  size?: number
  showAddress?: boolean
  trailing?: React.ReactNode
}) {
  const resolve = useResolveActor()
  const r = resolve(actor)
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Avatar name={r.displayName} color={r.color} size={size} square={r.isVirtual} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">{r.displayName}</div>
        {showAddress && r.address && (
          <div className="truncate font-mono text-[11px] text-gate-600" dir="ltr">
            {r.address}
          </div>
        )}
      </div>
      {trailing}
    </div>
  )
}
